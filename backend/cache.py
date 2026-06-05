import json
from pathlib import Path


def _cache_path(project_path: str) -> Path:
    return Path(project_path) / ".codeinsight.json"


def load_cache(project_path: str) -> dict:
    path = _cache_path(project_path)
    if not path.exists():
        return {}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        return data.get("files", {})
    except (json.JSONDecodeError, OSError):
        return {}


def save_cache(project_path: str, files: list[dict]):
    entries = {}
    for f in files:
        if f.get("description"):
            entries[f["path"]] = {
                "mtime": f.get("mtime", 0),
                "size": f.get("size", 0),
                "description": f["description"],
            }
    _cache_path(project_path).write_text(
        json.dumps({"project_path": project_path, "files": entries}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def is_stale(cached: dict, mtime: float, size: int) -> bool:
    return cached.get("mtime") != mtime or cached.get("size") != size


def load_reports(project_path: str) -> dict:
    """回傳 {'context_hash': '...', 'data': ['report0', 'report1']} 或 {}"""
    path = _cache_path(project_path)
    if not path.exists():
        return {}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        return data.get("reports", {})
    except (json.JSONDecodeError, OSError):
        return {}


def save_reports(project_path: str, context_hash: str, reports: list[str]):
    path = _cache_path(project_path)
    try:
        data = json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}
    except (json.JSONDecodeError, OSError):
        data = {}
    data["reports"] = {"context_hash": context_hash, "data": reports}
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
