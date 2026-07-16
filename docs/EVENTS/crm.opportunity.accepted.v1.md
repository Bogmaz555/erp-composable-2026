# crm.opportunity.accepted.v1

**Status:** Active  
**Wprowadzony:** Przed Faza 0 (istniejący w kodzie)  
**Emitowany przez:** crm-service  
**Konsumenci (aktualni/planowani):** pm-service, finance-service, tax-legal, analytics

---

## Opis Biznesowy

Moment, w którym szansa sprzedaży przechodzi w stan `ACCEPTED`. Jest to kluczowy event w całym systemie ETO — wyzwala stworzenie projektu, rezerwacje, planowanie, a później fakturowanie milestone'owe.

---

## Payload (v1)

```json
{
  "eventId": "uuid",
  "eventType": "crm.opportunity.accepted.v1",
  "timestamp": "2026-04-...Z",
  "payload": {
    "opportunityId": "string (uuid)",
    "customerId": "string (uuid)",
    "customerNip": "string?",
    "title": "string",
    "estimatedValue": "number",
    "currency": "PLN | EUR | USD",
    "linkedProjectId": "string (uuid)?",
    "paymentMilestones": [
      {
        "phase": "string",
        "percentage": "number",
        "days": "number"
      }
    ],
    "marginCoefficient": "number",
    "leadTimeWeeks": "number",
    "acceptedAt": "ISO date"
  }
}
```

---

## Reguły Emisji

- Emitowany wyłącznie po przejściu statusu Opportunity na `ACCEPTED`
- Zawsze idzie przez Outbox (at-least-once)
- Zawiera pełny snapshot potrzebny konsumentom (nie wymaga dodatkowego zapytania do CRM)

---

## Konsumenci i Oczekiwane Zachowanie

| Konsument     | Reakcja                                      | Compensation |
|---------------|----------------------------------------------|--------------|
| pm-service    | Utworzenie Project + WBS z milestone'ami    | Usunięcie projektu przy błędzie |
| finance       | Utworzenie struktur kosztowych projektu     | - |
| tax-legal     | Przygotowanie szablonu faktur milestone'owych | - |

---

## Uwagi

- Event jest już częściowo zaimplementowany w `crm-service` (outbox-relay).
- W Faza 1 należy go sformalizować i dodać pełne contract tests.
- Prawdopodobnie będzie wymagał wersji v2 przy dodaniu więcej danych konfiguracyjnych z CPQ.

---

**Źródło:** Analiza istniejącego kodu + best practices ETO
