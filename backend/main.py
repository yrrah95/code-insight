import asyncio
import datetime
import io
import json
import os
import shutil
import subprocess
import tempfile
import zipfile
from pathlib import Path

try:
    import tkinter as tk
    from tkinter import filedialog
    _TKINTER_AVAILABLE = True
except ImportError:
    _TKINTER_AVAILABLE = False

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from analyzer import analyze_files, build_markdown_report, get_context_summary
from cache import is_stale, load_cache, save_cache
from chat import ChatEngine
from llm.claude import ClaudeProvider
from llm.deepseek import DeepSeekProvider
from llm.ollama import OllamaProvider
from llm.openai_provider import OpenAIProvider
from interview import InterviewEngine
from scanner import scan_directory

app = FastAPI(title="CodeInsight API")
_allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

SETTINGS_FILE = Path(__file__).parent / "settings.json"
HISTORY_FILE = Path(__file__).parent / "history.json"

chat_engine = ChatEngine()
interview_engine = InterviewEngine()
_scanned_files: list[dict] = []
_project_path: str = ""
_cloned_temp_dir: str | None = None  # tracks temp dir from GitHub clone

# --- 設定管理 ---

def _load_settings() -> dict:
    if SETTINGS_FILE.exists():
        return json.loads(SETTINGS_FILE.read_text(encoding="utf-8"))
    return {
        "provider": "claude",
        "api_key": "",
        "model": "",
        "ollama_url": "http://localhost:11434",
    }


def _save_settings(data: dict):
    SETTINGS_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def _get_provider():
    s = _load_settings()
    provider = s.get("provider", "claude")
    api_key = s.get("api_key", "")
    model = s.get("model", "")
    if provider == "claude":
        return ClaudeProvider(api_key=api_key, model=model or "claude-sonnet-4-6")
    if provider == "openai":
        return OpenAIProvider(api_key=api_key, model=model or "gpt-4o")
    if provider == "deepseek":
        return DeepSeekProvider(api_key=api_key, model=model or "deepseek-chat")
    if provider == "ollama":
        return OllamaProvider(
            base_url=s.get("ollama_url", "http://localhost:11434"),
            model=model or "llama3.2",
        )
    raise HTTPException(status_code=400, detail=f"未知的 provider: {provider}")

# --- 歷史紀錄 ---

def _load_history() -> list[str]:
    if HISTORY_FILE.exists():
        try:
            return json.loads(HISTORY_FILE.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            return []
    return []


def _save_history(paths: list[str]):
    HISTORY_FILE.write_text(json.dumps(paths, ensure_ascii=False), encoding="utf-8")


def _add_to_history(path: str):
    history = _load_history()
    if path in history:
        history.remove(path)
    history.insert(0, path)
    _save_history(history[:10])

# --- Request models ---

class ScanRequest(BaseModel):
    path: str

class CloneRequest(BaseModel):
    url: str

class HistoryAddRequest(BaseModel):
    path: str

class ChatRequest(BaseModel):
    message: str

class AnswerRequest(BaseModel):
    choice: int

class ExplainRequest(BaseModel):
    title: str
    content: str

class SettingsModel(BaseModel):
    provider: str
    api_key: str
    model: str = ""
    ollama_url: str = "http://localhost:11434"

# --- Endpoints ---

@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/api/browse")
async def browse():
    if not _TKINTER_AVAILABLE:
        return {"path": ""}
    loop = asyncio.get_event_loop()

    def _pick():
        root = tk.Tk()
        root.withdraw()
        root.wm_attributes("-topmost", True)
        path = filedialog.askdirectory(title="選擇專案資料夾")
        root.destroy()
        return path or ""

    path = await loop.run_in_executor(None, _pick)
    return {"path": path}


@app.post("/api/scan")
def scan(req: ScanRequest):
    global _scanned_files, _project_path, _cloned_temp_dir
    if not os.path.isdir(req.path):
        raise HTTPException(status_code=400, detail="路徑不存在或不是目錄")

    # 清除上一次 clone 的暫存目錄
    if _cloned_temp_dir and os.path.exists(_cloned_temp_dir):
        shutil.rmtree(_cloned_temp_dir, ignore_errors=True)
        _cloned_temp_dir = None

    _project_path = req.path
    _scanned_files = scan_directory(req.path)
    chat_engine.context = ""

    cached = load_cache(req.path)
    cached_count = 0
    for f in _scanned_files:
        entry = cached.get(f["path"])
        if entry and not is_stale(entry, f["mtime"], f["size"]):
            f["description"] = entry["description"]
            f["from_cache"] = True
            cached_count += 1
        else:
            f["from_cache"] = False

    _add_to_history(req.path)
    return {"files": _scanned_files, "total": len(_scanned_files), "cached_count": cached_count}


@app.post("/api/clone")
async def clone_repo(req: CloneRequest):
    global _scanned_files, _project_path, _cloned_temp_dir

    # 清除上一次 clone 的暫存目錄
    if _cloned_temp_dir and os.path.exists(_cloned_temp_dir):
        shutil.rmtree(_cloned_temp_dir, ignore_errors=True)
        _cloned_temp_dir = None

    temp_dir = tempfile.mkdtemp(prefix="codeinsight_")
    try:
        result = subprocess.run(
            ["git", "clone", "--depth=1", req.url, temp_dir],
            capture_output=True, text=True, timeout=120,
        )
        if result.returncode != 0:
            shutil.rmtree(temp_dir, ignore_errors=True)
            raise HTTPException(status_code=400, detail=f"Clone 失敗：{result.stderr.strip()}")

        _cloned_temp_dir = temp_dir
        _project_path = temp_dir
        _scanned_files = scan_directory(temp_dir)
        chat_engine.context = ""

        cached = load_cache(temp_dir)
        cached_count = 0
        for f in _scanned_files:
            entry = cached.get(f["path"])
            if entry and not is_stale(entry, f["mtime"], f["size"]):
                f["description"] = entry["description"]
                f["from_cache"] = True
                cached_count += 1
            else:
                f["from_cache"] = False

        return {"files": _scanned_files, "total": len(_scanned_files), "cached_count": cached_count}
    except subprocess.TimeoutExpired:
        shutil.rmtree(temp_dir, ignore_errors=True)
        raise HTTPException(status_code=408, detail="Clone 超時（超過 120 秒）")
    except HTTPException:
        raise
    except Exception as e:
        shutil.rmtree(temp_dir, ignore_errors=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/analyze")
async def analyze():
    if not _scanned_files:
        raise HTTPException(status_code=400, detail="請先執行掃描")
    provider = _get_provider()

    to_analyze = [f for f in _scanned_files if not f.get("description")]

    if not to_analyze:
        async def stream_skip():
            yield 'data: {"done": true, "skipped": true}\n\n'
        return StreamingResponse(stream_skip(), media_type="text/event-stream")

    async def stream():
        async for result in analyze_files(to_analyze, provider, _project_path):
            for f in _scanned_files:
                if f["path"] == result["path"]:
                    f["description"] = result["description"]
                    f["from_cache"] = False
                    break
            yield f"data: {json.dumps(result, ensure_ascii=False)}\n\n"
        save_cache(_project_path, _scanned_files)
        yield 'data: {"done": true}\n\n'

    return StreamingResponse(stream(), media_type="text/event-stream")



@app.post("/api/chat")
async def chat(req: ChatRequest):
    if not _scanned_files:
        raise HTTPException(status_code=400, detail="請先執行分析")
    provider = _get_provider()
    context = get_context_summary(_scanned_files)
    if context != chat_engine.context:
        chat_engine.set_context(context)

    async def stream():
        async for chunk in chat_engine.send(req.message, provider):
            yield f"data: {json.dumps({'chunk': chunk}, ensure_ascii=False)}\n\n"
        yield 'data: {"done": true}\n\n'

    return StreamingResponse(stream(), media_type="text/event-stream")


@app.post("/api/chat/clear")
def chat_clear():
    chat_engine.clear()
    return {"status": "cleared"}


@app.get("/api/settings")
def get_settings():
    return _load_settings()


@app.put("/api/settings")
def update_settings(settings: SettingsModel):
    _save_settings(settings.model_dump())
    return {"status": "saved"}


@app.post("/api/explain")
async def explain(req: ExplainRequest):
    provider = _get_provider()
    prompt = (
        "以下是一段技術說明，請用國中生能理解的語言，加入具體的生活比喻重新解釋。\n\n"
        f"標題：{req.title}\n"
        f"內容：{req.content}\n\n"
        "用 3~5 句話說明，要有具體的生活比喻，讓完全不懂技術的人也能懂。直接開始說明，不要加前言。"
    )

    async def stream():
        async for chunk in provider.generate(prompt):
            yield f"data: {json.dumps({'chunk': chunk}, ensure_ascii=False)}\n\n"
        yield 'data: {"done": true}\n\n'

    return StreamingResponse(stream(), media_type="text/event-stream")


@app.post("/api/interview/start")
async def interview_start():
    if not _scanned_files:
        raise HTTPException(status_code=400, detail="請先執行分析")
    context = get_context_summary(_scanned_files)
    if not context.strip():
        raise HTTPException(status_code=400, detail="請先完成分析")
    provider = _get_provider()
    interview_engine.set_context(context)
    question = await interview_engine.next_question(provider)
    correct_count, total = interview_engine.score
    return {**question, "score": {"correct": correct_count, "total": total}, "progress": interview_engine.progress_pct}


@app.post("/api/interview/next")
async def interview_next():
    if not interview_engine.context:
        raise HTTPException(status_code=400, detail="請先開始面試")
    provider = _get_provider()
    question = await interview_engine.next_question(provider)
    correct_count, total = interview_engine.score
    return {**question, "score": {"correct": correct_count, "total": total}, "progress": interview_engine.progress_pct}


@app.post("/api/interview/answer")
async def interview_answer(req: AnswerRequest):
    if not interview_engine.questions:
        raise HTTPException(status_code=400, detail="尚未取得題目")
    last_q = interview_engine.questions[-1]
    is_correct = last_q["correct"] == req.choice
    provider = _get_provider()

    async def stream():
        async for chunk in interview_engine.answer(req.choice, provider):
            yield f"data: {json.dumps({'chunk': chunk}, ensure_ascii=False)}\n\n"
        correct_count, total = interview_engine.score
        done_payload = {
            "done": True,
            "is_correct": is_correct,
            "can_finish": interview_engine.can_finish,
            "auto_finish": interview_engine.auto_finish,
            "score": {"correct": correct_count, "total": total},
            "progress": interview_engine.progress_pct,
        }
        yield f"data: {json.dumps(done_payload, ensure_ascii=False)}\n\n"

    return StreamingResponse(stream(), media_type="text/event-stream")


@app.post("/api/interview/report")
async def interview_report():
    if interview_engine.answered_count == 0:
        raise HTTPException(status_code=400, detail="尚未作答任何題目")
    provider = _get_provider()

    async def stream():
        async for chunk in interview_engine.generate_report(provider):
            yield f"data: {json.dumps({'chunk': chunk}, ensure_ascii=False)}\n\n"
        yield 'data: {"done": true}\n\n'

    return StreamingResponse(stream(), media_type="text/event-stream")


@app.post("/api/interview/clear")
def interview_clear():
    interview_engine.clear()
    return {"status": "cleared"}


# --- 快取清除 ---

@app.delete("/api/cache")
def clear_cache_endpoint():
    global _scanned_files
    if not _project_path:
        raise HTTPException(status_code=400, detail="尚未掃描任何專案")
    cache_file = Path(_project_path) / ".codeinsight.json"
    if cache_file.exists():
        cache_file.unlink()
    for f in _scanned_files:
        f["description"] = None
        f.pop("from_cache", None)
    return {"status": "cleared"}


# --- 歷史紀錄 ---

@app.get("/api/history")
def get_history():
    return {"paths": _load_history()}


@app.post("/api/history")
def add_history_endpoint(req: HistoryAddRequest):
    _add_to_history(req.path)
    return {"status": "ok"}


@app.delete("/api/history")
def clear_history_endpoint():
    _save_history([])
    return {"status": "cleared"}


# --- ZIP 匯出 ---

@app.get("/api/export/zip")
def export_zip():
    if not _scanned_files:
        raise HTTPException(status_code=400, detail="請先執行分析")
    analyzed = [f for f in _scanned_files if f.get("description")]
    if not analyzed:
        raise HTTPException(status_code=400, detail="請先完成分析")

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for f in analyzed:
            safe_name = f["path"].replace("/", "_").replace("\\", "_")
            zf.writestr(f"files/{safe_name}.md", f"# {f['path']}\n\n{f['description']}")

        now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
        project_name = Path(_project_path).name
        index = (
            f"# {project_name} — CodeInsight 檔案說明\n\n"
            f"分析時間：{now}  \n"
            f"分析檔案數：{len(analyzed)}  \n\n"
            f"## 包含內容\n\nfiles/ — {len(analyzed)} 個檔案的詳細說明\n"
        )
        zf.writestr("README.md", index)

    buf.seek(0)
    project_name = Path(_project_path).name
    filename = f"{project_name}-codeinsight.zip"
    return StreamingResponse(
        buf,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# --- CODEBASE.md 一鍵生成 ---

@app.get("/api/export/codebase-md")
def export_codebase_md():
    if not _scanned_files:
        raise HTTPException(status_code=400, detail="請先執行分析")
    analyzed = [f for f in _scanned_files if f.get("description")]
    if not analyzed:
        raise HTTPException(status_code=400, detail="請先完成分析")

    project_name = Path(_project_path).name
    now = datetime.datetime.now().strftime("%Y-%m-%d")

    # 語言統計
    lang_counter: dict[str, int] = {}
    for f in analyzed:
        lang = f.get("language", "Unknown")
        lang_counter[lang] = lang_counter.get(lang, 0) + 1
    top_langs = ", ".join(
        f"{lang} ({cnt})"
        for lang, cnt in sorted(lang_counter.items(), key=lambda x: -x[1])[:5]
    )

    # 按 category 分組
    by_category: dict[str, list[dict]] = {}
    for f in analyzed:
        cat = f.get("category", "Other")
        by_category.setdefault(cat, []).append(f)

    lines: list[str] = [
        f"# {project_name} — CODEBASE",
        "",
        f"> 由 [CodeInsight](https://github.com/yrrah95/code-insight) 自動生成 · {now}",
        "",
        "## 概覽",
        "",
        "| 項目 | 值 |",
        "|------|-----|",
        f"| 掃描檔案數 | {len(_scanned_files)} |",
        f"| 已分析 | {len(analyzed)} |",
        f"| 主要語言 | {top_langs} |",
        "",
        "## 檔案清單",
        "",
    ]

    for cat in sorted(by_category.keys()):
        lines += [f"### {cat}", "", "| 檔案 | 說明 |", "|------|------|"]
        for f in sorted(by_category[cat], key=lambda x: x["path"]):
            desc = (f.get("description") or "").replace("\n", " ").replace("|", "｜")
            if len(desc) > 150:
                desc = desc[:150] + "..."
            lines.append(f"| `{f['path']}` | {desc} |")
        lines.append("")

    lines += [
        "---",
        "",
        "> Generated by [CodeInsight](https://github.com/yrrah95/code-insight) — *Understand any codebase in 5 minutes with AI*",
    ]

    content = "\n".join(lines)

    # 若為本機掃描（非 GitHub clone 暫存目錄），自動存入專案
    saved_to_project = False
    if not _cloned_temp_dir and _project_path:
        (Path(_project_path) / "CODEBASE.md").write_text(content, encoding="utf-8")
        saved_to_project = True

    return {"content": content, "saved_to_project": saved_to_project}
