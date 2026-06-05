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


def scan_directory(directory: str) -> list[dict]:
    results = []
    for dirpath, dirnames, filenames in os.walk(directory):
        dirnames[:] = [
            d for d in dirnames
            if d not in SKIP_DIRS and not d.startswith(".")
        ]
        for filename in filenames:
            ext = Path(filename).suffix.lower()
            if ext not in CODE_EXTENSIONS:
                continue
            filepath = os.path.join(dirpath, filename)
            try:
                size = os.path.getsize(filepath)
                if size > 500_000:
                    continue
                results.append({
                    "path": os.path.relpath(filepath, directory).replace("\\", "/"),
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
