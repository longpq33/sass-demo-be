# Hướng dẫn xử lý Prisma Migration Drift

## Vấn đề
Khi chạy `prisma migrate dev`, gặp lỗi "Drift detected" - database không khớp với migration history.

## Giải pháp

### Cách 1: Sử dụng `prisma db push` (Khuyến nghị cho development)

Lệnh này sẽ sync schema với database mà không tạo migration file:

```bash
cd backend
npx prisma db push
```

Sau đó generate Prisma client:
```bash
npx prisma generate
```

**Lưu ý**: `db push` không tạo migration file, chỉ sync trực tiếp. Phù hợp cho development.

### Cách 2: Tạo baseline migration

Nếu muốn giữ migration history, tạo baseline:

```bash
cd backend
npx prisma migrate resolve --applied add_predictive_alerts
```

Hoặc nếu bảng đã tồn tại, tạo migration baseline:

```bash
npx prisma migrate dev --create-only --name baseline_predictive_alerts
```

Sau đó đánh dấu là đã apply:
```bash
npx prisma migrate resolve --applied baseline_predictive_alerts
```

### Cách 3: Reset và migrate lại (CHỈ cho development, mất dữ liệu!)

⚠️ **CẢNH BÁO**: Cách này sẽ XÓA TẤT CẢ DỮ LIỆU!

```bash
cd backend
npx prisma migrate reset
npx prisma migrate dev --name add_predictive_alerts
```

## Kiểm tra sau khi fix

1. **Kiểm tra Prisma client đã được generate**:
   ```bash
   npx prisma generate
   ```

2. **Kiểm tra database có bảng PredictiveAlert**:
   ```sql
   SELECT * FROM "PredictiveAlert" LIMIT 1;
   ```

3. **Restart backend và test API**:
   ```bash
   npm run start:dev
   ```

## Khuyến nghị

- **Development**: Dùng `prisma db push` (nhanh, đơn giản)
- **Production**: Tạo migration baseline đúng cách để giữ history

