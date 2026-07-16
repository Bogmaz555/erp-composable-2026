# Standard: Event Versioning and Schema Management

**Wersja:** 1.0  
**Obowiązuje od:** Faza 0

---

## Zasada Podstawowa

**Każdy event jest wersjonowany i nigdy nie jest zmieniany w sposób niekompatybilny wstecz.**

Zmiana = nowa wersja eventu (`v1` → `v2`).

---

## Konwencja Nazewnictwa

```
{bounded-context}.{aggregate}.{action}.{version}
```

Przykłady:
- `crm.opportunity.accepted.v1`
- `pm.project.released.v1`
- `inventory.stock.reserved.v2`
- `mes.workorder.completed.v1`

---

## Reguły Zmian

| Typ zmiany                  | Akcja                          | Przykład |
|----------------------------|--------------------------------|----------|
| Dodanie pola (opcjonalne)  | Można w tej samej wersji       | `v1` → nadal `v1` |
| Dodanie pola (wymagane)    | Nowa wersja (`v2`)             | `v2` |
| Zmiana typu pola           | Nowa wersja + migracja         | `v2` |
| Usunięcie pola             | Nowa wersja + migracja         | `v2` |
| Zmiana semantyki           | Zawsze nowa wersja             | `v2` |

---

## Struktura Pliku Eventu (w `docs/EVENTS/`)

Każdy event ma plik markdown:

```markdown
# crm.opportunity.accepted.v1

**Status:** Active
**Wprowadzony:** Faza 0
**Emitowany przez:** crm-service
**Konsumenci:** pm-service, finance-service, tax-legal

## Payload

```json
{
  "opportunityId": "uuid",
  "projectId": "uuid?",
  "customerId": "uuid",
  "estimatedValue": 125000,
  "currency": "PLN",
  "acceptedAt": "2026-..."
}
```

## Compensation

W przypadku niepowodzenia po stronie konsumenta...

## Uwagi
```

---

## Wdrożenie Techniczne (zalecane)

- Każdy event publikowany przez Outbox ma pole `eventType` zawierające pełną nazwę z wersją.
- Konsument musi obsługiwać nieznane wersje gracefully (ignorować lub kierować do DLQ).
- W shared-kernel trzymamy TypeScript interface dla każdej wersji.

---

## Egzekucja

- `erp-architect` odpowiada za projektowanie eventów
- `erp-guardian` blokuje publikację eventu bez pliku w `docs/EVENTS/`
- `erp-reviewer` sprawdza versioning przy code review

Naruszenie tego standardu = jeden z najpoważniejszych błędów w projekcie.
