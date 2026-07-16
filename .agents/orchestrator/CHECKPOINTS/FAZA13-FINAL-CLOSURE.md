# FAZA 13 — RETENTION & CI LIVE — FINAL CLOSURE

**Data:** 2026-06-07 | Warstwy W79–W82

---

## Gate końcowy

| Metryka | Wynik |
|---------|-------|
| Contract tests | **70/70** |
| Regression | **84/84** @ 100% |
| Smokes | bi-retention + playwright-ci + ci-auth-live + bi-scheduler — **PASS** |
| CI probes | `CI_PLAYWRIGHT_PM_BI` + `CI_AUTH_ENFORCE_LIVE` — **PASS** |
| Pipeline | `pnpm run pipeline:faza13-final` — PASS |

---

## Warstwy

| Warstwa | Deliverables |
|---------|--------------|
| **W79** | BI snapshot TTL purge (`BI_SNAPSHOT_TTL_HOURS`); `POST bi/snapshots/purge`; `/platform/bi-retention/readiness` |
| **W80** | `ci-playwright-pm-bi-probe.ts`; GitHub Playwright PM BI job; `/platform/playwright-ci/readiness` |
| **W81** | `ci-auth-enforce-live-probe.ts`; GitHub `auth-enforce-live` job; `/platform/ci-auth-live/readiness` |
| **W82 FINAL** | Aggregate pipeline Faza 12+13 |

---

## Następny krok (Faza 14)

- Playwright PM BI jako required job (stack w CI)
- Snapshot retention metrics / Prometheus
- Full `AUTH_ENFORCE=true` gateway w CI regression
