# finance.payment.milestone.reached.v1

**Status:** Active (Faza 2 — SILENT-62)  
**Emitowany przez:** pm-service (Outbox po `ReachProjectMilestoneCommand`)  
**Konsumenci:** finance-service (MilestoneBilling), tax-legal (KSeF)

---

## Opis

Osiągnięcie kamienia milowego płatności (np. FAT, SAT, przedpłata). Trigger do wystawienia faktury przez TaxLegalPBC.

---

## Znaczenie

Jeden z kluczowych eventów integrujących sprzedaż/projekt z fakturowaniem i KSeF.
