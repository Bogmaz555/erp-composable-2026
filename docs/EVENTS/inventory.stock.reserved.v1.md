# inventory.stock.reserved.v1

**Status:** Planned  
**Emitowany przez:** inv-service  
**Konsumenci:** pm-service, mes-service, proc-service

---

## Opis

Rezerwacja materiału na konkretny projekt / zlecenie produkcyjne. Podstawowy mechanizm alokacji w środowisku ETO.

---

## Payload

```json
{
  "reservationId": "uuid",
  "projectId": "uuid",
  "itemId": "uuid",
  "lotId": "uuid?",
  "quantity": "number",
  "reservedUntil": "ISO?",
  "reservedBy": "string (system lub user)"
}
```

---

## Ważne

Rezerwacje są kluczowe dla unikania konfliktów materiałowych przy wielu równoległych projektach maszynowych.
