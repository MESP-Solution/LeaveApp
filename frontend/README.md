# LeaveApp Frontend

Frontend Next.js cho quy trình xin nghỉ phép LeaveApp.

## Chức năng hiện tại

- Đăng nhập bằng API thật của backend: `POST /auth/login`.
- Điều hướng dashboard theo role thật backend trả về: `STAFF`, `HEAD`, `MANAGER`, hoặc `ADMIN`.
- JWT được lưu bằng `HttpOnly` cookie tên `access_token` qua Next API route, không lưu trong `localStorage`.
- Tải lại trang sẽ gọi `/api/auth/me` để khôi phục phiên đăng nhập từ cookie.
- Các màn dashboard sau đăng nhập dùng API thật từ backend.

## Cấu hình API

Next route `/api/auth/login` proxy sang backend để tránh CORS khi chạy local.
Next route `/api/auth/logout` xóa cookie đăng nhập.
Next route `/api/auth/me` đọc cookie và gọi backend `/auth/me`.

Mặc định backend chạy ở:

```text
http://localhost:3000
```

Nếu backend chạy port khác, tạo `.env.local` trong `frontend`:

```text
BACKEND_URL=http://localhost:3000
```

## Chạy local

Chạy backend trước, sau đó chạy frontend:

```powershell
cd D:\LeaveApp\frontend
pnpm.cmd exec next dev -p 3001
```

Mở:

```text
http://localhost:3001
```

## Kiểm tra

```powershell
pnpm.cmd run lint
pnpm.cmd run build
```

Checklist role:

- ADMIN: đăng nhập, tạo staff mới, xóa staff không có lịch sử nghỉ phép.
- HEAD: duyệt và từ chối đơn nghỉ phép.
- MANAGER: duyệt/từ chối đơn nghỉ phép và xem bảng đơn được cập nhật.
