<!-- generated 2026-08-03T20:28:37.558Z milestone=E1 phase=DESIGN sha=dd4cecb -->
<!-- Enterprise roadmap — paste into Grok or scheduler RESUME -->

# AGENT MISSION — E1 DESIGN

Repo: /home/bogdan-mazur/PROGRAMY/ERP/erp-composable-2026
Branch: `enterprise-roadmap-e1` from master
Tenancy: **DEDICATED_STACK** · GA_LITE_SIGNED=true

## Task
Write **`docs/ENTERPRISE-ROADMAP-E1-DESIGN.md`** for **E1: Production hardening** with Key Decisions, risks, **## PR Plan** and `### PR` sections.

### Workstreams
- JetStream HA live or residual sign-off update
- Outbox lag metrics/alerts
- JWT_AUDIENCE + JWT_AZP_ALLOWLIST staging/prod
- Keycloak tenantId claim path
- Backup core DBs + migrate deploy policy
- OTel core + SLO + SBOM CI

After design: advance STATUS to IMPLEMENT, commit, push, `pnpm run enterprise-roadmap:step`.
Forbidden: reset 2.0/2.1 DONE, secrets, force-push master.
START NOW.
