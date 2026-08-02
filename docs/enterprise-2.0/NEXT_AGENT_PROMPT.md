<!-- generated 2026-08-02T11:27:13.821Z milestone=Q0 phase=GATE sha=fac21c5 -->
<!-- Unattended: paste into Grok OR run /workflow enterprise-20-step|continuous -->

# AGENT MISSION — Q0 GATE (autonomous)

Repo: /home/bogdan-mazur/PROGRAMY/ERP/erp-composable-2026
Branch: `enterprise-0.1-platform`

## Task
1. Run: `bash scripts/enterprise-2.0/gate-check.sh Q0`
2. Also run live commands if stack available:
  - `pnpm run smoke:pilot`
  - `REQUIRE_LIVE=1 REQUIRE_LIVE_STRICT=1 pnpm run smoke:pilot`
  - `REQUIRE_LIVE=1 npx tsx scripts/smoke-outbox-live-hard.ts`
  - `REQUIRE_LIVE=1 REQUIRE_LIVE_STRICT=1 npx tsx scripts/smoke-saga-compensation.ts`
  - `bash scripts/ci-no-secrets.sh`
  - `pnpm run db:check:baselines`
  - `pnpm run check:no-float-money`
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
