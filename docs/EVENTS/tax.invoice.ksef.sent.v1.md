# tax.invoice.ksef.sent.v1

**Status:** Active (Faza 2 — SILENT-62/63)  
**Emitowany przez:** tax-legal  
**Konsumenci:** finance-service, crm-service

---

## Opis

Potwierdzenie, że faktura (w tym faktura milestone'owa) została poprawnie wysłana i zaakceptowana przez KSeF.

Zgodnie z ADR-004 — tylko ten event powinien być traktowany jako "faktura wystawiona".

---

## Krytyczne

Ten event jest podstawą do uznania przychodu i zamknięcia milestone'u w projekcie.
