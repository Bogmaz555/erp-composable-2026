<!-- generated 2026-08-02T11:54:27.560Z milestone=Q2 phase=IMPLEMENT sha=f68832e -->
<!-- Unattended: paste into Grok OR run /workflow enterprise-20-step|continuous -->

# AGENT MISSION — Q2 IMPLEMENT (autonomous)

Repo: /home/bogdan-mazur/PROGRAMY/ERP/erp-composable-2026
Design: `docs/ENTERPRISE-0.3-FINANCE-DESIGN.md` (must exist)
Branch: `enterprise-0.3-finance-compliance`

## Identity
Principal Engineer. Full autonomy. Implement PR Plan from design.

## Task
1. Read docs/ENTERPRISE-0.3-FINANCE-DESIGN.md ## PR Plan
2. Implement PRs in dependency order on branch `enterprise-0.3-finance-compliance`
3. Prefer: if design has PR Plan, you may use mental execute-plan loop (implement + self-review per PR)
4. Live fixes allowed; no domain scope outside workstreams
5. When implementation complete: set STATUS phase=GATE, commit, push
6. Run: `bash scripts/enterprise-2.0/gate-check.sh Q2` if possible

### Workstreams
- Finance journal AR/AP period close
- KSeF prod-capable path
- Quality NCR CAPA full
- EAM real IoT adapter interface
- Temporal (or equivalent) for ETO/finance/proc sagas
- Full financial compensations

### Gates that must pass next
  - `REQUIRE_LIVE=1 REQUIRE_LIVE_STRICT=1 pnpm run smoke:pilot`
  - `REQUIRE_LIVE=1 REQUIRE_LIVE_STRICT=1 npx tsx scripts/smoke-saga-compensation.ts`

START NOW. Implement.

## Autonomy contract (mandatory)
- ZERO confirmation pauses. Execute fully.
- Read also: docs/enterprise-2.0/AGENT_CONTRACT.md
- After work: update STATUS (or `node scripts/enterprise-2.0/advance-phase.mjs success "reason"`)
- Commit + push, then: `pnpm run enterprise:step`
- Forbidden: force-push master, filter-repo without APPROVED_BY_USER_A, secrets in git, readiness theater
