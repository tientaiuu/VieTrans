import os
import sys
from huggingface_hub import HfApi, login

def upload():
    print("=== CÔNG CỤ UPLOAD MODEL LÊN HUGGING FACE ===")
    
    # 1. Nhập Token
    token = input("1. Nhập Hugging Face Write Token của bạn (Lấy tại https://huggingface.co/settings/tokens): ").strip()
    if not token:
        # Thử kiểm tra biến môi trường HF_TOKEN
        token = os.getenv("HF_TOKEN")
        if not token:
            print("Lỗi: Bạn cần cung cấp Write Token để upload model.")
            return
    
    try:
        login(token=token)
        print("-> Đăng nhập thành công!")
    except Exception as e:
        print(f"-> Đăng nhập thất bại: {e}")
        return

    # 2. Nhập thông tin Repository
    repo_id = input("2. Nhập tên repository muốn upload (Ví dụ: tientaiuu/mt-nllb-1p3b-en-vi): ").strip()
    if not repo_id:
        print("Lỗi: Tên repository không được để trống!")
        return

    # 3. Xác định đường dẫn thư mục chứa model
    default_dir = "D:/models/mt-nllb-1p3b-en-vi/best"
    model_dir = input(f"3. Nhập đường dẫn thư mục model (Nhấn Enter để dùng mặc định: {default_dir}): ").strip()
    if not model_dir:
        model_dir = default_dir

    if not os.path.exists(model_dir):
        print(f"Lỗi: Thư mục '{model_dir}' không tồn tại. Vui lòng kiểm tra lại đường dẫn.")
        return

    print(f"\n[Thông tin upload]")
    print(f"  - Thư mục nguồn: {model_dir}")
    print(f"  - Repository đích: https://huggingface.co/{repo_id}")
    
    confirm = input("Bạn có chắc chắn muốn bắt đầu upload? (y/n): ").strip().lower()
    if confirm != 'y':
        print("Đã hủy bỏ upload.")
        return

    api = HfApi()

    # Tạo repo nếu chưa tồn tại
    try:
        api.create_repo(repo_id=repo_id, repo_type="model", exist_ok=True)
        print(f"\n-> Đã chuẩn bị xong repository: {repo_id}")
    except Exception as e:
        print(f"Lỗi khi tạo repository trên Hugging Face: {e}")
        return

    # Tiến hành upload folder
    try:
        print("\nĐang upload thư mục model... (Hệ thống sẽ hiển thị thanh tiến trình tự động)")
        api.upload_folder(
            folder_path=model_dir,
            repo_id=repo_id,
            repo_type="model"
        )
        print(f"\n🎉 Thành công! Model đã được upload đầy đủ lên: https://huggingface.co/{repo_id}")
    except Exception as e:
        print(f"\n❌ Lỗi khi upload: {e}")
        print("Gợi ý: Hãy kiểm tra kết nối mạng hoặc dung lượng ổ đĩa tạm thời.")

if __name__ == "__main__":
    try:
        upload()
    except KeyboardInterrupt:
        print("\nĐã hủy tác vụ.")
        sys.exit(0)
