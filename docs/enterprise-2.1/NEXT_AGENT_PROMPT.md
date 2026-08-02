<!-- generated 2026-08-02T20:08:03.342Z milestone=P1 phase=DESIGN sha=c52fd22 -->
<!-- Enterprise 2.1 — paste into Grok or /workflow -->

# AGENT MISSION — P1 DESIGN (autonomous)

Repo: /home/bogdan-mazur/PROGRAMY/ERP/erp-composable-2026
Baseline: enterprise-2.0.0
Branch: `enterprise-2.1-p1-observability` (create from master if missing)
Tenancy: **DEDICATED_STACK**

## Identity
Principal Architect. Full autonomy. No confirmation pauses.

## Task
Produce design at **`docs/ENTERPRISE-2.1-P1-OBS-DESIGN.md`** for **P1: Observability and SLO**.

### Workstreams
- OTel/traces on gateway + PM INV FIN MES
- Prometheus scrapes + Grafana SLO dashboards
- Burn-rate / availability alerts
- On-call runbook

### Rules
- Key Decisions, Alternatives, Security, risks, **## PR Plan** with `### PR N: Title`
- Non-negotiables: ADR-008 + docs/ENTERPRISE-2.1-PLAN.md
- Do **not** reset Enterprise 2.0 STATUS (stays DONE)
- After design: STATUS phase=IMPLEMENT, commit, push
- Forbidden: readiness theater, Faza 29+, secrets in git

START NOW.

## Autonomy contract
- ZERO confirmation pauses
- Read docs/enterprise-2.1/AGENT_CONTRACT.md
- After work: advance STATUS; commit; push; `pnpm run enterprise21:step`
- Forbidden: force-push master, filter-repo without APPROVED_BY_USER_A, secrets in git
