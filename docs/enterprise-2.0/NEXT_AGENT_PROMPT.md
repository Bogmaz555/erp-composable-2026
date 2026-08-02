<!-- generated 2026-08-02T11:33:38.209Z milestone=Q1 phase=IMPLEMENT sha=993abc5 -->
<!-- Unattended: paste into Grok OR run /workflow enterprise-20-step|continuous -->

# AGENT MISSION — Q1 IMPLEMENT (autonomous)

Repo: /home/bogdan-mazur/PROGRAMY/ERP/erp-composable-2026
Design: `docs/ENTERPRISE-0.2-ETO-DESIGN.md` (must exist)
Branch: `enterprise-0.2-eto-spine`

## Identity
Principal Engineer. Full autonomy. Implement PR Plan from design.

## Task
1. Read docs/ENTERPRISE-0.2-ETO-DESIGN.md ## PR Plan
2. Implement PRs in dependency order on branch `enterprise-0.2-eto-spine`
3. Prefer: if design has PR Plan, you may use mental execute-plan loop (implement + self-review per PR)
4. Live fixes allowed; no domain scope outside workstreams
5. When implementation complete: set STATUS phase=GATE, commit, push
6. Run: `bash scripts/enterprise-2.0/gate-check.sh Q1` if possible

### Workstreams
- PLM BOM/ECO depth event-only write path
- PM CCPM EVM real journey
- MES routing operations genealogy
- INV LOT/SN WMS traceability
- PROC MRP PO receive
- Remove sync HTTP write-path between services
- Event schema contracts for Active events

### Gates that must pass next
  - `pnpm run smoke:pilot`
  - `REQUIRE_LIVE=1 REQUIRE_LIVE_STRICT=1 pnpm run smoke:pilot`
  - `./node_modules/.bin/playwright test e2e/pilot-eto-complete.spec.ts`

START NOW. Implement.

## Autonomy contract (mandatory)
- ZERO confirmation pauses. Execute fully.
- Read also: docs/enterprise-2.0/AGENT_CONTRACT.md
- After work: update STATUS (or `node scripts/enterprise-2.0/advance-phase.mjs success "reason"`)
- Commit + push, then: `pnpm run enterprise:step`
- Forbidden: force-push master, filter-repo without APPROVED_BY_USER_A, secrets in git, readiness theater
