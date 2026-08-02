# Enterprise 2.1 P0 — Prod Bootstrap Design

| Field | Value |
|-------|-------|
| **Document** | P0 Prod Bootstrap |
| **Program** | Enterprise 2.1 |
| **Baseline** | `enterprise-2.0.0` |
| **Target tag** | `enterprise-2.1.p0-bootstrap` |
| **Branch** | `enterprise-2.1-p0-bootstrap` |
| **Status** | Ready for IMPLEMENT |
| **Date** | 2026-08-02 |
| **Tenancy** | **DEDICATED_STACK** |
| **Non-negotiables** | ADR-008, `docs/ENTERPRISE-2.1-PLAN.md` |

---

## Overview

Enterprise 2.0 delivered monorepo foundations (platform, ETO, finance-lite, scale docs, UX scaffold, ops pack) and tag `enterprise-2.0.0`. **P0** is the first production-hardening step: make **staging + prod topology**, **secret hygiene**, **health matrix**, and **stable enterprise boot** real and operable — without domain feature expansion.

### Workstreams (mission)

1. Staging + prod Helm/compose profiles  
2. Secrets only env/Vault; `ci-no-secrets`  
3. Health matrix script for core services  
4. Stable finance/gateway boot under `ENTERPRISE=1`  
5. `NATS_JETSTREAM` + enterprise flags in prod values  

**Out of scope:** domain depth (P3), full OTel (P1), live DR destroy (P2), UI UAT (P4).

---

## Background (honest)

| Area | Today | Gap for P0 |
|------|-------|------------|
| Helm | `infra/helm/erp/values.yaml`, `values-dev`, `values-staging`, `values-prod` exist | Inconsistent enterprise flags; incomplete service list; no single “prod profile checklist” |
| Env | `infra/enterprise.env.example` (Q0) | Need staging/prod split + finance boot vars; document Vault path |
| Boot | `boot-pilot-complete.sh`, `start:fin:prod` = `node apps/finance/dist/main.js` | Finance flaky when dist missing; pilot boot ≠ enterprise boot |
| Health | Ad-hoc curl in boot scripts | One reusable `scripts/health-matrix.sh` with exit codes for CI/ops |
| Secrets | `ci-no-secrets` green; Variant B | Document prod secret injection; no secrets in values committed |
| Enterprise assert | Gateway `assertEnterpriseMessaging` + tenancy | Ensure prod values set `ENTERPRISE=1` and `NATS_JETSTREAM=true` |

---

## Goals / Non-Goals

### Goals

- **Three profiles** clearly named: `local-pilot` (unchanged), `staging`, `prod`  
- **Prod/staging values** set enterprise messaging + auth expectations  
- **`scripts/health-matrix.sh`**: probes gateway + core ports; exit 0 iff threshold met  
- **`scripts/boot-enterprise.sh`**: build finance dist if needed, export enterprise env, start core set  
- **Secrets contract**: table of required env keys; never commit values  
- Gate: structural check + smoke:pilot + ci-no-secrets  

### Non-Goals

- Full multi-cluster GitOps  
- Live DR volume destroy  
- Full Temporal prod  
- SHARED_RLS  

---

## Key Decisions

### KD-P0-1 — Profiles over new monorepo

**Decision:** Extend existing Helm values + compose env files; do not invent a second monorepo layout.  
**Alt rejected:** Rewrite all deploy as new umbrella from scratch.

### KD-P0-2 — Finance boot = `dist/main.js` with build step

**Decision:** Enterprise boot always runs `pnpm --filter finance run build` (or `tsc -p tsconfig.build.json`) before `start:fin:prod`. Document in boot script.  
**Alt rejected:** Rely on `nest start --watch` in prod (proven flaky).

### KD-P0-3 — Health matrix is the ops truth

**Decision:** Single script used by boot wait-loop and CI optional job. Threshold: default 6/8 core services (gateway required).  
**Core ports (default):** gateway 4005, pm 4002, inv 4003, proc 4004, mes 4006, plm 4007, fin 4010, analytics 4011.

### KD-P0-4 — Secrets only via env / external secret store

**Decision:** Helm `values-prod.yaml` references `secretKeyRef` / envFrom; no plaintext secrets. `enterprise.env.example` lists keys only.  
**Alt rejected:** Commit staging secrets “for convenience”.

### KD-P0-5 — ENTERPRISE + JetStream mandatory in staging/prod values

**Decision:** `ENTERPRISE=1` (or `ERP_PROFILE=enterprise`) and `NATS_JETSTREAM=true` in staging/prod service env. Local pilot remains opt-in.  
Aligns with Q0 `assertEnterpriseMessaging()`.

### KD-P0-6 — Do not reset Enterprise 2.0 STATUS

**Decision:** Only `docs/ENTERPRISE-2.1-STATUS.md` advances. 2.0 stays DONE.

---

## Architecture (target P0)

```text
[ops] enterprise.env / Vault ──► [compose|helm staging|prod]
                                      │
                                      ▼
                    ENTERPRISE=1 NATS_JETSTREAM=true AUTH_ENFORCE=true
                                      │
         ┌────────────────────────────┼────────────────────────────┐
         ▼                            ▼                            ▼
   [api-gateway]              [domain services]              [finance dist]
   assert messaging           existing boot                  pre-built main.js
         │
         ▼
   health-matrix.sh ──► exit 0/1 for automation
```

---

## Workstreams → implementation map

| ID | Workstream | Primary surfaces |
|----|------------|------------------|
| W1 | Staging/prod profiles | `infra/helm/erp/values-staging.yaml`, `values-prod.yaml`, optional `docker-compose.enterprise.yml` notes |
| W2 | Secrets contract | `infra/enterprise.env.example`, `docs/enterprise-2.1/SECRETS-CONTRACT.md` |
| W3 | Health matrix | `scripts/health-matrix.sh`, package script `health:matrix` |
| W4 | Stable finance/gateway boot | `scripts/boot-enterprise.sh`, finance prebuild, package scripts |
| W5 | Enterprise flags in values | Helm env blocks for gateway + core |

---

## Security

- No secrets in git; expand `ci-no-secrets` patterns if new paths appear  
- Prod forbids `AUTH_ENFORCE=false` / `AUTH_DISABLE=true` (document; enforce in boot script)  
- Meili/Keycloak keys only via env  
- DR still only `erp-pilot-dr` for live destructive ops (P2)  

## Risks

| Risk | Mitigation |
|------|------------|
| Helm values incomplete for all services | P0 covers **core** ETO path; document residual services |
| Dist build slow | Cache in CI; boot script builds only if missing |
| Port conflicts on shared dev hosts | health-matrix reports clearly; boot kills only known ports with flag |
| Staging ≡ prod drift | Single template comments; checklist in design PR Plan |

---

## Testing / Gates

```bash
bash scripts/ci-no-secrets.sh
pnpm run smoke:pilot
bash scripts/enterprise-2.1/check-p0-bootstrap.sh
# after implement:
bash scripts/health-matrix.sh
ENTERPRISE=1 NATS_JETSTREAM=true # boot path smoke
```

---

## PR Plan

### PR 1: Secrets contract + enterprise.env refresh

- **Dependencies:** none  
- **Files:**  
  - `docs/enterprise-2.1/SECRETS-CONTRACT.md`  
  - `infra/enterprise.env.example` (staging/prod sections, finance, meili, keycloak)  
- **Description:** Document required env keys per profile; zero secret values. Cross-link Variant B.

### PR 2: Health matrix script

- **Dependencies:** none  
- **Files:**  
  - `scripts/health-matrix.sh`  
  - `package.json` → `health:matrix`  
- **Description:** Probe core ports/paths; configurable `HEALTH_MIN_OK` (default 6); gateway required; JSON optional summary to stdout.

### PR 3: Helm staging/prod enterprise flags

- **Dependencies:** PR 1  
- **Files:**  
  - `infra/helm/erp/values-staging.yaml`  
  - `infra/helm/erp/values-prod.yaml`  
  - `infra/helm/erp/values.yaml` (defaults comments only)  
- **Description:** Set `ENTERPRISE`, `NATS_JETSTREAM`, `AUTH_ENFORCE` (or equivalent env) for gateway and document service env pattern. No plaintext secrets.

### PR 4: boot-enterprise.sh + finance prebuild

- **Dependencies:** PR 2  
- **Files:**  
  - `scripts/boot-enterprise.sh`  
  - `package.json` scripts `boot:enterprise`, maybe `build:finance`  
- **Description:** Export enterprise env; build finance dist if missing; start gateway+core via existing filters; wait on health-matrix. Does not replace pilot boot.

### PR 5: Expand check-p0-bootstrap + STATUS

- **Dependencies:** PR 2, PR 3, PR 4  
- **Files:**  
  - `scripts/enterprise-2.1/check-p0-bootstrap.sh`  
  - `docs/ENTERPRISE-2.1-STATUS.md`  
- **Description:** Structural asserts for new scripts/docs; ready for GATE phase.

---

## Implementation order

```text
PR1 ∥ PR2 → PR3 → PR4 → PR5 → GATE → RELEASE
```

Serial safe: **1 → 2 → 3 → 4 → 5**.

---

## Success criteria

- Design + PR Plan accepted (this file)  
- After IMPLEMENT: health-matrix + boot-enterprise usable  
- staging/prod values encode enterprise flags  
- Tag `enterprise-2.1.p0-bootstrap` after RELEASE  
- 2.0 STATUS untouched (DONE)  

---

## Self-review

- Maps 1:1 to mission workstreams  
- No domain creep / Faza 29+  
- Honest about Helm partial coverage  
- Automation-friendly PR Plan  

**DESIGN complete when this file is committed and STATUS phase=IMPLEMENT.**
