# Enterprise 2.1 P1 — Observability and SLO Design

| Field | Value |
|-------|-------|
| **Document** | P1 Observability + SLO |
| **Program** | Enterprise 2.1 |
| **Baseline** | `enterprise-2.1.p0-bootstrap` / `enterprise-2.0.0` |
| **Target tag** | `enterprise-2.1.p1-observability` |
| **Branch** | `enterprise-2.1-p1-observability` |
| **Status** | Ready for IMPLEMENT |
| **Date** | 2026-08-02 |
| **Tenancy** | **DEDICATED_STACK** |
| **Non-negotiables** | ADR-008, ENTERPRISE-2.1-PLAN |

---

## Overview

P0 made enterprise boot and health matrix operable. **P1** turns ops observability from **partial residual** into a **usable contract**: traces on core path, Prometheus scrapes, Grafana SLO views, burn/availability alerts, and an on-call runbook.

### Workstreams

1. OTel/traces on gateway + PM INV FIN MES  
2. Prometheus scrapes + Grafana SLO dashboards  
3. Burn-rate / availability alerts  
4. On-call runbook  

**Out of scope:** full APM vendor migration, multi-region tracing, domain feature work (P3), live DR (P2).

---

## Background (honest)

| Area | Today | Gap |
|------|-------|-----|
| OTel | `tracing.ts` on **api-gateway**, **pm**, **crm** (NodeSDK + OTLP http://localhost:4318) | **inv / finance / mes** lack consistent `tracing.ts` boot import |
| Prometheus | `infra/prometheus/prometheus.yml` scrapes analytics BI metrics mainly | No scrape jobs for gateway/pm/inv/fin/mes `/metrics` (if missing, add lightweight metrics or document scrape of health blackbox) |
| Grafana | dashboards `bi-snapshot-metrics.json`, `slo-error-budget.json` | Need enterprise core SLO dashboard tied to SLO-MATRIX |
| Alerts | `infra/prometheus/alerts/slo-burn-rate.yml`, `bi-retention.yml` | Gateway availability + error budget for core path |
| Docs | `docs/enterprise-2.0/SLO-MATRIX.md` (contract table) | Operational runbook for page → dashboard → fix |
| Analytics | `otel.controller.ts` status endpoint | Keep; do not expand readiness theater |

---

## Goals / Non-Goals

### Goals

- **Trace coverage:** gateway, pm, inv, finance, mes import OTel SDK at process start (same pattern as gateway)  
- **Scrape plan:** prometheus.yml jobs for services that export metrics; blackbox or health probe metrics for others  
- **Dashboard:** Grafana JSON for enterprise core SLI (availability, latency if available)  
- **Alerts:** gateway down / high error rate; reuse/extend slo-burn-rate  
- **Runbook:** `docs/enterprise-2.1/ONCALL-RUNBOOK.md`  

### Non-Goals

- 100% service mesh metrics  
- Replacing Jaeger/OTLP endpoint topology  
- Alertmanager paging integration to PagerDuty (document hook only)  

---

## Key Decisions

### KD-P1-1 — Shared tracing bootstrap pattern

**Decision:** Copy/adapt `apps/api-gateway/src/tracing.ts` pattern into inv/finance/mes (and ensure pm remains). Service name via `OTEL_SERVICE_NAME`. Fail open if OTLP unreachable (log, do not crash boot).  
**Alt rejected:** Single shared-kernel SDK module only (nice later; P1 favors copy-consistent files for speed).

### KD-P1-2 — Metrics honesty

**Decision:** Prefer real Prometheus metrics endpoints where cheap. Where no `/metrics`, scrape via **blackbox HTTP** on health paths or document residual in SLO-MATRIX update. No fake “100% instrumented” claims.

### KD-P1-3 — SLO targets remain pilot-enterprise hybrid

**Decision:** Keep targets from SLO-MATRIX (gateway 99.5% health, p95 budgets). Staging/prod can tighten later.

### KD-P1-4 — Alerts as YAML in repo

**Decision:** Alert rules live in `infra/prometheus/alerts/*.yml` loaded by existing `rule_files`.

### KD-P1-5 — On-call is documentation + links

**Decision:** Runbook lists dashboards, health-matrix, boot-enterprise, common failures — not a new paging product.

---

## Architecture (target)

```text
[services] --OTLP traces--> [Jaeger/collector :4318]
[services] --/metrics or health--> [Prometheus] --rules--> [Alertmanager]
                                      |
                                   [Grafana]
                                      |
                              on-call runbook links
```

Env (enterprise/staging/prod):

```bash
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318/v1/traces
OTEL_SERVICE_NAME=<service>
```

---

## Workstreams → map

| ID | Workstream | Surfaces |
|----|------------|----------|
| W1 | OTel on core | `apps/{inv,finance,mes}/src/tracing.ts` + `main.ts` import first |
| W2 | Prometheus scrapes | `infra/prometheus/prometheus.yml` |
| W3 | Grafana SLO | `infra/grafana/dashboards/enterprise-core-slo.json` |
| W4 | Alerts | `infra/prometheus/alerts/enterprise-core.yml` |
| W5 | Runbook + check | `docs/enterprise-2.1/ONCALL-RUNBOOK.md`, `check-p1-obs.sh` |

---

## Security

- No PII in span attributes beyond existing IDs  
- OTLP endpoints internal only  
- Alertmanager webhooks no secrets in git  

## Risks

| Risk | Mitigation |
|------|------------|
| OTLP down blocks boot | Fail open on export errors |
| No /metrics on Nest services | Health-based probes + residual note |
| Alert noise | Start with gateway + high severity only |

---

## Testing / Gates

```bash
pnpm run smoke:pilot
bash scripts/enterprise-2.1/check-p1-obs.sh
# structural: tracing files, prometheus jobs, dashboard, alerts, runbook
```

Optional: validate prometheus config with `promtool` if installed.

---

## PR Plan

### PR 1: OTel tracing bootstrap for inv + finance + mes

- **Dependencies:** none  
- **Files:**  
  - `apps/inv-service/src/tracing.ts`  
  - `apps/finance/src/tracing.ts`  
  - `apps/mes-service/src/tracing.ts`  
  - respective `main.ts` — `import './tracing'` first  
- **Description:** Match gateway NodeSDK + OTLP pattern; service names inv-service, finance, mes-service.

### PR 2: Prometheus scrape jobs for core path

- **Dependencies:** PR 1 (optional)  
- **Files:**  
  - `infra/prometheus/prometheus.yml`  
- **Description:** Add jobs for gateway/analytics health or metrics endpoints; document host.docker.internal vs k8s DNS.

### PR 3: Grafana enterprise-core-slo dashboard

- **Dependencies:** PR 2  
- **Files:**  
  - `infra/grafana/dashboards/enterprise-core-slo.json`  
  - optional provisioning entry  
- **Description:** Panels for gateway up, error rate placeholders, link to SLO-MATRIX targets.

### PR 4: Alert rules enterprise-core

- **Dependencies:** PR 2  
- **Files:**  
  - `infra/prometheus/alerts/enterprise-core.yml`  
- **Description:** GatewayHealthDown, optional SLO burn reuse; keep severity labels.

### PR 5: On-call runbook + check-p1-obs

- **Dependencies:** PR 1–4  
- **Files:**  
  - `docs/enterprise-2.1/ONCALL-RUNBOOK.md`  
  - `scripts/enterprise-2.1/check-p1-obs.sh`  
  - update `docs/enterprise-2.0/SLO-MATRIX.md` honesty line if needed  
- **Description:** Page → health-matrix → boot-enterprise → dashboards; structural gate.

---

## Implementation order

```text
PR1 ∥ PR2 → PR3 ∥ PR4 → PR5 → GATE → RELEASE
```

Serial: **1 → 2 → 3 → 4 → 5**.

---

## Success criteria

- Design + PR Plan (this file)  
- After IMPLEMENT: core services import tracing; prom/grafana/alerts/runbook present  
- Tag `enterprise-2.1.p1-observability`  
- 2.0 STATUS remains DONE  

---

## Self-review

- Workstreams map to PR Plan  
- Honest about partial metrics  
- No domain creep / Faza 29+  

**DESIGN complete when committed and STATUS phase=IMPLEMENT.**
