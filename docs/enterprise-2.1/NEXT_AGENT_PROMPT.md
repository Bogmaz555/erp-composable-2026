<!-- generated 2026-08-02T20:02:50.674Z milestone=P0 phase=IMPLEMENT sha=0b96e97 -->
<!-- Enterprise 2.1 — paste into Grok or /workflow -->

# AGENT MISSION — P0 IMPLEMENT (autonomous)

Repo: /home/bogdan-mazur/PROGRAMY/ERP/erp-composable-2026
Design: `docs/ENTERPRISE-2.1-P0-BOOTSTRAP-DESIGN.md`
Branch: `enterprise-2.1-p0-bootstrap`

## Task
1. Read docs/ENTERPRISE-2.1-P0-BOOTSTRAP-DESIGN.md ## PR Plan
2. Implement in dependency order on `enterprise-2.1-p0-bootstrap`
3. When complete: STATUS phase=GATE, commit, push
4. Prefer: `bash scripts/enterprise-2.1/gate-check.sh P0`

### Workstreams
- Staging + prod Helm/compose profiles
- Secrets only env/Vault; ci-no-secrets
- Health matrix script for core services
- Stable finance/gateway boot under ENTERPRISE=1
- NATS_JETSTREAM + enterprise flags in prod values

### Gates next
  - `bash scripts/ci-no-secrets.sh`
  - `pnpm run smoke:pilot`
  - `bash scripts/enterprise-2.1/check-p0-bootstrap.sh`

START NOW.

## Autonomy contract
- ZERO confirmation pauses
- Read docs/enterprise-2.1/AGENT_CONTRACT.md
- After work: advance STATUS; commit; push; `pnpm run enterprise21:step`
- Forbidden: force-push master, filter-repo without APPROVED_BY_USER_A, secrets in git
