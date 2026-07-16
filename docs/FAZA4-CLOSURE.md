# FAZA 4 – Quality & EAM — CLOSURE (Pilot Ready)

**Data:** 2026-06-04  
**Status:** Zamknięcie pilotażu (~45% FAZA4-M01)  
**Checkpoint:** SILENT-73 … SILENT-75

---

## Kryteria spełnione

### Quality (QMS)
- NCR raise/close z Outbox → NATS
- PM: fever zone + WBS `QUALITY_HOLD` / GREEN on close
- Auto-inspekcja: `proc.material.received.v1`, `mes.workorder.completed.v1`
- UI `/quality` + gateway `/api/quality`

### EAM
- `eam.maintenance.scheduled.v1` przy planowaniu PM
- `eam.breakdown.detected.v1` — IoT stub `POST /api/eam/breakdown`
- PM: fever RED na breakdown (z projectId)
- MES: WO → `ON_HOLD` na breakdown

### Hardening
- ADR-007 contract testing scope
- `npm run test:contracts`, `smoke:faza4`
- `scripts/ci-contract-gate.sh`

---

## Poza zakresem pilotażu

- Pact broker w CI
- Keycloak RBAC na wszystkich trasach
- Pełny CAPA workflow z dokumentami

---

## Uruchomienie

```bash
npm run smoke:faza4
npm run test:contracts
npm run ci:contracts
npm run docker:faza4
npm run boot:all
```
