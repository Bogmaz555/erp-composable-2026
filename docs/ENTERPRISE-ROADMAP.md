# Enterprise Roadmap (E0–E4)

**Baseline:** `enterprise-2.0.0` + `enterprise-2.1.0` (GA-lite code) DONE.  
**Tenancy default:** `DEDICATED_STACK`.  
**Control plane:** `docs/ENTERPRISE-ROADMAP-STATUS.md`, `docs/enterprise-roadmap/*`, `pnpm run enterprise-roadmap:step`.

Do **not** reset Enterprise 2.0 / 2.1 STATUS while executing this program.

## Phases

| ID | Name | Target tag | Exit |
|----|------|------------|------|
| E0 | GA-lite sign-off | `enterprise-2.1.0-signed` | `GA_LITE_SIGNED=true` + evidence |
| E1 | Production hardening | `enterprise-2.2.0` | Auth/DR/obs/HA decision |
| E2 | Domain depth ETO | `enterprise-2.3.0` | smoke:pilot:eto + UAT path |
| E3 | Platform product | `enterprise-2.4.0` | Deploy/GitOps/secrets/cutover v2 |
| E4 | Multi-tenant | `enterprise-3.0.0` or **DEFERRED** | Only if `tenancy=SHARED_RLS` + ADR |

## Non-negotiables

- No force-push `master`
- No filter-repo without `APPROVED_BY_USER_A=true`
- No secrets in git
- `AUTH_ENFORCE` default on for enterprise profiles
- Live DR only `COMPOSE_PROJECT_NAME=erp-pilot-dr`
- Prefer residual docs over readiness theater
- Workspace after RESUME: **master**

## Phase detail

### E0 — GA-lite sign-off
Evidence pack in `docs/enterprise-2.1/GA-LITE-SIGNOFF.md`, DR log, secrets contract, on-call, CI green.

### E1 — Production hardening
JetStream HA live or signed residual; outbox metrics; JWT audience/azp; backup+migrate deploy; OTel/SLO/SBOM.

### E2 — Domain depth
CRM→PM→PLM; PROC→INV→MES; FIN period/AR-AP/KSeF/compensation; QMS/EAM/DMS; ETO UX.

### E3 — Platform product
Helm/GitOps; Vault; backup offsite; pentest High=0; dedicated-stack provision script.

### E4 — Multi-tenant
ADR first. If still DEDICATED_STACK after E3 → **DEFERRED**, program DONE.
