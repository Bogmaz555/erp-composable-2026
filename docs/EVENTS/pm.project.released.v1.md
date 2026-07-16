# pm.project.released.v1

**Status:** Planned (wysoki priorytet Faza 1)  
**Emitowany przez:** pm-service  
**Konsumenci:** mes-service, inv-service, proc-service, finance-service

---

## Opis Biznesowy

Moment "zamrożenia" projektu i przekazania go do realizacji produkcyjnej. Po tym evencie BOM powinien być zablokowany do zmian bez ECO, a magazyn i zakupy powinny zacząć rezerwować materiały.

---

## Payload (propozycja v1)

```json
{
  "projectId": "uuid",
  "opportunityId": "uuid?",
  "name": "string",
  "totalBudget": "number",
  "currency": "string",
  "releaseDate": "ISO",
  "targetDeliveryDate": "ISO?",
  "ccpmBufferPct": "number",
  "keyMilestones": [ ... ]
}
```

---

## Krytyczne Konsekwencje

- PLM: Freeze aktualnej wersji BOM dla tego projektu
- MES: Możliwość generowania Work Orders
- Inventory: Rezerwacje materiałów pod projekt
- Procurement: Uruchomienie MRP / zamówień

---

## Compensation

Wycofanie release powinno być bardzo trudne (wymaga silnego ECO lub specjalnego procesu).

---

**Źródło:** Analiza istniejącego kodu PM + najlepsze praktyki ETO/CCPM
