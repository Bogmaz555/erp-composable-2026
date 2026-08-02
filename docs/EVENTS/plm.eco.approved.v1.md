# plm.eco.approved.v1

**Status:** Active (Enterprise Q1)  
**Emitowany przez:** plm-service  
**Konsumenci:** pm-service, mes-service (freeze / impact awareness)

---

## Opis

Zatwierdzenie Engineering Change Order. Emitowane wyłącznie z outbox w tej samej transakcji co status ECO → APPROVED. Nie mutuje peer BC przez HTTP.

---

## Payload

```json
{
  "ecoId": "uuid",
  "ecoNumber": "ECO-1234",
  "title": "string?",
  "affectedBomVersionIds": ["uuid"],
  "impactSummary": {},
  "approvedBy": "string",
  "approvedAt": "ISO",
  "tenantId": "string?",
  "supersedingBomVersionId": "uuid?"
}
```

TypeScript: `PlmEcoApprovedV1Event` in `@erp/shared-kernel`.
