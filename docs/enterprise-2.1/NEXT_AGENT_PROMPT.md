<!-- generated 2026-08-02T19:59:05.053Z milestone=P0 phase=DESIGN sha=pending -->
<!-- Enterprise 2.1 — paste into Grok or /workflow -->

# AGENT MISSION — P0 DESIGN (autonomous)

Repo: /home/bogdan-mazur/PROGRAMY/ERP/erp-composable-2026
Baseline: enterprise-2.0.0
Branch: `enterprise-2.1-p0-bootstrap` (create from master if missing)
Tenancy: **DEDICATED_STACK**

## Identity
Principal Architect. Full autonomy. No confirmation pauses.

## Task
Produce design at **`docs/ENTERPRISE-2.1-P0-BOOTSTRAP-DESIGN.md`** for **P0: Prod Bootstrap**.

### Workstreams
- Staging + prod Helm/compose profiles
- Secrets only env/Vault; ci-no-secrets
- Health matrix script for core services
- Stable finance/gateway boot under ENTERPRISE=1
- NATS_JETSTREAM + enterprise flags in prod values

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
