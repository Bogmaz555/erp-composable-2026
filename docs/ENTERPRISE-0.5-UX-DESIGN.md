# Enterprise 0.5 — UX MDM DMS Integrations Design (Q4)

| Field | Value |
|-------|-------|
| **Document** | Enterprise Q4 UX / MDM / DMS / Search / Webhooks |
| **Baseline** | `enterprise-0.4-isolation-scale` |
| **Target tag** | `enterprise-0.5-ux-mdm` |
| **Branch** | `enterprise-0.5-ux-mdm` |
| **Status** | Ready for IMPLEMENT |
| **Date** | 2026-08-02 |
| **Tenancy** | **DEDICATED_STACK** |
| **Non-negotiables** | ADR-008, ENTERPRISE-2.0-PLAN |

---

## Overview

Q0–Q3 closed platform, ETO spine, finance/compliance, isolation/scale. **Q4** makes the system **operable by people without CLI**: MDM system-of-record, versioned DMS, ETO UI CRUD week path, authorized global search, signed webhooks for integrations.

### Workstreams (milestones.json)

1. MDM product/partner SoR  
2. DMS documents versioned  
3. Full UI CRUD ETO week without CLI  
4. Global search authz  
5. Signed webhooks integrations  

**Out of scope:** marketplace plugins, multi-region UX, Faza 29+ readiness theater, full CRM rewrite.

---

## Background (honest)

| Area | Current | Gap |
|------|---------|-----|
| MDM | Product/partner data scattered (PLM items, CRM partners) | No single SoR service or explicit ownership map + sync rules |
| DMS | `apps/dms` package exists (prisma) but thin | Versioned document model + API + link to project/BOM |
| Frontend | Next.js modules: pm/plm/inv/mes/finance… panels | Incomplete ETO week CRUD; still CLI-dependent for some steps |
| Search | `apps/search-service` + Meili via gateway; `GlobalSearch.tsx` | Authz on results weak / incomplete |
| Webhooks | Ad-hoc | No signed outbound webhook delivery with HMAC + retry |

---

## Key Decisions

### KD-Q4-1 — MDM as ownership map + thin SoR API

**Decision:** Do not rewrite all domains. Introduce `docs/MDM-SOR-MAP.md` + lightweight `mdm` endpoints (or analytics proxy) that declare SoR:

| Entity | SoR | Consumers |
|--------|-----|-----------|
| Product / Item | PLM | INV, PM, CRM |
| Business Partner | CRM | PROC, FIN, Tax |
| Project | PM | MES, FIN |

Optional `apps` thin MDM read API aggregating canonical IDs.

### KD-Q4-2 — DMS versioned documents

**Decision:** Prisma models `Document` + `DocumentVersion` (version int, storageKey, sha256, createdBy). API: create, upload version, list by projectId/entityRef. Storage: local filesystem or S3-compatible env (`DMS_STORAGE_PATH`).

### KD-Q4-3 — ETO UI week path

**Decision:** Frontend routes covering: BOM release view → project materials → reserve → MES WO status → finance WIP summary. Prefer existing modules; fill missing pages/actions so UAT can complete without CLI scripts.

### KD-Q4-4 — Search authz

**Decision:** Every search hit filtered by role + tenant; no result without auth under ENTERPRISE. Gateway already auth-enforces `/api/search` and Meili paths; search-service applies role filters on index types.

### KD-Q4-5 — Signed webhooks

**Decision:** HMAC-SHA256 signature header `X-ERP-Signature: sha256=<hex>` over body; secret from env `WEBHOOK_SIGNING_SECRET`; delivery log table; at-least-once retry.

---

## Architecture

```text
[Next.js UI] --JWT--> [api-gateway] --> PLM/PM/INV/MES/FIN
                    |--> search-service (Meili + authz)
                    |--> dms (versioned docs)
                    |--> webhook dispatcher (signed)
[MDM SoR map] documents ownership; no dual-write chaos
```

---

## PR Plan

### PR 1: MDM SoR map + read API sketch

- **Dependencies:** none  
- **Files:** `docs/MDM-SOR-MAP.md`, optional `apps/analytics-service` or `apps/api-gateway` MDM status route, `infra/enterprise.env.example`  
- **Description:** Canonical entity→service ownership; GET `/api/mdm/sor` (or analytics) returns map JSON.

### PR 2: DMS Document + DocumentVersion

- **Dependencies:** none  
- **Files:** `apps/dms/prisma/schema.prisma`, migration, controllers, service  
- **Description:** Versioned documents linked to projectId/entityRef; list/create/version APIs.

### PR 3: ETO UI week path pages

- **Dependencies:** none (uses existing APIs)  
- **Files:** `apps/frontend/app/**` ETO week hub page, wire actions to gateway  
- **Description:** Single week-path page linking PLM→PM→INV→MES→FIN with token auth; no CLI.

### PR 4: Global search authz

- **Dependencies:** none  
- **Files:** `apps/search-service/src/*`, `apps/frontend/components/GlobalSearch.tsx`, gateway public path audit  
- **Description:** Reject unauthenticated search; filter hits by role; document index types.

### PR 5: Signed webhooks

- **Dependencies:** none  
- **Files:** `apps/shared-kernel/src/webhook-sign.ts`, dispatcher service (analytics or gateway), delivery log model, docs  
- **Description:** HMAC sign, retry, idempotent delivery key.

### PR 6: Q4 gate docs + STATUS

- **Dependencies:** PR 3, PR 4  
- **Files:** milestones check helper optional, STATUS  
- **Description:** playwright e2e + smoke:pilot; structural check for MDM/DMS/webhook files.

---

## Implementation order

```text
PR1 ∥ PR2 ∥ PR4 ∥ PR5 → PR3 → PR6 → GATE → RELEASE
```

Serial: **1 → 2 → 4 → 5 → 3 → 6**.

---

## Gates

```bash
./node_modules/.bin/playwright test e2e/pilot-eto-complete.spec.ts
pnpm run smoke:pilot
bash scripts/enterprise-2.0/gate-check.sh Q4
```

---

## Security

- No secrets in git; webhook secret env-only  
- Search never public under enterprise  
- DMS files not world-readable; tenantId on documents  

## Risks

| Risk | Mitigation |
|------|------------|
| Scope creep full MDM platform | SoR map + thin API only |
| UI depends on down services | e2e already soft on some paths; health checks |
| Meili down | Search degrades gracefully with error JSON |

---

## Success criteria

- Tag `enterprise-0.5-ux-mdm`  
- Design + PR plan delivered  
- MDM map, DMS versions, ETO week UI, search authz, signed webhooks present  
- GATE green → Q5 DESIGN  

**DESIGN complete when this file is committed and STATUS phase=IMPLEMENT.**
