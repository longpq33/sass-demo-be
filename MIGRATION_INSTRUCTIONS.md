# Hướng dẫn chạy Migration cho PredictiveAlert

## Lỗi hiện tại
```
PrismaClientKnownRequestError: Invalid `this.prisma.predictiveAlert.findMany()` invocation
```

## Nguyên nhân
Prisma client chưa có model `predictiveAlert` vì migration chưa được chạy.

## Các bước khắc phục

### Cách 1: Chạy migration tự động (Khuyến nghị)

```bash
cd backend
npx prisma migrate dev --name add_predictive_alerts
```

Lệnh này sẽ:
1. Tạo migration file tự động từ schema
2. Áp dụng migration vào database
3. Tự động generate Prisma client

### Cách 2: Chạy migration thủ công

Nếu cách 1 không hoạt động, bạn có thể chạy SQL trực tiếp:

1. **Kết nối database và chạy SQL**:
   ```sql
   -- Tạo bảng PredictiveAlert
   CREATE TABLE "PredictiveAlert" (
       "id" UUID NOT NULL,
       "siteId" UUID NOT NULL,
       "message" TEXT NOT NULL,
       "level" "AlertLevel" NOT NULL DEFAULT 'warn',
       "predictedDate" TIMESTAMP(3) NOT NULL,
       "confidence" DOUBLE PRECISION NOT NULL,
       "trend" TEXT NOT NULL,
       "expectedValue" DOUBLE PRECISION NOT NULL,
       "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
       "expiresAt" TIMESTAMP(3) NOT NULL,
       CONSTRAINT "PredictiveAlert_pkey" PRIMARY KEY ("id")
   );

   -- Tạo indexes
   CREATE INDEX "PredictiveAlert_siteId_idx" ON "PredictiveAlert"("siteId");
   CREATE INDEX "PredictiveAlert_predictedDate_idx" ON "PredictiveAlert"("predictedDate");
   CREATE INDEX "PredictiveAlert_expiresAt_idx" ON "PredictiveAlert"("expiresAt");

   -- Thêm foreign key
   ALTER TABLE "PredictiveAlert" ADD CONSTRAINT "PredictiveAlert_siteId_fkey" 
   FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;
   ```

2. **Generate Prisma client**:
   ```bash
   cd backend
   npx prisma generate
   ```

3. **Restart backend server**:
   ```bash
   npm run start:dev
   # hoặc
   npm run build && npm run start:prod
   ```

### Cách 3: Sử dụng Prisma Studio để kiểm tra

```bash
cd backend
npx prisma studio
```

Mở browser và kiểm tra xem bảng `PredictiveAlert` đã được tạo chưa.

## Kiểm tra sau khi chạy migration

1. **Kiểm tra database có bảng chưa**:
   ```sql
   SELECT * FROM "PredictiveAlert" LIMIT 1;
   ```

2. **Kiểm tra Prisma client**:
   ```bash
   cd backend
   npx prisma generate
   ```
   Xem output có thông báo "Generated Prisma Client" không.

3. **Test API**:
   ```bash
   curl http://localhost:4000/api/alerts/predictive
   ```
   (Nhớ thêm authentication header nếu cần)

## Lưu ý quan trọng

- **Luôn backup database** trước khi chạy migration
- **Kiểm tra DATABASE_URL** trong `.env` đúng
- **Đảm bảo database đang chạy** và có quyền tạo bảng
- **Restart backend** sau khi generate Prisma client

## Nếu vẫn lỗi

1. Kiểm tra log backend để xem lỗi cụ thể
2. Kiểm tra xem Prisma client có được generate đúng không:
   ```bash
   ls -la node_modules/.prisma/client/
   ```
3. Xóa và generate lại:
   ```bash
   rm -rf node_modules/.prisma
   npx prisma generate
   ```

