<!-- generated 2026-08-02T20:10:04.274Z milestone=P1 phase=IMPLEMENT sha=3bf4eef -->
<!-- Enterprise 2.1 — paste into Grok or /workflow -->

# AGENT MISSION — P1 IMPLEMENT (autonomous)

Repo: /home/bogdan-mazur/PROGRAMY/ERP/erp-composable-2026
Design: `docs/ENTERPRISE-2.1-P1-OBS-DESIGN.md`
Branch: `enterprise-2.1-p1-observability`

## Task
1. Read docs/ENTERPRISE-2.1-P1-OBS-DESIGN.md ## PR Plan
2. Implement in dependency order on `enterprise-2.1-p1-observability`
3. When complete: STATUS phase=GATE, commit, push
4. Prefer: `bash scripts/enterprise-2.1/gate-check.sh P1`

### Workstreams
- OTel/traces on gateway + PM INV FIN MES
- Prometheus scrapes + Grafana SLO dashboards
- Burn-rate / availability alerts
- On-call runbook

### Gates next
  - `pnpm run smoke:pilot`
  - `bash scripts/enterprise-2.1/check-p1-obs.sh`

START NOW.

## Autonomy contract
- ZERO confirmation pauses
- Read docs/enterprise-2.1/AGENT_CONTRACT.md
- After work: advance STATUS; commit; push; `pnpm run enterprise21:step`
- Forbidden: force-push master, filter-repo without APPROVED_BY_USER_A, secrets in git
