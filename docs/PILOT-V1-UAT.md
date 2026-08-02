# Pilot v1 UAT Protocol

**Date:** 2026-08-02  
**Branch/tag:** `master` @ `da7569f` / tag `pilot-v1.0.0`  
**PR:** https://github.com/Bogmaz555/erp-composable-2026/pull/1  

## Decision: **GO conditional**

| | |
|--|--|
| **Verdict** | GO for single-tenant pilot demo / isolated client pilot |
| **Condition** | Full live ETO fail-step reverse WIP still soft-SKIP without `pg`+`nats` in smoke runtime; runbook DR live (`DR_DRILL_DRY_RUN=0`) not executed on shared env (dry-run PASS). Accept residual R3/R5/R6/R7/R8. |

## Scenarios

| # | Scenario | Result | Evidence |
|---|----------|--------|----------|
| 1 | Public health gateway | **PASS** | `GET /api/health` → 200 with AUTH on |
| 2 | No token → 401 on PM/analytics | **PASS** | smoke-auth-401 REQUIRE_LIVE |
| 3 | demo.engineer JWT → not 401 | **PASS** | `/api/pm/projects` → 404 empty; `/api/analytics/platform` → 404 |
| 4 | Offline pilot suite | **PASS** | `pnpm run smoke:pilot` all 7 green |
| 5 | REQUIRE_LIVE pilot suite | **PASS** | auth, rbac, outbox structure, tenant, jetstream; saga structure + live soft SKIP |
| 6 | JetStream bootstrap + publish ack | **PASS** | ETO_CORE/SUPPLY/QUALITY; msgID de-dupe |
| 7 | Tenant isolation structure | **PASS** | smoke-tenant-isolation |
| 8 | Outbox TX structure INV/PROC/FIN/MES | **PASS** | smoke-outbox-* |
| 9 | DR dry-run RPO24h/RTO2h | **PASS** | `DR_DRILL_DRY_RUN=1 scripts/dr-drill.sh` |
| 10 | DR live destroy volumes | **SKIP** | requires human confirm (policy) |
| 11 | UI ETO path as engineer | **COND** | FE fetchWithAuth wired; full browser UAT manual residual |
| 12 | NATS restart + outbox reclaim | **COND** | JetStream live OK; multi-instance residual accepted |

## Sign-off

- Automated gate: **PASS** (C1+C2)  
- Human browser UAT: optional before client demo  
- Residual board: `docs/PILOT-V1-CLOSURE-BOARD.md`
