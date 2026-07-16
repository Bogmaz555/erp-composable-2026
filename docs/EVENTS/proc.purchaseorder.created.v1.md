# proc.purchaseorder.created.v1

**Producer:** `proc-service` (Outbox relay after `CreatePurchaseOrderHandler`)  
**Consumers:** (planned) Finance commitment, analytics

## Payload

| Field | Type | Description |
|-------|------|-------------|
| orderId | string | PO id |
| sku | string | Material SKU |
| quantity | number | Ordered amount |
| projectId | string? | ETO project |
| bomComponentId | string? | PLM line |
| source | string? | SHORTAGE \| MRP \| MANUAL |
| status | string? | Usually PENDING_APPROVAL |

## Triggers

- `inv.stock.out.v1` → `source: SHORTAGE`
- `plm.bom.released.v2` → `source: MRP`
