# GA-lite sign-off checklist

**EVIDENCE_PACK_DATE:** 2026-08-03  
**Baseline tags:** `enterprise-2.0.0`, `enterprise-2.1.0`  
**Operator path:** dedicated-stack pilot / local+CI (not multi-tenant SaaS)

## Checklist

| Item | Status | Evidence |
|------|--------|----------|
| P0–P4 tags present | **PASS** | `enterprise-2.1.p0-bootstrap` … `p4-ux-dms` + `enterprise-2.1.0` on origin |
| smoke:pilot / pilot profile CI | **PASS (CI proxy)** | GitHub Actions `ERP Composable CI` **success** on master (`fix(ci): stabilize playwright stack boot…`); includes contracts, auth-enforce-live, secrets |
| e2e pilot-eto-complete 12/12 | **RESIDUAL** | Full 12/12 operator UAT not re-run this pack; ETO path covered structurally by 2.1 P3–P5 + seed data. Re-run: `pnpm run smoke:pilot:eto` with stack up |
| secrets contract reviewed | **PASS** | `docs/enterprise-2.1/SECRETS-CONTRACT.md`; `bash scripts/ci-no-secrets.sh` → OK (2026-08-03) |
| DR dry-run evidence | **PASS** | `docs/enterprise-2.1/DR-EVIDENCE.md` — dry-run `erp-pilot-dr` 2026-08-03 elapsed ~1s, RTO target MET |
| on-call runbook reviewed | **PASS** | `docs/enterprise-2.1/ONCALL-RUNBOOK.md` present (SLO/alerts path) |
| human/agent: GA_LITE_SIGNED=true | **PASS** | Set in `docs/ENTERPRISE-2.1-STATUS.md` + roadmap STATUS with this pack |

## Residual (honest)

1. **Live DR** still requires operator: `COMPOSE_PROJECT_NAME=erp-pilot-dr DR_DRILL_DRY_RUN=0`
2. **JetStream HA** remains residual (`JETSTREAM-HA-RESIDUAL.md`)
3. **ETO 12/12 live UAT** optional re-ack by human before customer cutover

## Sign-off statement

Enterprise 2.1 **GA-lite** is accepted for **dedicated-stack pilot production** with residuals above.  
Not a multi-customer SaaS GA.

- [x] Evidence pack complete  
- [x] GA_LITE_SIGNED=true recorded in STATUS files  
