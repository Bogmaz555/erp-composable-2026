# proc.material.received.v1

**Producer:** `proc-service` (`PATCH /orders/:id/receive` → Outbox relay)  
**Consumers:** `inv-service` (`ProcIntegrationController`)

## Payload

| Field | Type | Description |
|-------|------|-------------|
| purchaseOrderId | string | PO id |
| sku | string | Material SKU |
| quantity | number | Received units |
| projectId | string? | ETO project |
| bomComponentId | string? | PLM line |
| receivedAt | string? | ISO timestamp |
| receivedBy | string? | Operator |

## INV side effect

Increases `StockLevel` for SKU, appends immutable `StockTransaction` type `RECEIPT`.
