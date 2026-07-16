# finance.revenue.recognized.v1

**Status:** Active (Faza 2 — SILENT-66)  
**Emitowany przez:** finance-service (po `tax.invoice.ksef.sent.v1`)  
**Konsumenci:** crm-service, analytics (planned)

---

## Opis

Uznanie przychodu z tytułu kamienia milowego (FAT/SAT) po potwierdzeniu faktury w KSeF. Zamyka tor: milestone → faktura → przychód w księdze projektowej.

---

## Payload

```json
{
  "projectId": "uuid",
  "milestone": "FAT",
  "amount": 500000,
  "currency": "PLN",
  "ksefReferenceNumber": "KSEF-SBX-...",
  "recognizedAt": "ISO-8601",
  "tenantId": "default"
}
```
