# FAZA 8 — DATA TRUST — FINAL CLOSURE

**Data:** 2026-06-07 | Warstwy W59–W62 (pewność danych + import preview)

---

## Gate (do uruchomienia lokalnie)

```bash
pnpm run pipeline:faza8-final
```

| Metryka | Oczekiwany wynik |
|---------|------------------|
| Contract tests | **49/49** (+5 nowych) |
| Regression | **71/71** |
| Smokes | data-integrity + import — PASS |

---

## Warstwy

| Warstwa | Deliverables |
|---------|--------------|
| **W59** | Usunięcie mocków Finance (WIP/milestones), `GET /projects/:id/cost-summary` (live BI), `/platform/data-integrity/readiness` |
| **W60** | `POST /import/products/preview`, `/platform/import/readiness` |
| **W62 FINAL** | `pipeline:faza8-final`, frontend analytics → live API |

---

## Kluczowe zmiany

- Finance: puste tabele → `[]` zamiast `proj-demo` / demo milestones
- Frontend `getProjectAnalytics()` → gateway `/api/analytics/projects/:id/cost-summary`
- Import CSV: preview bez zapisu + walidacja wierszy

---

## Następny krok (Faza 9)

- Auth wymuszony w CI (`AUTH_ENFORCE=true`)
- Import Hub staging + rollback
- Walidacja class-validator na POST/PATCH
