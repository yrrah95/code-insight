from collections import defaultdict
from typing import AsyncIterator

ENCODINGS = ["utf-8", "utf-8-sig", "cp950", "latin-1"]


def _read_file(filepath: str) -> str:
    for enc in ENCODINGS:
        try:
            with open(filepath, "r", encoding=enc) as f:
                return f.read()
        except (UnicodeDecodeError, OSError):
            continue
    return ""


async def analyze_files(
    files: list[dict], provider, root: str
) -> AsyncIterator[dict]:
    for i, file in enumerate(files):
        content = _read_file(file["absolute_path"])
        if not content.strip():
            description = "_無法讀取或檔案為空_"
        else:
            chunks: list[str] = []
            async for chunk in provider.analyze_file(file["path"], content):
                chunks.append(chunk)
            description = "".join(chunks)

        yield {
            "index": i,
            "total": len(files),
            "path": file["path"],
            "category": file["category"],
            "description": description,
        }


def get_context_summary(files: list[dict]) -> str:
    lines: list[str] = []
    current_category = None
    for f in files:
        if not f.get("description"):
            continue
        if f["category"] != current_category:
            current_category = f["category"]
            lines.append(f"\n## {current_category}")
        lines.append(f"\n### {f['path']}\n{f['description']}")
    return "\n".join(lines)


def build_markdown_report(files: list[dict], project_path: str) -> str:
    lines = [f"# 專案分析報告\n", f"**專案路徑**：`{project_path}`\n"]
    by_category: dict[str, list] = defaultdict(list)
    for f in files:
        if f.get("description"):
            by_category[f["category"]].append(f)
    for category, cat_files in sorted(by_category.items()):
        lines.append(f"\n## {category}\n")
        for f in cat_files:
            lines.append(f"### `{f['path']}`\n\n{f['description']}\n")
    return "\n".join(lines)
