# eam.breakdown.detected.v1

**Producer:** eam-service (`POST /api/eam/breakdown`)  
**Consumers:** (planned) PM, MES downtime

## Payload

| Field | Type |
|-------|------|
| equipmentId | string |
| reason | string |
| severity | string |
| detectedAt | string |
