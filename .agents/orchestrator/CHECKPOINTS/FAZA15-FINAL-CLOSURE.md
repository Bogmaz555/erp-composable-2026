# FAZA 15 — GRAFANA & CI HARDENING — FINAL CLOSURE

**Data:** 2026-06-07 | Warstwy W87–W90

---

## Gate końcowy

| Metryka | Wynik |
|---------|-------|
| Contract tests | **78/78** |
| Regression | **90/90** @ 100% |
| Smokes | grafana-bi + playwright-required + ci-auth-keycloak — **PASS** |
| CI probes | `CI_PLAYWRIGHT_REQUIRED` + `CI_AUTH_ENFORCE_KEYCLOAK` — **PASS** |
| Pipeline | `pnpm run pipeline:faza15-final` — PASS |

---

## Warstwy

| Warstwa | Deliverables |
|---------|--------------|
| **W87** | Grafana dashboard JSON `infra/grafana/dashboards/bi-snapshot-metrics.json`; `GET bi/metrics/grafana/dashboard`; `/platform/grafana-bi/readiness` |
| **W88** | `ci-playwright-required-probe.ts`; job `playwright-pm-bi-required` bez `continue-on-error`; `/platform/playwright-required/readiness` |
| **W89** | `ci-auth-keycloak-regression-probe.ts`; Keycloak wiring w CI; `/platform/ci-auth-keycloak/readiness` |
| **W90 FINAL** | Aggregate pipeline Faza 14+15 |

---

## Następny krok (Faza 16)

- Grafana provisioning live (docker-compose + scrape config)
- Playwright full matrix (finance + pm + inv modules)
- AUTH_ENFORCE=true prod profile bez continue-on-error na auth-enforce-live
