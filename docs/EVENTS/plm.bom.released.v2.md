# plm.bom.released.v2

**Status:** Active (Faza 1 / Enterprise Q1)  
**Emitowany przez:** plm-service  
**Konsumenci:** pm-service, mes-service, inv-service, proc-service

---

## Opis

Oficjalne wydanie wersji BOM do użycia w projekcie i produkcji. Po tym evencie zmiany wymagają ECO.

Wersja v2 wprowadza pełne drzewo komponentów w payloadzie (dla łatwej konsumpcji bez dodatkowych zapytań).

`bomComponentId` jest **wymagany** na każdej linii (ADR-006).

---

## Payload (v2)

```json
{
  "bomVersionId": "uuid",
  "itemId": "uuid",
  "revision": "string",
  "projectId": "uuid?",
  "tenantId": "string?",
  "correlationId": "uuid?",
  "effectivityFrom": "date?",
  "effectivityTo": "date?",
  "components": [
    {
      "bomComponentId": "uuid",
      "childItemId": "uuid",
      "childPartNumber": "string",
      "quantity": "number",
      "position": "number?",
      "scrapFactor": "number?",
      "bomLevel": "number?",
      "level": "number?",
      "parentBomComponentId": "uuid?",
      "isSubAssembly": "boolean?",
      "subBomVersionId": "uuid?",
      "makeBuy": "BUY|MAKE|PHANTOM?",
      "effectivityFrom": "...",
      "effectivityTo": "..."
    }
  ],
  "releasedAt": "ISO",
  "releasedBy": "string"
}
```

TypeScript: `PlmBomReleasedV2Event` in `@erp/shared-kernel`.  
Runtime validation: `assertValidEventPayload('plm.bom.released.v2', …)` under `ENTERPRISE=1`.

---

## Ważne dla Traceability

Ten event jest punktem startowym dla "as-designed" wersji maszyny. Wszystkie BC mapują operacje na `bomComponentId`.
