# FAZA 14 — METRICS & CI REGRESSION — FINAL CLOSURE

**Data:** 2026-06-07 | Warstwy W83–W86

---

## Gate końcowy

| Metryka | Wynik |
|---------|-------|
| Contract tests | **74/74** |
| Regression | **87/87** @ 100% |
| Smokes | bi-metrics + playwright-stack + ci-auth-regression + bi-retention — **PASS** |
| CI probes | `CI_PLAYWRIGHT_STACK` + `CI_AUTH_ENFORCE_REGRESSION` — **PASS** |
| Pipeline | `pnpm run pipeline:faza14-final` — PASS |

---

## Warstwy

| Warstwa | Deliverables |
|---------|--------------|
| **W83** | `GET bi/metrics/retention` + Prometheus text; `/platform/bi-metrics/readiness` |
| **W84** | `ci-playwright-stack-boot.sh` + probe; job `playwright-pm-bi-required`; `/platform/playwright-stack/readiness` |
| **W85** | `ci-auth-enforce-regression-probe.ts`; regression job wiring; `/platform/ci-auth-regression/readiness` |
| **W86 FINAL** | Aggregate pipeline Faza 13+14 |

---

## Następny krok (Faza 15)

- Grafana dashboard dla `erp_bi_snapshot_*` metrics
- Playwright PM BI required (non-continue-on-error) z pełnym stackiem
- AUTH_ENFORCE=true mandatory regression w CI z Keycloak live
