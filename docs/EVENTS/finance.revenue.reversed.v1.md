# finance.revenue.reversed.v1

| Field | Value |
|-------|-------|
| **Status** | Active |
| **Producer** | finance (compensation matrix / Temporal fallback) |
| **Consumers** | finance ReverseRevenueHandler |
| **Version** | 1 |
| **Since** | Enterprise Q2 |

## Payload

```json
{
  "tenantId": "default",
  "projectId": "proj-…",
  "correlationId": "uuid",
  "amount": 1000.00,
  "eventId": "optional-msg-id"
}
```

## Semantics

Compensation for `finance.revenue.recognized.v1` / failed KSeF path.
Idempotent by `referenceId=correlationId` + `source=REVENUE_COMPENSATION` and processed_events ledger.
