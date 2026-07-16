# ADR-006: bomComponentId jako kręgosłup traceability ETO

**Status:** Accepted  
**Data:** 2026-06  
**Kontekst:** Faza 1 Manufacturing Core — domknięcie integracji PLM + PM + MES + INV + Finance

---

## Kontekst

Produkcja jednostkowa (ETO) wymaga śledzenia każdej linii BOM od oferty/inżynierii przez rezerwacje, produkcję, as-built aż po rozliczenie WIP. Wcześniejsze modele używały luźnych powiązań po `itemId`, co uniemożliwiało jednoznaczną genealogię przy wielu liniach tego samego materiału na jednej maszynie.

---

## Decyzja

1. **`bomComponentId`** (UUID linii `BomComponent` w PLM) jest **kanonicznym kluczem korelacji** w całym klastrze Manufacturing.
2. Event **`plm.bom.released.v2`** musi zawierać snapshot `components[]` z polem `bomComponentId` per linia (nie tylko `childItemId`).
3. Wszystkie BC konsumujące release BOM (PM, MES, INV) mapują operacje na ten sam identyfikator:
   - PM: `WbsElement` / `RequestMaterial` → outbox `pm.material.requested.v1`
   - INV: `Reservation.bomComponentId`, `StockTransaction`, `ItemGenealogy`
   - MES: `MaterialRequirement`, `MaterialConsumption`, `AsBuiltComponent`
   - Finance: `ProjectCost` / WIP relief z referencją do rezerwacji zawierającej `bomComponentId`
4. Propagacja tożsamości (**TD-001**): nagłówki NATS `x-user-id`, `x-roles` na ścieżkach release i production complete.

---

## Konsekwencje

**Pozytywne:**
- End-to-end audit jednej linii BOM na maszynie
- Możliwość contract tests i lekkiej sagi ETO (`EtoSagaStep` w shared-kernel)
- Genealogia forward/backward w INV oparta o stabilny klucz

**Negatywne:**
- Każda zmiana struktury BOM w PLM wymaga nowego release (v2), nie migracji „w miejscu” linii bez ECO
- Wszystkie nowe integracje Manufacturing muszą przyjmować `bomComponentId` w payloadzie

---

## Alternatywy odrzucone

- Korelacja tylko po `itemId` — odrzucone (niejednoznaczne przy duplikatach materiału)
- Osobny globalny TraceId bez powiązania z PLM — odrzucone (dodatkowa warstwa bez źródła prawdy inżynieryjnej)

---

**Powiązane:** ADR-002 (NATS+Outbox), ADR-003 (DB-per-service), `docs/FAZA1-MANUFACTURING-CLOSURE-CHECKLIST.md`
