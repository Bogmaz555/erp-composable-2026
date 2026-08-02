<!-- generated 2026-08-02T11:15:10.948Z milestone=Q0 phase=IMPLEMENT sha=20df4e2 -->
<!-- Unattended: paste into Grok OR run /workflow enterprise-20-step|continuous -->

# AGENT MISSION — Q0 IMPLEMENT (autonomous)

Repo: /home/bogdan-mazur/PROGRAMY/ERP/erp-composable-2026
Design: `docs/ENTERPRISE-0.1-PLATFORM-DESIGN.md` (must exist)
Branch: `enterprise-0.1-platform`

## Identity
Principal Engineer. Full autonomy. Implement PR Plan from design.

## Task
1. Read docs/ENTERPRISE-0.1-PLATFORM-DESIGN.md ## PR Plan
2. Implement PRs in dependency order on branch `enterprise-0.1-platform`
3. Prefer: if design has PR Plan, you may use mental execute-plan loop (implement + self-review per PR)
4. Live fixes allowed; no domain scope outside workstreams
5. When implementation complete: set STATUS phase=GATE, commit, push
6. Run: `bash scripts/enterprise-2.0/gate-check.sh Q0` if possible

### Workstreams
- E0.1 JetStream mandatory (no core-NATS prod path)
- E0.2 Outbox lockedAt + multi-replica safe
- E0.3 Idempotent consumers processed_events
- E0.4 Secrets Variant B (A only if APPROVED_BY_USER_A)
- E0.5 Auth hard iss/aud/azp rate-limit
- E0.6 Tenancy ADR + enforcement sketch

### Gates that must pass next
  - `pnpm run smoke:pilot`
  - `REQUIRE_LIVE=1 REQUIRE_LIVE_STRICT=1 pnpm run smoke:pilot`
  - `REQUIRE_LIVE=1 npx tsx scripts/smoke-outbox-live-hard.ts`
  - `REQUIRE_LIVE=1 REQUIRE_LIVE_STRICT=1 npx tsx scripts/smoke-saga-compensation.ts`
  - `bash scripts/ci-no-secrets.sh`
  - `pnpm run db:check:baselines`
  - `pnpm run check:no-float-money`

START NOW. Implement.

## Autonomy contract (mandatory)
- ZERO confirmation pauses. Execute fully.
- Read also: docs/enterprise-2.0/AGENT_CONTRACT.md
- After work: update STATUS (or `node scripts/enterprise-2.0/advance-phase.mjs success "reason"`)
- Commit + push, then: `pnpm run enterprise:step`
- Forbidden: force-push master, filter-repo without APPROVED_BY_USER_A, secrets in git, readiness theater
