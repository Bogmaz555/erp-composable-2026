# Faza 2 — Finance + Polish Compliance

**Status:** W toku (~80% FAZA2-M01 po SILENT-66)  
**Poprzednia faza:** [FAZA1-MANUFACTURING-CLOSURE.md](./FAZA1-MANUFACTURING-CLOSURE.md)

---

## Cele

1. Rozliczenia projektów ETO (WIP, labor, milestone FAT/SAT)
2. TaxLegalPBC jako jedyny tor faktur (KSeF)
3. Spójność CRM ↔ PM ↔ Finance

---

## Zrealizowane (SILENT-62–64)

- Milestone API (PM reach FAT/SAT)
- Finance `MilestoneBilling` + CostRate + HR labor
- TaxLegal KSeF mock + `tax.invoice.ksef.sent.v1`
- CRM sync `paymentMilestones` na eventach Finance/Tax
- Frontend: zakładka Milestone w Finanse, panel FAT/SAT w szczegółach projektu
- Gateway proxy HR/Tax, ADR-004 guard

---

## Kolejka

- [x] Revenue recognition po KSeF (SILENT-66)
- [x] Procurement MRP light start (SILENT-66 → Faza 3)
- Prawdziwy KSeF sandbox (certyfikaty produkcyjne)
- `FAZA2-CLOSURE.md` przy ~85% M01
