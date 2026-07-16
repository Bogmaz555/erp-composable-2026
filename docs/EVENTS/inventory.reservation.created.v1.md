# inventory.reservation.created.v1

**Status:** Active (Faza 1)  
**Emitowany przez:** inv-service  
**Konsumenci:** mes-service (material planning), finance-service (WIP/reserve costing), pm-service (project material status), proc-service (MRP trigger)

---

## Opis

Reservation of stock for a specific project / WorkOrder / BOM component. This is the key event that locks material for a particular ETO machine build (prevents double allocation).

Created automatically on plm.bom.released.v2 consumption (when projectId known) or via explicit material planning from PM/MES.

---

## Payload (v1)

```json
{
  "reservationId": "uuid",
  "tenantId": "string",
  "projectId": "uuid?",
  "workOrderId": "uuid?",
  "bomComponentId": "uuid?",
  "itemId": "uuid",
  "lotId": "uuid?",
  "quantity": "number",
  "status": "ACTIVE",
  "createdAt": "ISO",
  "createdBy": "string"
}
```

---

## Ważne dla Traceability (ETO)

- bomComponentId provides direct link back to the exact line in the released Engineering BOM.
- Combined with StockTransaction + Lot/Serial + later AsBuiltComponent → complete as-designed → as-reserved → as-consumed → as-built chain for one machine.
- Compensation: on production complete or WO cancel → inventory.reservation.released.v1 (or updated status).

---

## Compensation / Saga

- On WO cancel or ECO superseding the BOM version → release reservations (update status + create RELEASE transaction).
