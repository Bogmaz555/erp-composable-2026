# Enterprise 0.1 — Platform Certification Design (Q0)

| Field | Value |
|-------|-------|
| **Document** | Enterprise Q0 Platform Certification |
| **Repo** | `/home/bogdan-mazur/PROGRAMY/ERP/erp-composable-2026` |
| **Baseline** | `pilot-v1.1.0` (Pilot COMPLETE) |
| **Target tag** | `enterprise-0.1-platform` |
| **Branch** | `enterprise-0.1-platform` (from `enterprise-2.0-automation` / master after scaffold merge) |
| **Status** | **Ready for IMPLEMENT** |
| **Date** | 2026-08-02 |
| **Tenancy lock** | **DEDICATED_STACK** (STATUS; not SHARED_RLS) |
| **Non-negotiables** | ADR-008, `docs/ENTERPRISE-2.0-PLAN.md` |

---

## Overview

Pilot v1.1.0 proved an honest single-tenant ETO path with live gates (`smoke:pilot` strict, outbox live hard, saga compensation, e2e pilot-eto). Enterprise Q0 does **not** expand domain features. It certifies the **platform spine** so later milestones (ETO depth, finance/compliance, scale, UX, GA) stand on non-waivable guarantees:

1. JetStream is the only production event transport for enterprise profiles  
2. Outbox multi-replica claim safety (`lockedAt` / reclaim by lock time)  
3. Idempotent consumers for money / stock / saga paths  
4. Secrets Variant B (no tree secrets; history rewrite only if `APPROVED_BY_USER_A`)  
5. Auth hard: iss (+ aud when set), azp/client allowlist, rate limits  
6. Tenancy model ADR + enforcement sketch for DEDICATED_STACK  

**Out of scope (Q0):** domain feature expansion, Faza 29+, readiness theater, multi-region, SHARED_RLS implementation (unless STATUS flipped by human).

---

## Background & current state (honest)

| Area | Pilot residual | Enterprise Q0 goal |
|------|----------------|--------------------|
| JetStream | Opt-in `NATS_JETSTREAM`; default core NATS; dual-path guards only on fin-wip / inv-eto samples | Enterprise compose/profile **requires** JS; fail boot if core-only in enterprise; audit all Nest `@EventPattern` for dual-path |
| Outbox | `GenericOutboxRelay` v2: claim PENDING→PROCESSING, JetStream msgID; **reclaim uses `createdAt`** (class residual) | Add `lockedAt` (or `processingStartedAt`); reclaim only on lock age; optional `SKIP LOCKED` |
| Consumers | Finance reverse WIP partial idempotency; no shared `processed_events` table | Shared kernel `processed_events` + helper for money/stock/saga handlers |
| Secrets | `ci-no-secrets`; Variant B default | Enterprise profile refuses known secret env in image; document A path behind STATUS flag |
| Auth | PILOT forbids AUTH_DISABLE; dual issuer localhost/127.0.0.1; aud optional | Enterprise: require iss list; aud required when `JWT_AUDIENCE` set; azp allowlist; gateway rate-limit |
| Tenancy | Single-tenant-per-deployment contract | ADR-009 + runtime assert `DEDICATED_STACK`; no silent multi-tenant shared DB |

Key code anchors:

- `apps/shared-kernel/src/outbox-relay.ts` — GenericOutboxRelay v2 residual note on `lockedAt`  
- `apps/shared-kernel/src/jetstream/*` — flags, publish, consumer path  
- `apps/api-gateway/src/auth/verify-token.ts` — iss/aud  
- `apps/api-gateway/src/auth/auth-env.ts` — PILOT/enforce  
- `scripts/enterprise-2.0/gate-check.sh` — Q0 gate runner  

---

## Goals / Non-Goals

### Goals

- Enterprise profile env + compose snippet where `NATS_JETSTREAM=true` is mandatory and boot fails closed if mis-set  
- Outbox schema + relay: `lockedAt` set on claim; reclaim filters on `lockedAt`  
- `processed_events` (or equivalent) in shared pattern + wire critical consumers  
- Auth enterprise hard path + basic rate limit on gateway  
- ADR-009 Tenancy DEDICATED_STACK + enforcement sketch (env + middleware assert)  
- Live gates green under enterprise flags  

### Non-Goals

- Full multi-tenant SHARED_RLS  
- Temporal adoption (Q2)  
- Domain depth (Q1+)  
- History filter-repo without approval  
- Replacing Keycloak  

---

## Key Decisions

### KD-1 — JetStream mandatory on enterprise path

**Decision:** Enterprise runtime profile sets `NATS_JETSTREAM=true` and `ENTERPRISE=1` (or `ERP_PROFILE=enterprise`). Shared-kernel boot helper `assertEnterpriseMessaging()` throws if flag off under enterprise.  
**Alternative rejected:** Keep opt-in forever — fails ADR-008.  
**Consequence:** Local dev can remain pilot/core; CI enterprise job must set flags.

### KD-2 — Outbox `lockedAt` + multi-replica reclaim

**Decision:** Add nullable `DateTime? lockedAt` on `OutboxEvent` for all producer services (migration per service). On claim: set `lockedAt = now()`. Reclaim: `PROCESSING AND lockedAt < now - reclaimMinutes` (not `createdAt`). Prefer conditional update with version or status guard (existing). Document that consumers remain at-least-once.  
**Alternative rejected:** `SKIP LOCKED` only without timestamp — insufficient for crash reclaim.  
**Residual accepted:** Full FOR UPDATE SKIP LOCKED optional follow-up if Prisma/raw SQL needed per DB.

### KD-3 — Idempotent consumers via `processed_events`

**Decision:** Introduce shared helper + table pattern:

```text
processed_events(id PK, consumer_name, event_id UNIQUE(consumer_name,event_id), processed_at)
```

Start with finance WIP reverse, inv reservation/release, saga compensation handlers. Insert-before-side-effect or unique constraint catch.  
**Alternative rejected:** Rely only on JetStream msgID de-dupe — does not cover Nest residual paths or multi-handler same msgID semantics.

### KD-4 — Secrets Variant B

**Decision:** Default = no secrets in tree + CI; no history rewrite. Variant A only if STATUS `APPROVED_BY_USER_A: true`. Enterprise docs link to runbook; no automated filter-repo.  
**Alternative rejected:** Silent history rewrite in automation.

### KD-5 — Auth hard + rate limit

**Decision:**

- Under `ENTERPRISE=1` / `ERP_PROFILE=enterprise`: forbid AUTH_DISABLE / AUTH_ENFORCE=false (extend pilot checks).  
- Require non-empty issuer config (KEYCLOAK_ISSUER or JWT_ISSUER).  
- If `JWT_AUDIENCE` set, verify aud.  
- Optional `JWT_AZP_ALLOWLIST` (comma clients); if set, require azp/azp-like claim.  
- Gateway: simple token-bucket / sliding window per IP on `/api/*` (env-tuned; default on in enterprise).  

### KD-6 — Tenancy DEDICATED_STACK

**Decision:** ADR-009 states dedicated stack per tenant org. Runtime: `TENANCY_MODEL=DEDICATED_STACK` required under enterprise; log+fail if SHARED_RLS without STATUS human flip. Enforcement sketch: gateway injects single configured tenant; services reject mismatched `tenantId` claim vs `ERP_TENANT_ID`. Full RLS deferred to Q3 if ever chosen.

---

## Architecture (target Q0)

```text
[Clients] → [api-gateway: JWT iss/aud/azp + rate-limit + tenant inject]
                ↓ HTTP
        [domain services] ──TX──► outbox_event (lockedAt on claim)
                │
                ▼ GenericOutboxRelay
        [NATS JetStream only] ──msgID=outbox.id──► durable consumers
                │
                ▼ processed_events unique(consumer, event_id)
        [handlers money/stock/saga]
```

Enterprise compose profile:

- `NATS_JETSTREAM=true`  
- `ENTERPRISE=1`  
- Keycloak JWKS required  
- No `AUTH_ENFORCE=false`  

---

## Workstreams → implementation map

| ID | Workstream | Primary surfaces |
|----|------------|------------------|
| E0.1 | JetStream mandatory | `shared-kernel/jetstream`, service `main.ts` boot, compose enterprise, consumer dual-path audit |
| E0.2 | Outbox lockedAt | Prisma migrations all producers, `GenericOutboxRelay` claim/reclaim |
| E0.3 | processed_events | shared-kernel helper + finance/inv/saga consumers |
| E0.4 | Secrets B | docs + enterprise CI job `ci-no-secrets`; no filter-repo |
| E0.5 | Auth hard | `verify-token`, `auth-env`, rate-limit middleware |
| E0.6 | Tenancy ADR | ADR-009 + env assert + gateway/service sketch |

---

## Security

- No secrets in git; rotate any residual found by `ci-no-secrets`  
- Enterprise forbids auth bypass env  
- Rate limit reduces token spray  
- Tenant claim cannot escalate to another stack (dedicated)  
- JetStream ACLs deferred to Q3 network isolation  

## Risks

| Risk | Mitigation |
|------|------------|
| Migration churn across ~12 Outbox schemas | Shared migration SQL template; staged PR |
| Double-delivery during lockedAt rollout | Deploy relay after migrations; short reclaim window |
| Rate limit breaks e2e | High limit in pilot; enterprise defaults; smoke uses auth tokens |
| Dual Nest+JS still somewhere | Audit script in gate; fail if `@EventPattern` without preferJetStream guard for enterprise subjects |

---

## Testing / Gates (Q0)

From `milestones.json` + always-on:

```bash
bash scripts/ci-no-secrets.sh
pnpm run db:check:baselines
pnpm run check:no-float-money
pnpm run smoke:pilot
REQUIRE_LIVE=1 REQUIRE_LIVE_STRICT=1 pnpm run smoke:pilot
REQUIRE_LIVE=1 npx tsx scripts/smoke-outbox-live-hard.ts
REQUIRE_LIVE=1 REQUIRE_LIVE_STRICT=1 npx tsx scripts/smoke-saga-compensation.ts
bash scripts/enterprise-2.0/gate-check.sh Q0
```

Add (this milestone):

- Unit: GenericOutboxRelay reclaim uses `lockedAt`  
- Unit: processed_events helper de-dupes  
- Contract/smoke: enterprise profile refuses AUTH_ENFORCE=false  

---

## Rollout

1. Merge automation scaffold PR → master  
2. Branch `enterprise-0.1-platform` from master  
3. Execute PR Plan below in order  
4. GATE live  
5. PR → master, tag `enterprise-0.1-platform`  
6. Automation STATUS → Q1 DESIGN  

---

## Alternatives considered

| Option | Why not |
|--------|---------|
| Only docs/ADR without code | Fails “no readiness theater” |
| Shared DB RLS in Q0 | Human lock is DEDICATED_STACK; Q3+ |
| Temporal now | Q2 scope |
| Force JetStream on all local dev | Hurts velocity; enterprise profile only |

---

## Open questions (locked defaults)

| OQ | Default for automation |
|----|------------------------|
| SHARED_RLS? | No — DEDICATED_STACK |
| filter-repo A? | No — APPROVED_BY_USER_A false |
| Rate limit backend | In-process memory OK for single gateway replica; Redis later Q3 |

---

## PR Plan

### PR 1: Enterprise profile flags + JetStream assert

- **Dependencies:** none  
- **Files:**  
  - `apps/shared-kernel/src/jetstream/flags.ts` (enterprise assert)  
  - `apps/shared-kernel/src/index.ts` exports  
  - `apps/api-gateway/src/main.ts` (call assert early when ENTERPRISE)  
  - `docker-compose.enterprise.yml` or `infra/enterprise.env.example`  
  - `docs/ENTERPRISE-0.1-PLATFORM-DESIGN.md` (this file, already on branch)  
- **Description:** Introduce `ENTERPRISE=1` / `ERP_PROFILE=enterprise`. When set, require `NATS_JETSTREAM` truthy or fail boot. Document enterprise env. No domain changes.

### PR 2: Outbox lockedAt schema (all producers)

- **Dependencies:** PR 1  
- **Files:**  
  - `apps/*/prisma/schema.prisma` (OutboxEvent.lockedAt)  
  - `apps/*/prisma/migrations/*_outbox_locked_at/`  
  - `scripts/check-prisma-baselines.sh` still green  
- **Description:** Add `lockedAt DateTime?` to OutboxEvent across producer services with migrate-only migrations.

### PR 3: GenericOutboxRelay claim/reclaim on lockedAt

- **Dependencies:** PR 2  
- **Files:**  
  - `apps/shared-kernel/src/outbox-relay.ts`  
  - `apps/shared-kernel/test/outbox-relay.spec.ts`  
- **Description:** Set lockedAt on claim; reclaim by lockedAt age; update residual docs. Keep JetStream msgID path.

### PR 4: Dual-path consumer audit + enterprise subjects guard

- **Dependencies:** PR 1  
- **Files:**  
  - inventory of `@EventPattern` handlers (finance, inv, pm, proc, mes, …)  
  - apply `preferJetStreamConsumerPath()` no-op pattern where missing for enterprise-critical subjects  
  - optional `scripts/check-no-dual-nats-path.sh`  
- **Description:** No dual Nest+JS delivery on enterprise path for spine subjects.

### PR 5: processed_events helper + critical consumers

- **Dependencies:** PR 3  
- **Files:**  
  - `apps/shared-kernel/src/processed-events.ts` (new)  
  - finance reverse WIP / journal handlers  
  - inv reservation release path  
  - saga compensation smoke path if applicable  
  - Prisma model or raw SQL table per service that needs it (start finance + inv)  
- **Description:** Idempotent consume for money/stock/saga; unique (consumer, event_id).

### PR 6: Auth enterprise hard + rate limit

- **Dependencies:** PR 1  
- **Files:**  
  - `apps/api-gateway/src/auth/auth-env.ts`  
  - `apps/api-gateway/src/auth/verify-token.ts`  
  - `apps/api-gateway/src/auth/rate-limit.ts` (new)  
  - `apps/api-gateway/src/main.ts`  
- **Description:** Enterprise forbids auth bypass; require iss; optional aud/azp allowlist; IP rate limit.

### PR 7: ADR-009 Tenancy DEDICATED_STACK + enforcement sketch

- **Dependencies:** PR 6  
- **Files:**  
  - `docs/ADRs/ADR-009-Tenancy-Dedicated-Stack.md`  
  - gateway tenant inject assert vs `ERP_TENANT_ID`  
  - shared-kernel constant `TENANCY_MODEL`  
- **Description:** Lock tenancy model in code+docs; no SHARED_RLS implementation.

### PR 8: Secrets Variant B enterprise docs + CI wire

- **Dependencies:** none (can parallel PR 1)  
- **Files:**  
  - `docs/enterprise-2.0/SECRETS-VARIANT-B.md`  
  - ensure `ci-no-secrets` in enterprise gate (already)  
  - STATUS note APPROVED_BY_USER_A  
- **Description:** Document B path; refuse automated A.

### PR 9: Q0 live gate hardening + package scripts

- **Dependencies:** PR 3, PR 5, PR 6  
- **Files:**  
  - `scripts/enterprise-2.0/gate-check.sh` (enterprise env export)  
  - optional `smoke:enterprise:platform`  
  - STATUS / automation advance to RELEASE after pass  
- **Description:** Single entry for Q0 certification gates under ENTERPRISE=1.

---

## Implementation order (automation)

```text
PR1 → (PR2 → PR3) ∥ (PR4) ∥ (PR8) → PR5 → PR6 → PR7 → PR9 → GATE → RELEASE
```

Prefer serial safety if concurrency causes migrate conflicts: **1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9**.

---

## Success criteria

- Tag `enterprise-0.1-platform` on master  
- GATE exit 0 with live stack  
- ADR-008 + ADR-009 present  
- No secrets CI green  
- Outbox multi-replica residual closed for lockedAt  
- STATUS checklist Q0: done; phase advances to Q1 DESIGN  

---

## Self-review notes

- Aligns with ADR-008; no domain scope creep  
- PR Plan has explicit Dependencies / Files / Description  
- Honesty: pilot residuals cited from code comments  
- Automation-friendly: phases DESIGN→IMPLEMENT→GATE→RELEASE  

**DESIGN phase complete when this file is on branch and STATUS `phase: IMPLEMENT`.**
