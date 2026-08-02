<!-- generated 2026-08-02T11:46:28.144Z milestone=Q1 phase=GATE sha=d1df3aa -->
<!-- Unattended: paste into Grok OR run /workflow enterprise-20-step|continuous -->

# AGENT MISSION — Q1 GATE (autonomous)

Repo: /home/bogdan-mazur/PROGRAMY/ERP/erp-composable-2026
Branch: `enterprise-0.2-eto-spine`

## Task
1. Run: `bash scripts/enterprise-2.0/gate-check.sh Q1`
2. Also run live commands if stack available:
  - `pnpm run smoke:pilot`
  - `REQUIRE_LIVE=1 REQUIRE_LIVE_STRICT=1 pnpm run smoke:pilot`
  - `./node_modules/.bin/playwright test e2e/pilot-eto-complete.spec.ts`
3. If fail: fix (max 3 attempts), re-gate; if still fail STATUS state=BLOCKED with last_error
4. If pass: STATUS phase=RELEASE, commit, push

Boot stack if needed: `bash scripts/boot-pilot-complete.sh` (or enterprise boot when exists).

START NOW.

## Autonomy contract (mandatory)
- ZERO confirmation pauses. Execute fully.
- Read also: docs/enterprise-2.0/AGENT_CONTRACT.md
- After work: update STATUS (or `node scripts/enterprise-2.0/advance-phase.mjs success "reason"`)
- Commit + push, then: `pnpm run enterprise:step`
- Forbidden: force-push master, filter-repo without APPROVED_BY_USER_A, secrets in git, readiness theater
