from __future__ import annotations

import os
import shutil
import sys
import tempfile
from pathlib import Path

from huggingface_hub import HfApi, login


DEFAULT_REPO = "masterdzzzz/vietrans-backend"
DEFAULT_SOURCE_DIR = Path("BE-Models")

# Keep the backend Space small and predictable. The API server proxies model
# inference to the separate model Space, so do not upload local inference code.
INCLUDE_FILES = [
    "Dockerfile",
    "README.md",
    "LICENSE",
    "requirements.txt",
    "server/app.py",
    "server/auth.py",
    "server/space_client.py",
    "server/requirements.txt",
]

REMOTE_DELETE_PATTERNS = [
    ".env",
    ".env.*",
    "server/.env",
    "server/.env.*",
    "server/env",
    "outputs/**",
    "__pycache__/**",
    "server/__pycache__/**",
    "*.pyc",
    "*.pyo",
    "*.pyd",
    ".git/**",
    ".github/**",
    ".idea/**",
    ".vscode/**",
    "venv/**",
    ".venv/**",
    "env/**",
    "ENV/**",
    "server/inference.py",
    "server/vietrans_space_inference/**",
]


def _read_input(prompt: str, default: str | None = None) -> str:
    suffix = f" (Enter = {default})" if default else ""
    value = input(f"{prompt}{suffix}: ").strip()
    return value or (default or "")


def _copy_selected_files(source_dir: Path, staging_dir: Path) -> list[str]:
    included: list[str] = []
    missing: list[str] = []

    for rel_path in INCLUDE_FILES:
        src = source_dir / rel_path
        dst = staging_dir / rel_path
        if not src.is_file():
            missing.append(rel_path)
            continue
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dst)
        included.append(rel_path)

    if missing:
        raise FileNotFoundError(
            "Missing required backend deployment file(s): " + ", ".join(missing)
        )

    return included


def _print_upload_plan(source_dir: Path, included: list[str]) -> None:
    risky_local_files = [
        ".env",
        ".env.*",
        "server/.env",
        "server/.env.*",
        "server/env",
        "outputs/**",
        "server/inference.py",
        "server/vietrans_space_inference/**",
        "__pycache__/**",
    ]

    print("\n[Upload plan]")
    print(f"  Source folder : {source_dir}")
    print("  Included files:")
    for rel_path in included:
        print(f"    - {rel_path}")

    print("  Excluded/cleanup targets:")
    for pattern in risky_local_files:
        print(f"    - {pattern}")


def upload_be() -> None:
    print("=== Upload VieTrans backend to Hugging Face Spaces ===")

    token = input(
        "1. Enter your Hugging Face Write Token "
        "(leave blank to use HF_TOKEN/HUGGINGFACE_TOKEN): "
    ).strip()
    if not token:
        token = os.getenv("HF_TOKEN") or os.getenv("HUGGINGFACE_TOKEN") or ""
    if not token:
        print("Error: a Hugging Face Write Token is required.")
        return

    try:
        login(token=token)
        print("-> Hugging Face login successful.")
    except Exception as exc:
        print(f"-> Hugging Face login failed: {exc}")
        return

    repo_id = _read_input("2. Space repository", DEFAULT_REPO)
    source_dir = Path(_read_input("3. Backend source folder", str(DEFAULT_SOURCE_DIR)))
    source_dir = source_dir.expanduser().resolve()

    if not source_dir.is_dir():
        print(f"Error: directory does not exist: {source_dir}")
        return

    with tempfile.TemporaryDirectory(prefix="vietrans-be-upload-") as tmp:
        staging_dir = Path(tmp)
        try:
            included = _copy_selected_files(source_dir, staging_dir)
        except FileNotFoundError as exc:
            print(f"Error: {exc}")
            return

        _print_upload_plan(source_dir, included)
        print(f"  Space repo    : https://huggingface.co/spaces/{repo_id}")
        print("  Remote cleanup: enabled for stale secrets/cache/inference files")

        confirm = input("\nStart upload with this safe file set? (y/n): ").strip().lower()
        if confirm != "y":
            print("Upload cancelled.")
            return

        api = HfApi()
        try:
            print("\nUploading staged backend files to Hugging Face Spaces...")
            api.upload_folder(
                folder_path=staging_dir,
                repo_id=repo_id,
                repo_type="space",
                delete_patterns=REMOTE_DELETE_PATTERNS,
                commit_message="Deploy VieTrans backend API",
            )
            print(f"\nSuccess: backend uploaded to https://huggingface.co/spaces/{repo_id}")
            print("Hugging Face Spaces will rebuild automatically.")
        except Exception as exc:
            print(f"\nError during upload: {exc}")
            print("Hint: check network access, repo name, and Write Token permissions.")


if __name__ == "__main__":
    try:
        upload_be()
    except KeyboardInterrupt:
        print("\nOperation cancelled.")
        sys.exit(0)
