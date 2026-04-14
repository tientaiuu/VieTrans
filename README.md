# Hệ thống dịch ảnh IIMT (React App)

Đây là dự án giao diện frontend cho Hệ thống dịch ảnh IIMT. Dự án được xây dựng với **React 19**, **TypeScript**, **Vite** và **Tailwind CSS**.

## 🛠 Yêu cầu hệ thống (Prerequisites)

- [Node.js](https://nodejs.org/en) (Phiên bản >= 18.0)
- `npm` (thường được cài cùng với Node.js)

## 📦 Hướng dẫn cài đặt (Installation)

Quá trình cài đặt rất đơn giản. Tất cả các thư viện cần thiết đều được quản lý tự động thông qua file `package.json`.

1. Mở Cửa sổ Dòng lệnh (Terminal / Command Prompt).
2. Di chuyển đường dẫn vào thư mục chứa mã nguồn:
   ```bash
   cd iimt-react-app
   ```
3. Cài đặt các thư viện cần thiết:
   ```bash
   npm install
   ```

## 🚀 Hướng dẫn chạy chương trình (Usage)

### Chạy ở chế độ phát triển (Development)
Chạy lệnh sau để khởi động môi trường lập trình. Môi trường này có tính năng Hot-Module Replacement (HMR) giúp cập nhật trình duyệt ngay khi bạn thay đổi code:

```bash
npm run dev
```
> Trình duyệt sẽ hiển thị ứng dụng ở địa chỉ localhost (thường là `http://localhost:5173/`).

### Đóng gói ứng dụng để đưa lên mạng (Build for Production)
Nếu bạn muốn triển khai dự án lên một máy chủ thật, bạn cần đóng gói dự án:

```bash
npm run build
```
Lệnh trên sẽ quét lỗi TypeScript và tạo ra một thư mục `dist/` chứa mã tĩnh siêu gọn nhẹ để đưa lên host.

Xem trước bản Build nội bộ ở trên máy hiện tại của bạn:
```bash
npm run preview
```

## 🗂 Cấu trúc thư mục hiện tại

- `/src`: Chứa toàn bộ source code của app React (giao diện, logic).
- `/public`: Chứa tài nguyên tĩnh dùng để render trực tiếp.
- `package.json`: Chứa thông tin các gói thư viện dự án dùng.
- `requirements.txt`: Mô tả chi tiết những thư viện dự án sử dụng cho người mới.

*(Các file script dư thừa dùng để chuyển đổi codebase cũ đã được loại bỏ đi cho dự án nhẹ nhàng nhất có thể).*
