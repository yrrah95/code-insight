import fnmatch
import os
from pathlib import Path

SKIP_DIRS = {
    "node_modules", ".git", "__pycache__", ".venv", "venv",
    "bin", "obj", "dist", "build", ".next", ".nuxt",
    "packages", ".vs", ".idea", "migrations", ".cache",
}

CODE_EXTENSIONS = {
    ".py", ".js", ".ts", ".tsx", ".jsx", ".cs", ".java",
    ".go", ".rs", ".rb", ".php", ".vue", ".svelte",
    ".html", ".css", ".scss", ".sql", ".sh", ".yaml", ".yml",
    ".json", ".toml", ".xml",
}

CATEGORY_MAP = {
    "controller": "Controllers", "controllers": "Controllers",
    "view": "Views", "views": "Views",
    "service": "Services", "services": "Services",
    "model": "Models", "models": "Models",
    "repository": "Repositories", "repositories": "Repositories",
    "middleware": "Middleware",
    "util": "Utilities", "utils": "Utilities",
    "helper": "Utilities", "helpers": "Utilities",
    "component": "Components", "components": "Components",
    "page": "Pages", "pages": "Pages",
    "api": "API",
    "route": "Routes", "routes": "Routes",
    "config": "Configuration",
    "hook": "Hooks", "hooks": "Hooks",
    "store": "Store",
    "test": "Tests", "tests": "Tests", "__tests__": "Tests",
}


def _classify(filepath: str, root: str) -> str:
    rel = os.path.relpath(filepath, root)
    for part in Path(rel).parts[:-1]:
        key = part.lower()
        if key in CATEGORY_MAP:
            return CATEGORY_MAP[key]
    return "Other"


def _load_gitignore_patterns(directory: str) -> list[str]:
    path = os.path.join(directory, ".gitignore")
    if not os.path.isfile(path):
        return []
    patterns = []
    with open(path, encoding="utf-8", errors="ignore") as f:
        for line in f:
            line = line.strip()
            # Skip comments, negations, and empty lines
            if not line or line.startswith("#") or line.startswith("!"):
                continue
            patterns.append(line.rstrip("/"))
    return patterns


def _is_gitignored(name: str, rel_posix: str, patterns: list[str]) -> bool:
    if not patterns:
        return False
    for pattern in patterns:
        if fnmatch.fnmatch(name, pattern):
            return True
        if fnmatch.fnmatch(rel_posix, pattern):
            return True
        # Support patterns without path separator matching any depth
        if "/" not in pattern and fnmatch.fnmatch(rel_posix, f"**/{pattern}"):
            return True
    return False


def scan_directory(directory: str) -> list[dict]:
    results = []
    gitignore = _load_gitignore_patterns(directory)

    for dirpath, dirnames, filenames in os.walk(directory):
        rel_dir = os.path.relpath(dirpath, directory)
        dirnames[:] = [
            d for d in dirnames
            if d not in SKIP_DIRS
            and not d.startswith(".")
            and not _is_gitignored(
                d,
                os.path.join(rel_dir, d).replace("\\", "/"),
                gitignore,
            )
        ]
        for filename in filenames:
            ext = Path(filename).suffix.lower()
            if ext not in CODE_EXTENSIONS:
                continue
            filepath = os.path.join(dirpath, filename)
            rel_path = os.path.relpath(filepath, directory).replace("\\", "/")
            if _is_gitignored(filename, rel_path, gitignore):
                continue
            try:
                size = os.path.getsize(filepath)
                if size > 500_000:
                    continue
                results.append({
                    "path": rel_path,
                    "absolute_path": filepath,
                    "category": _classify(filepath, directory),
                    "extension": ext,
                    "size": size,
                    "mtime": os.path.getmtime(filepath),
                    "description": None,
                })
            except (OSError, PermissionError):
                continue
    return sorted(results, key=lambda x: (x["category"], x["path"]))
