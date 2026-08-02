<!-- generated 2026-08-02T13:15:08.137Z milestone=Q4 phase=GATE sha=4a8413b -->
<!-- Unattended: paste into Grok OR run /workflow enterprise-20-step|continuous -->

# AGENT MISSION — Q4 GATE (autonomous)

Repo: /home/bogdan-mazur/PROGRAMY/ERP/erp-composable-2026
Branch: `enterprise-0.5-ux-mdm`

## Task
1. Run: `bash scripts/enterprise-2.0/gate-check.sh Q4`
2. Also run live commands if stack available:
  - `pnpm run smoke:pilot`
  - `./node_modules/.bin/playwright test e2e/pilot-eto-complete.spec.ts`
  - `bash scripts/enterprise-2.0/check-q4-ux.sh`
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
