# External System Mapping Solution

## Tổng quan

Giải pháp để backend biết được external system (như Digital Taiwin) thuộc Site nào thông qua **ExternalSystem Model** với caching và validation.

## Kiến trúc

```
Digital Taiwin (systemId: "digital-taiwin-001")
    ↓ MQTT Message
Backend MQTT Handler
    ↓ Lookup by systemId
ExternalSystemService (with caching)
    ↓ Get siteId
PowerDataHandler → Store data với siteId
```

## Database Schema

### ExternalSystem Model
- `id`: UUID (primary key)
- `systemId`: String (unique) - MQTT system identifier
- `name`: String - Tên hệ thống
- `type`: Enum - Loại hệ thống (POWER_GRID, SCADA, EMS, etc.)
- `siteId`: UUID - Foreign key to Site
- `status`: Enum - Trạng thái (ACTIVE, INACTIVE, ERROR, PENDING)
- `mqttUsername`: String - MQTT username
- `lastSeen`: DateTime - Lần cuối nhận data
- `metadata`: JSON - Thông tin bổ sung

## Flow xử lý

### 1. Registration Flow
```
Admin tạo Site
    ↓
Admin tạo ExternalSystem:
  - systemId: "digital-taiwin-001"
  - siteId: <site-uuid>
  - status: "ACTIVE"
    ↓
System bắt đầu gửi data qua MQTT
    ↓
Backend tự động map và lưu với siteId
```

### 2. Data Processing Flow
```
MQTT Message received với systemId
    ↓
PowerDataHandler.handle()
    ↓
ExternalSystemsService.findBySystemId() [Cached]
    ↓
Validate: system exists và status = ACTIVE
    ↓
Get siteId từ ExternalSystem
    ↓
Store data với siteId
    ↓
Update lastSeen timestamp
```

## Tối ưu hóa

### 1. Caching Strategy
- **Cache TTL**: 5 minutes
- **Cache Key**: systemId
- **Cache Invalidation**: Khi update/delete system
- **Benefits**: Giảm database queries cho high-frequency lookups

### 2. Error Handling
- System not found → Log warning, skip processing
- System inactive → Log warning, skip processing
- Invalid data → Validate và reject
- Không throw errors để không block other handlers

### 3. Performance
- Index trên `systemId` (unique)
- Index trên `siteId` và `status`
- Caching để giảm DB load
- Batch operations khi cần

## API Endpoints

### Create External System
```bash
POST /api/external-systems
Body: {
  "systemId": "digital-taiwin-001",
  "name": "Digital Taiwin Power Grid",
  "type": "POWER_GRID",
  "siteId": "<site-uuid>",
  "status": "ACTIVE"
}
```

### List External Systems
```bash
GET /api/external-systems?siteId=<site-uuid>
```

### Get External System
```bash
GET /api/external-systems/:id
```

### Update External System
```bash
PATCH /api/external-systems/:id
Body: {
  "status": "ACTIVE",
  "name": "Updated Name"
}
```

### Delete External System
```bash
DELETE /api/external-systems/:id
```

## Security

1. **Tenant Isolation**: Chỉ admin của tenant mới thấy systems của tenant đó
2. **Role-based Access**: system_admin có thể xem tất cả
3. **Validation**: Verify site belongs to tenant trước khi tạo
4. **Status Check**: Chỉ xử lý data từ systems có status ACTIVE

## Monitoring

1. **Last Seen Tracking**: Tự động update khi nhận data
2. **Status Updates**: Track qua MQTT status messages
3. **Cache Metrics**: Monitor cache hit/miss rates
4. **Error Logging**: Log tất cả errors với context

## Code Structure

```
backend/src/external-systems/
├── external-systems.service.ts    # Business logic với caching
├── external-systems.controller.ts # REST API endpoints
├── external-systems.module.ts     # Module definition
└── dto/
    ├── create-external-system.dto.ts
    └── update-external-system.dto.ts
```

## Best Practices

1. **Always validate** system exists và active trước khi process data
2. **Cache invalidation** khi update/delete
3. **Error handling** không throw để không block other handlers
4. **Logging** đầy đủ để debug
5. **Type safety** với enums và DTOs

## Example Usage

### 1. Register Digital Taiwin với Site
```bash
# Get site ID first
GET /api/sites

# Create external system
POST /api/external-systems
{
  "systemId": "digital-taiwin-001",
  "name": "Digital Taiwin Power Grid",
  "type": "POWER_GRID",
  "siteId": "<site-id-from-above>",
  "status": "ACTIVE"
}
```

### 2. Verify Mapping
```bash
GET /api/external-systems?siteId=<site-id>
```

### 3. Monitor Status
```bash
GET /api/external-systems/:id
# Check lastSeen và status
```

## Troubleshooting

### System not found errors
- Verify systemId matches exactly
- Check system is registered in database
- Verify status is ACTIVE

### Data not being processed
- Check system status (must be ACTIVE)
- Verify MQTT connection
- Check backend logs for errors

### Cache issues
- Cache auto-expires after 5 minutes
- Manual invalidation on update/delete
- Check cache size if needed

