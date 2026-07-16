# ADR-007: Contract Testing Scope (Faza 4)

**Status:** Accepted  
**Data:** 2026-06-04

## Kontekst

Monorepo ma wiele BC połączonych eventami NATS. Potrzebujemy szybkiej regresji kontraktów bez pełnego Pact w pierwszej iteracji.

## Decyzja

1. **Warstwa 1 (obowiązkowa w PR):** Jest contract tests w `test/*.contract.spec.ts` + skrypty `smoke:eto`, `smoke:faza3`.
2. **Warstwa 2 (planowana):** Pact dla spine (`plm.bom.released.v2`, `inv.stock.out.v1`, `proc.purchaseorder.approved.v1`).
3. **Źródło prawdy payloadów:** `docs/EVENTS/*.md` + typy `@erp/shared-kernel`.

## Konsekwencje

- Nowy event wymaga wpisu w REGISTRY + typ w shared-kernel + test kontraktu lub smoke.
- Live E2E (`smoke:faza3:live`) opcjonalny — SKIP gdy brak infrastruktury.
