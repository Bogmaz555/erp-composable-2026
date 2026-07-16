# inv.stock.out.v1

**Producer:** `inv-service` (Outbox → NATS relay)  
**Consumers:** `proc-service` (`InvIntegrationController`)

## Payload

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| itemId | string | yes | SKU or internal item reference |
| sku | string | yes | Material SKU for procurement |
| missingQuantity | number | yes | Units short |
| projectId | string | yes | ETO project |
| wbsElementId | string | yes | PM WBS / task |
| taskId | string | no | Alias of wbsElementId |
| bomComponentId | string | no | PLM traceability (ADR-006) |
| tenantId | string | no | Default `default` |

## Behavior

Emitted when reservation cannot be fully satisfied (SHORTAGE), when SKU is unknown, or when no `StockLevel` exists. Procurement creates `PurchaseOrder` with `source: SHORTAGE`.

## Related

- `inventory.reservation.created.v1` — successful reservation path
- `proc.purchaseorder.created.v1` — downstream PO creation
