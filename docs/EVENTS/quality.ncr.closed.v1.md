# quality.ncr.closed.v1

**Producer:** quality-service (`PATCH /ncrs/:id/close`)  
**Consumers:** pm-service (fever zone GREEN)

## Payload

| Field | Type |
|-------|------|
| ncrId | string |
| disposition | string |
| closedBy | string? |
| closedAt | string |
| projectId | string? |
