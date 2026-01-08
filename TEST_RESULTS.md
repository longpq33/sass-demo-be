# Kết quả kiểm tra và sửa lỗi Backend

## Các bug đã sửa:

### 1. **seed.ts** - Lỗi import Prisma
- **Vấn đề**: Import `Prisma` và `PrismaClient` không tương thích với NodeNext module resolution
- **Giải pháp**: Sử dụng default import pattern giống `PrismaService`

### 2. **seed.ts** - Lỗi type của `readingsData`
- **Vấn đề**: TypeScript không thể infer type của mảng `readingsData`
- **Giải pháp**: Thêm explicit type annotation

### 3. **seed.ts** - Lỗi formatting
- **Vấn đề**: Prettier yêu cầu format lại các dòng 70, 73, 76
- **Giải pháp**: Format lại code theo chuẩn Prettier

### 4. **readings.service.ts** - Lỗi `UserRole` không được định nghĩa
- **Vấn đề**: Sử dụng `UserRole.system_admin` nhưng không import
- **Giải pháp**: Thay bằng string literal `'system_admin'` để nhất quán

### 5. **alerts.service.ts** - Lỗi type của `alertsToCreate`
- **Vấn đề**: TypeScript không thể infer type của mảng
- **Giải pháp**: Thêm explicit type annotation

### 6. **auth.controller.ts** - Lỗi import Response type
- **Vấn đề**: `Response` type cần import với `import type` khi dùng `isolatedModules`
- **Giải pháp**: Đổi thành `import type { Response }`

### 7. **auth.module.ts** - Lỗi JWT expiresIn type
- **Vấn đề**: Type mismatch với `JwtModuleOptions`
- **Giải pháp**: Sử dụng type assertion `as any`

### 8. **main.ts** - Lỗi import cookieParser
- **Vấn đề**: Namespace import không thể gọi như function
- **Giải pháp**: Đổi thành default import

### 9. **tenants/** - Lỗi import Prisma enums
- **Vấn đề**: `Prisma.TenantStatus` và `Prisma.UserRole` không tồn tại trong Prisma 7 + NodeNext
- **Giải pháp**: Import trực tiếp từ `@prisma/client`: `TenantStatus`, `UserRole`

### 10. **sites.service.ts** - Lỗi logic trong `findAll`
- **Vấn đề**: Yêu cầu `tenantId` ngay cả khi role là `system_admin`
- **Giải pháp**: Cho phép `system_admin` xem tất cả sites khi không có `tenantId`

## Build Status: ✅ SUCCESS

Backend đã build thành công không có lỗi.

## Các API endpoints:

### Authentication
- `POST /api/auth/login` - Đăng nhập
- `GET /api/auth/me` - Lấy thông tin user hiện tại
- `POST /api/auth/logout` - Đăng xuất

### Tenants (system_admin only)
- `GET /api/tenants` - Lấy danh sách tenants
- `POST /api/tenants` - Tạo tenant mới
- `GET /api/tenants/:id` - Lấy thông tin tenant
- `PATCH /api/tenants/:id` - Cập nhật tenant

### Sites
- `GET /api/sites` - Lấy danh sách sites
- `POST /api/sites` - Tạo site mới (system_admin, customer_admin)
- `PATCH /api/sites/:id` - Cập nhật site (system_admin, customer_admin)
- `DELETE /api/sites/:id` - Xóa site (system_admin, customer_admin)

### Meters
- `GET /api/meters` - Lấy danh sách meters
- `POST /api/meters` - Tạo meter mới (system_admin, customer_admin)
- `PATCH /api/meters/:id` - Cập nhật meter (system_admin, customer_admin)
- `DELETE /api/meters/:id` - Xóa meter (system_admin, customer_admin)

### Readings
- `GET /api/readings` - Lấy danh sách readings (query: meterId, from, to)
- `POST /api/readings` - Tạo reading mới (system_admin, customer_admin, operator)

### Alerts
- `GET /api/alerts` - Lấy danh sách alerts
- `POST /api/alerts/recompute` - Tính toán lại alerts (system_admin, customer_admin)

### Dashboard
- `GET /api/dashboard/tenant` - Tóm tắt tenant
- `GET /api/dashboard/site/:id` - Chi tiết site

## Cách test:

1. **Start server:**
   ```bash
   cd backend
   npm run start:dev
   ```

2. **Seed database (nếu chưa có data):**
   ```bash
   npm run db:seed
   ```

3. **Test với script:**
   ```bash
   ./test-api.sh
   ```

4. **Hoặc test thủ công:**
   ```bash
   # Login
   curl -X POST http://localhost:4000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@example.com","password":"Admin123!"}' \
     -c cookies.txt
   
   # Get sites
   curl -X GET http://localhost:4000/api/sites \
     -b cookies.txt \
     -H "Content-Type: application/json"
   ```

## Default credentials (từ seed):
- System Admin: `admin@example.com` / `Admin123!`
- Tenant Admin: `abc-admin@example.com` / `Admin123!`

