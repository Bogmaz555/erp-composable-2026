# plm.bom.released.v2

**Status:** Active (Faza 1)  
**Emitowany przez:** plm-service  
**Konsumenci:** pm-service, mes-service, inv-service, proc-service

---

## Opis

Oficjalne wydanie wersji BOM do użycia w projekcie i produkcji. Po tym evencie zmiany wymagają ECO.

Wersja v2 wprowadza pełne drzewo komponentów w payloadzie (dla łatwej konsumpcji bez dodatkowych zapytań).

---

## Payload (v2)

```json
{
  "bomVersionId": "uuid",
  "itemId": "uuid",
  "revision": "string",
  "effectivityFrom": "date?",
  "effectivityTo": "date?",
  "components": [
    {
      "childItemId": "uuid",
      "childPartNumber": "string",
      "quantity": "number",
      "position": "number?",
      "effectivityFrom": "..."
    }
  ],
  "releasedAt": "ISO",
  "releasedBy": "string"
}
```

---

## Ważne dla Traceability

Ten event jest punktem startowym dla "as-designed" wersji maszyny.
