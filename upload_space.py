import os
import sys
from huggingface_hub import HfApi, login

def upload_space():
    print("=== CÔNG CỤ UPLOAD SPACE LÊN HUGGING FACE ===")
    
    # 1. Nhập Token
    token = input("1. Nhập Hugging Face Write Token của bạn (Lấy tại https://huggingface.co/settings/tokens): ").strip()
    if not token:
        # Thử kiểm tra biến môi trường HF_TOKEN
        token = os.getenv("HF_TOKEN")
        if not token:
            print("Lỗi: Bạn cần cung cấp Write Token để upload Space.")
            return
    
    try:
        login(token=token)
        print("-> Đăng nhập thành công!")
    except Exception as e:
        print(f"-> Đăng nhập thất bại: {e}")
        return

    # 2. Nhập thông tin Repository
    default_repo = "masterdzzzz/vietrans-modelspace"
    repo_id = input(f"2. Nhập tên Space repository (Nhấn Enter để dùng mặc định: {default_repo}): ").strip()
    if not repo_id:
        repo_id = default_repo

    # 3. Xác định đường dẫn thư mục Space
    default_dir = "Space"
    space_dir = input(f"3. Nhập đường dẫn thư mục Space (Nhấn Enter để dùng mặc định: {default_dir}): ").strip()
    if not space_dir:
        space_dir = default_dir

    if not os.path.exists(space_dir):
        print(f"Lỗi: Thư mục '{space_dir}' không tồn tại. Vui lòng kiểm tra lại đường dẫn.")
        return

    print(f"\n[Thông tin upload]")
    print(f"  - Thư mục nguồn: {space_dir}")
    print(f"  - Space Repository: https://huggingface.co/spaces/{repo_id}")
    
    confirm = input("Bạn có chắc chắn muốn bắt đầu upload? (y/n): ").strip().lower()
    if confirm != 'y':
        print("Đã hủy bỏ upload.")
        return

    api = HfApi()

    # Tiến hành upload folder lên Space
    try:
        print("\nĐang upload thư mục Space lên Hugging Face Spaces... (Hệ thống sẽ hiển thị thanh tiến trình tự động)")
        api.upload_folder(
            folder_path=space_dir,
            repo_id=repo_id,
            repo_type="space"
        )
        print(f"\n🎉 Thành công! Space đã được upload và cập nhật đầy đủ lên: https://huggingface.co/spaces/{repo_id}")
        print("Hệ thống Hugging Face Space sẽ tự động rebuild và khởi động lại với cấu hình mới.")
    except Exception as e:
        print(f"\n❌ Lỗi khi upload: {e}")
        print("Gợi ý: Hãy kiểm tra kết nối mạng hoặc token quyền ghi (Write token).")

if __name__ == "__main__":
    try:
        upload_space()
    except KeyboardInterrupt:
        print("\nĐã hủy tác vụ.")
        sys.exit(0)
