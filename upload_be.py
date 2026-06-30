import os
import sys
from huggingface_hub import HfApi, login

def upload_be():
    print("=== UPLOAD BACKEND (BE-Models) TO HUGGING FACE SPACES ===")
    
    # 1. Nhập Token
    token = input("1. Enter your Hugging Face Write Token (Get from https://huggingface.co/settings/tokens): ").strip()
    if not token:
        # Thử kiểm tra biến môi trường HF_TOKEN
        token = os.getenv("HF_TOKEN")
        if not token:
            print("Error: You need to provide a Write Token to upload Space.")
            return
    
    try:
        login(token=token)
        print("-> Login successful!")
    except Exception as e:
        print(f"-> Login failed: {e}")
        return

    # 2. Nhập thông tin Repository
    default_repo = "masterdzzzz/vietrans-backend"
    repo_id = input(f"2. Enter Space repository name (Press Enter for default: {default_repo}): ").strip()
    if not repo_id:
        repo_id = default_repo

    # 3. Xác định đường dẫn thư mục BE
    default_dir = "BE-Models"
    be_dir = input(f"3. Enter BE folder path (Press Enter for default: {default_dir}): ").strip()
    if not be_dir:
        be_dir = default_dir

    if not os.path.exists(be_dir):
        print(f"Error: Directory '{be_dir}' does not exist.")
        return

    print(f"\n[Upload Info]")
    print(f"  - Source folder: {be_dir}")
    print(f"  - Space Repository: https://huggingface.co/spaces/{repo_id}")
    
    confirm = input("Are you sure you want to start the upload? (y/n): ").strip().lower()
    if confirm != 'y':
        print("Upload cancelled.")
        return

    api = HfApi()

    # Tiến hành upload folder lên Space
    try:
        print("\nUploading Backend folder to Hugging Face Spaces... (Progress bar will show automatically)")
        api.upload_folder(
            folder_path=be_dir,
            repo_id=repo_id,
            repo_type="space",
            ignore_patterns=[
                # Virtual environments
                "**/venv/**",
                "**/.venv/**",
                "**/env/**",
                "**/ENV/**",
                "venv/**",
                ".venv/**",
                "env/**",
                # Python cache
                "**/__pycache__/**",
                "__pycache__/**",
                "**/*.pyc",
                "**/*.pyo",
                "**/*.pyd",
                # Models and Outputs
                "**/outputs/**",
                "outputs/**",
                "**/*.pt",
                "**/*.pth",
                # Environments and configuration
                "**/.env",
                "**/.env.*",
                ".env",
                # Logs and temp files
                "**/*.log",
                "**/.DS_Store",
                # IDE configuration
                "**/.git/**",
                "**/.github/**",
                "**/.idea/**",
                "**/.vscode/**",
            ]
        )
        print(f"\n🎉 Success! Backend has been uploaded to: https://huggingface.co/spaces/{repo_id}")
        print("Hugging Face Space will automatically rebuild and start.")
    except Exception as e:
        print(f"\n❌ Error during upload: {e}")
        print("Hint: Check your network connection or Write Token permissions.")

if __name__ == "__main__":
    try:
        upload_be()
    except KeyboardInterrupt:
        print("\nOperation cancelled.")
        sys.exit(0)
