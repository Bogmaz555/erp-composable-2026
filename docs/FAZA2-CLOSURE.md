# FAZA 2 – Finance & TaxLegal — CLOSURE (Pilot Ready)

**Data:** 2026-06-04  
**Status:** Zamknięcie pilotażu (~85% FAZA2-M01)  
**Checkpoint:** SILENT-64 … SILENT-67

---

## Kryteria spełnione

### Milestone billing (ETO)
- PM: `POST /projects/:id/milestones/:milestone/reach` → outbox `finance.payment.milestone.reached.v1`
- Finance: `MilestoneBilling`, `CostRate`, integracja HR labor
- CRM: sync `paymentMilestones` (READY / INVOICED) z Finance + KSeF
- Frontend: zakładka Milestone w `/finance`, FAT/SAT w PM, badge w CPQ

### TaxLegal (ADR-004)
- Serwis `tax-legal` izolowany; mock KSeF → `tax.invoice.ksef.sent.v1`
- `scripts/check-adr004-tax-isolation.sh` (PASSED)
- Gateway: `/api/tax-legal`

### Revenue recognition
- Po KSeF: `RevenueRecognition`, journal CREDIT, `finance.revenue.recognized.v1`
- CRM listener na revenue recognized
- `scripts/faza2-revenue-smoke.ts` (PASSED)

### HR → Finance
- `hr.time.entry.recorded.v1` → koszt LABOR w Finance

### INV → Procurement (Faza 3 bridge)
- Kanoniczny `inv.stock.out.v1` (Outbox + relay w inv-service)
- PROC auto PO `source: SHORTAGE` z `bomComponentId`
- `scripts/proc-shortage-smoke.ts`

---

## Świadomie poza zakresem Fazy 2

- Produkcja KSeF (prawdziwy sandbox MF)
- Pełny docker E2E wszystkich serwisów jednym skryptem
- Formal Pact w CI
- Pełny workflow zatwierdzania PO w UI (approve/reject przez gateway)

---

## Jak uruchomić

```bash
npm run check:adr004
npm run smoke:faza2
npm run smoke:revenue
npx tsx scripts/proc-shortage-smoke.ts
npm run boot:all   # gateway + PM + PROC + CRM + INV + FIN + HR + TAX + frontend
```

---

## Następny krok: Faza 3 Procurement/MRP

- PLM BOM → MRP draft PO (`plm.bom.released.v2`)
- INV shortage → auto PO (`inv.stock.out.v1`)
- Misja: `.agents/orchestrator/MISSIONS/FAZA3-M01-Procurement-MRP.md`
