# plm.eco.approved.v1

**Status:** Active (Enterprise Q1)  
**Emitowany przez:** plm-service  
**Konsumenci:** pm-service, mes-service, inv-service, proc-service (optional react)

---

## Opis

Engineering Change Order approved. Downstream must not be mutated via HTTP — consumers react to this event and/or the subsequent `plm.bom.released.v2` re-release.

---

## Payload

```json
{
  "ecoId": "uuid",
  "ecoNumber": "ECO-1234",
  "title": "string?",
  "affectedBomVersionIds": ["uuid"],
  "releasedBomVersionIds": ["uuid?"],
  "approvedBy": "string?",
  "approvedAt": "ISO",
  "correlationId": "uuid?",
  "tenantId": "string?"
}
```

---

## Contract

Validated by `apps/shared-kernel/src/events/validate.ts` (`validatePlmEcoApprovedV1`).
