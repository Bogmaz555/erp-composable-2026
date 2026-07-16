# FAZA 3 – Procurement & MRP — CLOSURE (Pilot Ready)

**Data:** 2026-06-04  
**Status:** Zamknięcie pilotażu (~72% FAZA3-M01)  
**Checkpoint:** SILENT-70 … SILENT-72

---

## Kryteria spełnione

### Automatyzacja PO
- MRP: `plm.bom.released.v2` → PO `source: MRP`
- Shortage: `inv.stock.out.v1` → PO `source: SHORTAGE` + `bomComponentId`
- INV Outbox relay + PROC Outbox relay

### Workflow operacyjny
- UI `/proc`: lista, approve/reject, przyjęcie magazynowe
- Gateway `/api/proc`
- PM: WBS `PROCUREMENT_APPROVED` po approve
- Finance: `ProjectCost` MATERIAL + zobowiązanie `201-AP` na `proc.purchaseorder.approved.v1`
- INV: stock RECEIPT na `proc.material.received.v1`

### Testy / smoke
- `npm run smoke:faza3` — kontrakt łańcucha (PASSED)
- `npm run smoke:proc`
- `npx tsx scripts/faza3-live-nats-e2e.ts` — live (SKIP jeśli brak NATS/PROC)
- `test/faza3-proc-chain.contract.spec.ts`

---

## Świadomie poza zakresem (→ kolejna fala)

- Deterministyczny live E2E w CI (wymaga docker compose + boot:all)
- Prawdziwe ceny materiałów z PLM/ERP master (nie stała 50 PLN/szt)
- Usunięcie wszystkich legacy eventów (`inventory.stock_depleted`, `procurement.order.approved`)

---

## Uruchomienie

```bash
npm run smoke:faza3
npm run docker:faza3
npm run boot:all
npx tsx scripts/faza3-live-nats-e2e.ts
```

---

## Następna faza (szkic)

Faza 4: Quality + EAM hardening, formalne testy kontraktowe Pact, pełny Keycloak RBAC w CI.
