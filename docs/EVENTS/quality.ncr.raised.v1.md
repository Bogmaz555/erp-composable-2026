# quality.ncr.raised.v1

**Producer:** quality-service (Outbox relay)  
**Consumers:** pm-service (fever zone / WBS QUALITY_HOLD)

## Payload

| Field | Type | Description |
|-------|------|-------------|
| ncrId | string | NCR id |
| inspectionId | string | Source inspection |
| defectDescription | string | Defect text |
| severity | string | LOW … CRITICAL |
| status | string | OPEN |
| projectId | string? | ETO project |
| workOrderId | string? | WO reference |
| bomComponentId | string? | Traceability |
| tenantId | string? | Tenant |
| raisedAt | string | ISO timestamp |

## Triggers

- Manual `POST /api/quality/ncrs`
- Auto inspection failure workflows (planned)
