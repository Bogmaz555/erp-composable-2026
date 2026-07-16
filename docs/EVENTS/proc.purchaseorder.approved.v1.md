# proc.purchaseorder.approved.v1

**Producer:** `proc-service` (Outbox relay)  
**Consumers:** `pm-service` (`ProcIntegrationController`)

## Payload

| Field | Type | Description |
|-------|------|-------------|
| orderId | string | PO id |
| sku | string | Material SKU |
| quantity | number | Ordered amount |
| projectId | string? | ETO project |
| bomComponentId | string? | PLM line |
| taskId | string? | WBS element id (from shortage path) |
| source | string? | SHORTAGE \| MRP \| MANUAL |
| approvedBy | string? | Approver identity |

## PM side effect

Updates matching `WbsElement` status to `PROCUREMENT_APPROVED`.
