# ERP Composable 2026

**Composable, event-driven ERP monorepo** for **ETO manufacturing** (Engineering-to-Order): projects → BOM → procurement → inventory → MES → finance → quality, with a Next.js UI and Keycloak auth.

| | |
|---|---|
| **Repo** | [github.com/Bogmaz555/erp-composable-2026](https://github.com/Bogmaz555/erp-composable-2026) |
| **Program baseline** | Pilot → **Enterprise 2.0** (`enterprise-2.0.0`) → **Enterprise 2.1 GA-lite** (`enterprise-2.1.0`) |
| **Tenancy** | `DEDICATED_STACK` (shared-DB RLS deferred) |
| **Status (automation)** | 2.0 **DONE** · 2.1 **DONE** — see `docs/ENTERPRISE-2.1-STATUS.md` |

This is **not** a SaaS multi-tenant product yet. It is a **dedicated-stack enterprise pilot / GA-lite** platform: database-per-service, CQRS microservices, NATS JetStream outbox, gateway JWT boundary.

---

## What you are looking at

### Domain spine (ETO)

```
CRM (lead/opp) → PM (project/WBS) → PLM (BOM/ECO)
       → PROC (PO) → INV (stock) → MES (WO) → FIN (WIP/journal)
       → Quality / EAM / HR / Tax-Legal (KSeF) / Analytics
```

Events move between services via **transactional outbox → NATS JetStream**. The **API gateway** (`:4005`) is the only public HTTP front for domain APIs; the UI calls `/api/*` (rewritten to the gateway).

### Stack

| Layer | Tech |
|-------|------|
| Backend | NestJS, CQRS, Prisma |
| Frontend | Next.js (App Router), React Query |
| Messaging | NATS JetStream |
| Data | PostgreSQL **per service** (ports 5433–5445) |
| Auth | Keycloak realm `erp`, JWKS at gateway (`AUTH_ENFORCE`) |
| Ops | Docker Compose, Helm (`infra/helm`), Prometheus/Grafana, OTel hooks |
| Control plane | `docs/ENTERPRISE-2.*-STATUS.md`, `scripts/enterprise-2.1/*` |

### Modules (apps/)

| Service | Port (default) | Role |
|---------|----------------|------|
| `api-gateway` | 4005 | JWT proxy, `/api/{crm,pm,inv,proc,...}` |
| `frontend` | **3010** local (3000 often taken) | Operator UI |
| `crm-service` | 4001 | Leads, opportunities, CPQ |
| `pm-service` | 4002 | ETO projects, milestones |
| `inv-service` | 4003 | Stock, reservations, WMS |
| `proc-service` | 4004 | Purchase orders, MRP |
| `mes-service` | 4006 | Work orders, shop floor |
| `plm-service` | 4007 | BOM / ECO |
| `quality-service` | 4008 | NCR / CAPA / ISO |
| `eam-service` | 4009 | Equipment |
| `finance` | 4010 | WIP, journal, period close, AR/AP |
| `analytics-service` | 4011 | BI / ETO saga counters / auth context |
| `hr` | 4012 | Time / employees |
| `dms` | 4013 | Documents |
| `tax-legal` | 4015 | KSeF / JPK |

---

## Current release state (honest)

### Done (tagged)

- **Enterprise 2.0** — `enterprise-2.0.0` (Q0–Q5 platform → GA package)
- **Enterprise 2.1 GA-lite** — `enterprise-2.1.0`  
  - P0 prod bootstrap (health-matrix, secrets contract, Helm profiles, `boot:enterprise`)  
  - P1 observability (OTel traces, Prometheus/Grafana SLO stubs, on-call runbook)  
  - P2 DR dry-run + residual JetStream HA docs  
  - P3 domain depth (finance period/AR-AP/compensation paths)  
  - P4 UX/DMS/webhook/UAT notes  
  - P5 cutover/pentest/sign-off templates  

### Not done / residual (do not pretend)

| Item | Reality |
|------|---------|
| `GA_LITE_SIGNED` | **false** until human sign-off (`docs/enterprise-2.1/GA-LITE-SIGNOFF.md`) |
| JetStream HA | Documented residual — not mandatory live 3-node cluster |
| Live DR | Only project **`erp-pilot-dr`** unless STATUS override |
| Shared multi-tenant RLS | Deferred past 2.1 |
| Secrets in git | Forbidden — env/Vault only |

Automation flags live in `docs/ENTERPRISE-2.1-STATUS.md`. Do not reset 2.0 STATUS while working 2.1.

---

## Quick start (local)

### Prerequisites

- Node 22+, pnpm 9+
- Docker (Postgres per service, NATS, Redis, Keycloak)
- Free ports: **4002–4011**, **4005**, **8080** (Keycloak). Frontend prefers **3010** if 3000/3001 are busy.

### Install & infra

```bash
pnpm install
docker compose up -d nats redis keycloak \
  crm-db pm-db inv-db proc-db fin-db quality-db eam-db plm-db tax-db hr-db analytics-db
```

### Enterprise core boot

```bash
pnpm run boot:enterprise          # gateway + PM INV PROC PLM MES FIN analytics
bash scripts/health-matrix.sh     # expect RESULT: PASS (8/8)
```

Optional full boot (more services + frontend):

```bash
# Frontend on 3010 when 3000 is taken by other stacks
PORT=3010 FRONTEND_PORT=3010 pnpm --filter frontend run dev -- -p 3010 -H 0.0.0.0
```

### Auth (required for data in UI)

Gateway runs with **`AUTH_ENFORCE=true`**. Unauthenticated UI will look “empty”.

| | |
|---|---|
| UI | http://localhost:3010 |
| Keycloak | http://localhost:8080 (realm `erp`) |
| Demo user | `demo.admin` / `demo123` |
| Clients | `erp-frontend` (UI), `erp-gateway` (password grant / tools) |

Login: top-right **Zaloguj** → password grant (demo) or Keycloak SSO. Token stored as `erp-access-token`.

### Smoke

```bash
pnpm run smoke:pilot
# or live-strict when stack is up:
# pnpm run smoke:pilot:strict
```

---

## Docs map

| Path | Purpose |
|------|---------|
| `docs/ENTERPRISE-2.1-STATUS.md` | **Live automation status** (DONE / residuals) |
| `docs/ENTERPRISE-2.1-PLAN.md` | 2.1 plan P0–P5 |
| `docs/enterprise-2.1/milestones.json` | Machine-readable tags & gates |
| `docs/ENTERPRISE-2.0-STATUS.md` | 2.0 DONE (do not rewrite while on 2.1) |
| `docs/enterprise-2.1/*` | Runbooks: DR, on-call, cutover, secrets, GA sign-off |
| `docs/TECHNICAL-DEBT.md` | Known debt |
| `.agents/skills/` | Agent skills (architect, coder, tester, …) |

---

## Repository layout

```
apps/           # Nest services + frontend + shared-kernel
docs/           # Enterprise plans, events registry, debt
infra/          # Helm, Prometheus, Grafana, Keycloak realm, env examples
scripts/        # boot-*, smoke-*, enterprise-2.0/, enterprise-2.1/, health-matrix
docker-compose.yml
```

---

## Development notes

- **Database URLs** are service-specific (`PM_DATABASE_URL`, `INV_DATABASE_URL`, …). Do not point all services at one DB.
- **PLM / Quality / EAM** compose defaults often use `postgres:postgres` on their ports; CRM/PM/PROC/FIN use `erp_user:erp_password` — match `apps/*/.env` and compose.
- **Tax** DB name is `tax_legal_db` on port **5442**.
- **No force-push to `master`**. No secrets in commits (`scripts/ci-no-secrets.sh`).
- Enterprise automation: `pnpm run enterprise21:step` (no-op when STATUS is DONE).

---

## License / ownership

Private project workspace — see repository settings on GitHub.
)
