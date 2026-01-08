# Hướng dẫn khắc phục lỗi "Cannot GET /api/alerts/predictive"

## Nguyên nhân
Lỗi này xảy ra vì Prisma client chưa được generate sau khi thêm model `PredictiveAlert` mới vào schema.

## Các bước khắc phục

### Bước 1: Chạy migration Prisma
```bash
cd backend
npx prisma migrate dev --name add_predictive_alerts
```

Lệnh này sẽ:
- Tạo migration file
- Áp dụng migration vào database
- Tự động generate Prisma client

### Bước 2: Nếu migration đã chạy, chỉ cần generate client
```bash
cd backend
npx prisma generate
```

### Bước 3: Restart backend server
```bash
# Nếu đang chạy dev mode
npm run start:dev

# Hoặc nếu đang chạy production
npm run build
npm run start:prod
```

### Bước 4: Kiểm tra
1. Kiểm tra database có bảng `PredictiveAlert` chưa
2. Kiểm tra backend có start thành công không
3. Test API: `GET /api/alerts/predictive`

## Nếu vẫn lỗi

### Kiểm tra log backend
Xem có lỗi gì khi start server không, đặc biệt là:
- Lỗi về Prisma client
- Lỗi về missing model `predictiveAlert`

### Kiểm tra database connection
Đảm bảo `DATABASE_URL` trong `.env` đúng và database đang chạy.

### Kiểm tra Prisma schema
Đảm bảo model `PredictiveAlert` đã được thêm vào `prisma/schema.prisma`:
```prisma
model PredictiveAlert {
  id            String     @id @default(uuid()) @db.Uuid
  siteId        String     @db.Uuid
  site          Site       @relation(fields: [siteId], references: [id], onDelete: Cascade)
  message       String
  level         AlertLevel @default(warn)
  predictedDate DateTime
  confidence    Float
  trend         String
  expectedValue Float
  createdAt     DateTime   @default(now())
  expiresAt     DateTime

  @@index([siteId])
  @@index([predictedDate])
  @@index([expiresAt])
}
```

## Lưu ý
- Luôn chạy `prisma generate` sau khi thay đổi schema
- Luôn restart server sau khi generate Prisma client
- Kiểm tra database migration đã chạy thành công

