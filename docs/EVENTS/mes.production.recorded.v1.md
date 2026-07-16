# mes.production.recorded.v1

**Status:** Active (Faza 1)  
**Producer:** `mes-service` (Outbox after RecordProductionCommand)  
**Consumers:** `inv-service`, `finance`

---

## Payload

```json
{
  "workOrderId": "uuid",
  "projectId": "uuid",
  "tenantId": "default",
  "quantityGood": 1,
  "quantityScrap": 0,
  "operatorId": "user-id",
  "laborHours": 4.5,
  "bomComponentIds": ["bom-component-uuid"],
  "recordedAt": "2026-06-04T12:00:00.000Z"
}
```

## Effects

| Consumer | Action |
|----------|--------|
| INV | Release active reservations; genealogy; emit `inventory.reservation.released.v1` |
| Finance | Book LABOR + OVERHEAD `ProjectCost`; update `WipAccount.laborCost` |

## Headers (TD-001)

- `x-user-id`, `x-roles` — audit on downstream handlers
