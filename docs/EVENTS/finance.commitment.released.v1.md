# finance.commitment.released.v1

| Field | Value |
|-------|-------|
| **Status** | Active |
| **Producer** | finance compensation / saga |
| **Consumers** | finance ReleaseCommitmentHandler |
| **Version** | 1 |
| **Since** | Enterprise Q2 |

## Payload

```json
{
  "tenantId": "default",
  "correlationId": "uuid",
  "orderRef": "PO-…",
  "amount": 500.00,
  "eventId": "optional-msg-id"
}
```

## Semantics

Releases AP financial commitment after PO cancel / compensation.
Idempotent by journal `source=PO_COMMITMENT_RELEASE` + correlationId.
