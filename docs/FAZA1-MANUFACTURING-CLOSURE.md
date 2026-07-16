# FAZA 1 – Manufacturing Core — CLOSURE (Pilot Ready)

**Data:** 2026-06-04  
**Status:** Zamknięcie na poziomie pilotażu / demo sprzedażowe ETO  
**Checkpoint:** SILENT-60 + SILENT-61

---

## Kryteria spełnione (≥85% Closure Checklist)

### Traceability spine
- `bomComponentId` end-to-end (PLM → PM → MES → INV → Finance)
- ADR-006 zaakceptowany
- Genealogy API (forward/backward) + zapis przy produkcji

### Integracje event-driven
- Aktywne: `plm.bom.released.v2`, `pm.material.requested.v1`, `mes.production.recorded.v1`, `inventory.reservation.*`
- PM: `@EventPattern` na BOM release (nie tylko HTTP)
- Outbox na write paths

### Auth (TD-001 fundament)
- JWT guards na krytycznych ścieżkach Manufacturing
- Claim propagation w NATS
- Keycloak dev w docker-compose + `USE_KEYCLOAK_JWKS` w gateway
- `scripts/get-keycloak-token.sh`

### Finance ETO costing
- MATERIAL: `ProjectCost` + `WipAccount` na `inventory.reservation.released.v1`
- LABOR + OVERHEAD: na `mes.production.recorded.v1` (`laborHours` × stawka + 15% overhead)

### Testy
- Unit/integration na spine (MES, INV, PLM, Finance)
- Contract chain: `test/eto-spine-chain.contract.spec.ts`
- Smoke: `scripts/eto-chain-smoke.ts`

---

## Świadomie poza zakresem Fazy 1 (→ Faza 2+)

- Formal Pact w CI
- Pełny Saga orchestrator (Temporal)
- Pełny docker E2E jednym przyciskiem (wymaga uruchomionych serwisów)
- TaxLegal / KSeF
- Frontend genealogy UI
- mTLS, centralny audit log

---

## Jak uruchomić pilotaż

```bash
./scripts/docker-eto-smoke.sh
export USE_KEYCLOAK_JWKS=true
./scripts/get-keycloak-token.sh   # JWT do testów gateway
npx tsx scripts/eto-chain-smoke.ts
pnpm run boot:all                 # serwisy dev
```

---

## Następna faza

**Faza 2:** Finance deep + TaxLegalPBC (KSeF) — patrz `MASTER-PLAN.md`

**Właściciel:** erp-orchestrator
