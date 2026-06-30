import os
import sys
from huggingface_hub import HfApi, login

def upload_index():
    print("=== UPLOAD MISSING INDEX FILE LÊN HUGGING FACE ===")
    
    # 1. Nhập Token
    token = input("1. Nhập Hugging Face Write Token của bạn (Lấy tại https://huggingface.co/settings/tokens): ").strip()
    if not token:
        token = os.getenv("HF_TOKEN")
        if not token:
            print("Lỗi: Bạn cần cung cấp Write Token để upload.")
            return
    
    try:
        login(token=token)
        print("-> Đăng nhập thành công!")
    except Exception as e:
        print(f"-> Đăng nhập thất bại: {e}")
        return

    # 2. Nhập Repository ID
    repo_id = "masterdzzzz/mt-nllb-1p3b-en-vi"
    repo_input = input(f"2. Nhập tên repository (Nhấn Enter để dùng mặc định: {repo_id}): ").strip()
    if repo_input:
        repo_id = repo_input

    # 3. Đường dẫn file index
    default_path = "D:/models/mt-nllb-1p3b-en-vi/best/model.safetensors.index.json"
    file_path = input(f"3. Nhập đường dẫn file index (Nhấn Enter để dùng mặc định: {default_path}): ").strip()
    if not file_path:
        file_path = default_path

    if not os.path.exists(file_path):
        print(f"Lỗi: Không tìm thấy file tại '{file_path}'. Vui lòng kiểm tra lại đường dẫn.")
        return

    confirm = input(f"Bạn có muốn upload file này lên repository '{repo_id}'? (y/n): ").strip().lower()
    if confirm != 'y':
        print("Đã hủy bỏ upload.")
        return

    api = HfApi()
    try:
        print("\nĐang upload file index lên Hugging Face...")
        api.upload_file(
            path_or_fileobj=file_path,
            path_in_repo="model.safetensors.index.json",
            repo_id=repo_id,
            repo_type="model"
        )
        print("\n🎉 Thành công! File index đã được upload đầy đủ. Space của bạn sẽ tự động chạy khi khởi động lại.")
    except Exception as e:
        print(f"\n❌ Lỗi khi upload: {e}")

if __name__ == "__main__":
    try:
        upload_index()
    except KeyboardInterrupt:
        print("\nĐã hủy tác vụ.")
        sys.exit(0)
