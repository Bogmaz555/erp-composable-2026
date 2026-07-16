# eam.maintenance.scheduled.v1

**Producer:** eam-service (on maintenance task create)  
**Consumers:** pm-service (logging / future capacity planning)

## Payload

| Field | Type |
|-------|------|
| taskId | string |
| equipmentId | string |
| type | PREVENTIVE \| CORRECTIVE \| CALIBRATION |
| scheduledDate | string (ISO) |
| description | string |
