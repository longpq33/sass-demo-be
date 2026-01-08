# Cập nhật: Thêm Tenant Info vào API Response

## Tổng quan

Đã cập nhật tất cả các API của backend để trả về thông tin tenant (id và name) trong response, giúp frontend hiển thị thông tin tenant mà không cần gọi API riêng.

## Các bước thực hiện

### 1. **Sites API** ✅

**File:** `backend/src/sites/sites.service.ts`

**Thay đổi:**
- `create()`: Thêm `include: { tenant: { select: { id: true, name: true } } }`
- `findAll()`: Thêm `tenant` vào include
- `update()`: Thêm `tenant` vào include
- `remove()`: Thêm `tenant` vào include

**Response mới:**
```json
{
  "id": "...",
  "name": "Site name",
  "tenantId": "...",
  "tenant": {
    "id": "...",
    "name": "Tenant name"
  },
  "meters": [...]
}
```

### 2. **Meters API** ✅

**File:** `backend/src/meters/meters.service.ts`

**Thay đổi:**
- `create()`: Thêm `site.tenant` vào include
- `findAllByTenant()`: Thêm `site.tenant` vào include
- `update()`: Thêm `site.tenant` vào include
- `remove()`: Thêm `site.tenant` vào include

**Response mới:**
```json
{
  "id": "...",
  "name": "Meter name",
  "site": {
    "id": "...",
    "name": "Site name",
    "tenant": {
      "id": "...",
      "name": "Tenant name"
    }
  }
}
```

### 3. **Readings API** ✅

**File:** `backend/src/readings/readings.service.ts`

**Thay đổi:**
- `create()`: Thêm `meter.site.tenant` vào include
- `findAll()`: Thêm `meter.site.tenant` vào include

**Response mới:**
```json
{
  "id": "...",
  "meterId": "...",
  "value": 100,
  "meter": {
    "id": "...",
    "name": "Meter name",
    "site": {
      "id": "...",
      "name": "Site name",
      "tenant": {
        "id": "...",
        "name": "Tenant name"
      }
    }
  }
}
```

### 4. **Alerts API** ✅

**File:** `backend/src/alerts/alerts.service.ts`

**Thay đổi:**
- `list()`: Thêm `tenant` vào `site` include

**Response mới:**
```json
{
  "id": "...",
  "message": "Alert message",
  "site": {
    "id": "...",
    "name": "Site name",
    "tenantId": "...",
    "tenant": {
      "id": "...",
      "name": "Tenant name"
    }
  }
}
```

### 5. **Dashboard API** ✅

**File:** `backend/src/dashboard/dashboard.service.ts`

**Thay đổi:**
- `tenantSummary()`: 
  - Lấy tenant info từ database
  - Thêm `tenant: { id, name }` vào response
- `siteDetail()`:
  - Thêm `tenant` vào site include
  - Thêm `tenant` vào response

**Response mới:**

**Tenant Summary:**
```json
{
  "tenant": {
    "id": "...",
    "name": "Tenant name"
  },
  "totalByDay": [...],
  "topSites": [...],
  "siteCount": 5,
  "meterCount": 10
}
```

**Site Detail:**
```json
{
  "tenant": {
    "id": "...",
    "name": "Tenant name"
  },
  "site": {
    "id": "...",
    "name": "Site name"
  },
  "meters": [...]
}
```

### 6. **Frontend Types** ✅

**File:** `frontend/src/lib/api-client.ts`

**Thay đổi:**
- `Site`: Thêm `tenant?: { id: string; name: string }`
- `Meter`: Thêm `tenant` vào `site` object
- `Reading`: Thêm `meter.site.tenant` structure
- `Alert`: Thêm `tenant` vào `site` object
- `TenantDashboard`: Thêm `tenant: { id, name } | null`
- `SiteDashboard`: Thêm `tenant: { id, name } | null`

## Lợi ích

1. **Giảm số lượng API calls**: Frontend không cần gọi API riêng để lấy tenant info
2. **Hiệu suất tốt hơn**: Dữ liệu được trả về trong một request
3. **Dễ sử dụng**: Frontend có thể hiển thị tenant name ngay lập tức
4. **Type-safe**: TypeScript types đã được cập nhật đầy đủ

## Testing

Tất cả các thay đổi đã được build thành công:
- ✅ Backend build: `npm run build` - SUCCESS
- ✅ Frontend types: No linter errors
- ✅ Tất cả services đã được cập nhật

## Cách sử dụng trong Frontend

```typescript
// Sites
const sites = await api.getSites();
sites.forEach(site => {
  console.log(site.tenant?.name); // Tenant name
});

// Meters
const meters = await api.getMeters();
meters.forEach(meter => {
  console.log(meter.site?.tenant?.name); // Tenant name
});

// Dashboard
const dashboard = await api.getTenantDashboard();
console.log(dashboard.tenant?.name); // Tenant name
```

## Notes

- Tất cả `tenant` fields là optional (`?`) vì có thể null trong một số trường hợp
- Backend vẫn giữ nguyên logic authorization và tenant filtering
- Không có breaking changes - chỉ thêm fields mới vào response

