# mes.workorder.completed.v1

**Status:** Planned  
**Emitowany przez:** mes-service  
**Konsumenci:** inv-service, quality-service, pm-service, finance-service

---

## Opis Biznesowy

Zakończenie operacji produkcyjnej / zlecenia produkcyjnego. Kluczowy event dla traceability "as-built".

---

## Payload (propozycja)

```json
{
  "workOrderId": "uuid",
  "orderNumber": "string",
  "productItemId": "uuid",
  "quantityProduced": "number",
  "quantityScrap": "number",
  "completedAt": "ISO",
  "operatorIds": ["uuid"],
  "materialsConsumed": [
    { "itemId": "...", "lotId": "...", "quantity": "..." }
  ],
  "asBuiltBomSnapshot": "..." // referencja lub hash
}
```

---

## Znaczenie dla Traceability

Ten event jest jednym z najważniejszych dla pełnej genealogii maszyny (forward + backward traceability).

---

**Priorytet:** Bardzo wysoki w Fazie 1 (MES deep work)
