# Faza 4 — Quality, EAM & Hardening (szkic)

**Status:** Pilotaż zamknięty (~45% M01) — [FAZA4-CLOSURE.md](./FAZA4-CLOSURE.md)  
**Priorytet:** Medium

---

## Cele

1. Quality NCR pełny tor (raise → disposition → close)
2. EAM preventive maintenance + breakdown z IoT stub
3. Kontrakty Pact w CI dla spine + procurement
4. Keycloak RBAC end-to-end (nie tylko gateway)

---

## Zależności

- Faza 1–3 event registry stabilny
- `boot:all` + docker smoke jako gate PR

---

## Zrealizowane (SILENT-73)

- [x] `quality.ncr.raised.v1` / `closed.v1` + Outbox relay
- [x] PM integration (fever zone, WBS QUALITY_HOLD)
- [x] Gateway fix `/api/quality`
- [x] UI: zamknij NCR (CAPA)
- [x] ADR-007 Contract Testing Scope
- [x] `npm run smoke:faza4`, `test:contracts` + faza4

## Kolejka

- [x] EAM `eam.maintenance.scheduled.v1` + breakdown stub (SILENT-74)
- [x] PM/MES listeners na `eam.breakdown.detected.v1` (SILENT-75)
- [x] `ci:contracts`, `docker:faza4`, `FAZA4-CLOSURE.md`
- [ ] Pact broker (warstwa 2 ADR-007)
- [ ] Keycloak RBAC w CI
