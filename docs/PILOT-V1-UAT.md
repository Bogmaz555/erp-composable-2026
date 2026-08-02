# Pilot v1 UAT Protocol

**Date:** 2026-08-02  
**Tag target:** `pilot-v1.1.0` (COMPLETE)  
**Decision: GO** (full — not conditional)

## Automated API UAT (Playwright request context)

`e2e/pilot-eto-complete.spec.ts` — **12/12 passed** (2026-08-02).

| # | Scenario | Result |
|---|----------|--------|
| 1 | Gateway health public | PASS |
| 2 | PM without token 401 | PASS |
| 3 | Analytics platform without token 401 | PASS |
| 4 | Engineer JWT PM not 401 | PASS |
| 5 | Engineer analytics not 401 | PASS |
| 6 | INV with token not 401 | PASS |
| 7 | PLM with token not 401 | PASS |
| 8 | MES health | PASS |
| 9 | Finance health (direct) | PASS |
| 10 | Mutation deny for write | PASS |
| 11 | Analytics health public | PASS |
| 12 | Gateway health under auth stack | PASS |

## Live hard gates (K1)

| Gate | Result |
|------|--------|
| smoke-saga reverse idempotent | PASS |
| smoke-outbox-live-hard PROCESSED | PASS |
| REQUIRE_LIVE=1 smoke:pilot | PASS |

## DR live (K3)

| Gate | Result |
|------|--------|
| COMPOSE_PROJECT_NAME=erp-pilot-dr DR_DRILL_DRY_RUN=0 | PASS (~13s RTO, target 2h MET) |

## Sign-off
**GO** for single-tenant pilot COMPLETE release 1.1.0.
