# quality.capa.created.v1

**Producer:** quality-service (`POST /api/quality/ncrs/:id/capa`)  
**Consumers:** (planned) PM task assignment, analytics

## Payload

| Field | Type | Description |
|-------|------|-------------|
| capaId | string | CAPA id |
| ncrId | string | Source NCR |
| type | string | CORRECTIVE \| PREVENTIVE |
| assignee | string? | Owner |
| dueDate | string? | ISO due date |
| status | string | OPEN |

## Related

- `quality.ncr.raised.v1` — source non-conformance
- `quality.capa.verified.v1` — CAPA effectiveness verified (ISO 9001 §10.2)
