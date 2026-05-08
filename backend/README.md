# LeaveApp Backend

NestJS API cho hệ thống quản lý nghỉ phép dùng MySQL thật qua MikroORM.

## Scope hiện tại

- Đăng nhập bằng tài khoản trong bảng `staffs`.
- Quản lý nhân sự: tạo và xem danh sách staff.
- Tạo đơn nghỉ phép theo từng ngày.
- Xem danh sách đơn, lọc theo trạng thái.
- HEAD, MANAGER hoặc ADMIN duyệt/từ chối đơn.
- Chặn staff gửi trùng đơn nghỉ cùng một ngày.
- Gửi email qua `MailService` (SMTP). Khi staff tạo leave request, hệ thống sẽ notify tất cả `MANAGER` và `HEAD`.
- Swagger UI và OpenAPI JSON tại `/api/docs` và `/api/docs-json` khi `NODE_ENV` khác `production`.
- Global request validation bắt buộc payload đúng DTO và loại field ngoài whitelist.

## Cấu hình DB

Tạo file `.env` từ `.env.example`, chỉnh thông tin MySQL:

```text
PORT=3000

DB_HOST=localhost
DB_PORT=3306
DB_USER=leaveapp
DB_PASSWORD=leaveapp
DB_NAME=leaveapp

JWT_SECRET=change-me
JWT_EXPIRES_IN=1d
```

Thiết lập SMTP (để gửi email thật):

```text
SMTP_HOST=smtp.yourprovider.com
SMTP_PORT=587
SMTP_SECURE=false
```

Lưu ý: hệ thống dùng `email` + `smtpPass` của từng staff làm tài khoản gửi mail (không dùng `SMTP_USER`/`SMTP_PASS` trong `.env` nữa).

Chạy migration để tạo bảng thật và seed role mặc định `STAFF`, `MANAGER`, `HEAD`, `ADMIN`:

```bash
pnpm run migration:up
```

Seed dữ liệu demo:

```bash
mysql -u leaveapp -p leaveapp < scripts/demo-seed.sql
```

Tất cả tài khoản demo dùng mật khẩu:

```text
12345678
```

```text
STAFF   an@leaveapp.local
STAFF   binh@leaveapp.local
MANAGER quan@leaveapp.local
HEAD    ha@leaveapp.local
ADMIN   nam@leaveapp.local
```

## API nhanh

```http
GET /health
GET /api/docs
POST /auth/login
GET /auth/me
GET /staffs
POST /staffs
GET /leave-requests
GET /leave-requests?status=PENDING
GET /leave-requests/:id
POST /leave-requests
PATCH /leave-requests/:id/approve
PATCH /leave-requests/:id/reject
```

## Auth API

Đăng nhập bằng tài khoản trong bảng `staffs`.

```http
POST /auth/login
Content-Type: application/json
```

```json
{
  "email": "an@company.local",
  "password": "12345678"
}
```

Response:

```json
{
  "accessToken": "jwt-token",
  "staff": {
    "id": 1,
    "fullName": "Nguyễn Văn An",
    "email": "an@company.local",
    "role": "STAFF",
    "leaveCredit": 12
  }
}
```

Kiểm tra token hiện tại:

```http
GET /auth/me
Authorization: Bearer <accessToken>
```

## Ví dụ payload

Tạo nhân viên:

```json
{
  "fullName": "Nguyễn Văn An",
  "email": "an@company.local",
  "password": "12345678",
  "roleId": 1,
  "leaveCredit": 12
}
```

Tạo đơn nghỉ:

```json
{
  "staffId": 1,
  "leaveDate": "2026-05-07",
  "reason": "Việc gia đình"
}
```

Duyệt đơn (người duyệt lấy từ JWT đăng nhập, role HEAD/MANAGER/ADMIN):

```json
{
  "note": "Đồng ý"
}
```

Từ chối đơn (người duyệt lấy từ JWT đăng nhập, role HEAD/MANAGER/ADMIN):

```json
{
  "note": "Trùng lịch họp"
}
```

## Project setup

```bash
pnpm install
```

## Compile and run

```bash
pnpm run start:dev
pnpm run build
pnpm run start:prod
```

## Run tests

```bash
pnpm run test
pnpm run test:e2e
pnpm run test:cov
```
