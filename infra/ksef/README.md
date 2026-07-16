# KSeF 2.0 — konfiguracja (TaxLegalPBC)

**Moduł:** `apps/tax-legal` (jedyny dozwolony tor faktur — ADR-004)

## Zmienne środowiskowe

| Zmienna | Opis |
|---------|------|
| `KSEF_SANDBOX_URL` | URL API sandbox (opcjonalnie; bez niego mock) |
| `TAX_LEGAL_DATABASE_URL` | PostgreSQL tax_legal_db (docker: port 5442) |
| `NATS_URL` | `nats://localhost:4222` |

## Przepływ

1. PM: `POST /projects/:id/milestones/FAT/reach`
2. Finance: `finance.payment.milestone.reached.v1`
3. TaxLegal: faktura → `tax.invoice.ksef.sent.v1`
4. Finance: revenue recognition → `finance.revenue.recognized.v1`

## Dev bez certyfikatów

Domyślnie `KsefSandboxService` generuje referencję `KSEF-SBX-...` (mock).

Produkcja: certyfikat + token z Ministerstwa Finansów (poza zakresem POC).
