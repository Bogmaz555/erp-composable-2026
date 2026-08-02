# quality.capa.closed.v1

| Field | Value |
|-------|-------|
| **Status** | Active |
| **Producer** | quality-service (UpdateCapaStatus → DONE) |
| **Consumers** | analytics / PM (optional) |
| **Version** | 1 |
| **Since** | Enterprise Q2 |

## Payload

```json
{
  "capaId": "uuid",
  "ncrId": "uuid",
  "status": "DONE",
  "closedAt": "ISO-8601"
}
```

## Semantics

Emitted in same DB transaction as CAPA status update (outbox TX).
Lifecycle: NCR open → CAPA create → CAPA close/verify.
