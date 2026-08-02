# ADR-009: Tenancy model — DEDICATED_STACK default

**Status:** Accepted  
**Date:** 2026-08-02  
**Baseline:** pilot-v1.1.0 / Enterprise Q0  
**Related:** ADR-003 (DB per service), ADR-008 (non-negotiables), `docs/SINGLE-TENANT-CONTRACT.md`, `docs/ENTERPRISE-2.0-STATUS.md`

## Context

Pilot v1 ships as **one organization per deployment** with JWT `tenantId` as defense-in-depth row filter. Enterprise 2.0 automation must lock the product tenancy model so agents cannot silently implement multi-tenant SaaS RLS without a human STATUS change.

## Decision

### Default: `DEDICATED_STACK`

| Layer | Behavior |
|-------|----------|
| **Deploy** | One compose / Helm release / DR stack **per customer organization** |
| **Config** | `DEFAULT_TENANT_ID` (default `default`) fixed for the stack |
| **Gateway** | Only JWT claim `tenantId` is trusted; client-supplied `x-tenant-id` is stripped and re-injected from verified claims |
| **Data** | Prisma `tenant-extension` row filter remains defense-in-depth (single real tenant per DB) |
| **Messaging** | NATS subjects are **not** multi-tenant partitioned; isolation = network + credentials + stack boundary |
| **STATUS lock** | `docs/ENTERPRISE-2.0-STATUS.md` field `tenancy: DEDICATED_STACK` |

### Change control

- Flip to `SHARED_RLS` **only** by human edit of STATUS (`tenancy: SHARED_RLS`) + design ADR amendment.
- Automation and agents **must not** implement SHARED_RLS product paths while STATUS says `DEDICATED_STACK`.

### Enforcement sketch (Q0)

1. Document STATUS as source of lock (this ADR).
2. Gateway strips spoofed tenant headers (already pilot).
3. Enterprise env sample documents `TENANCY_MODEL=DEDICATED_STACK`.
4. Outbox multi-replica allowed when `lockedAt` + consumer idempotency present (Q0 E0.2/E0.3) — still **one tenant per stack**.

### Future: `SHARED_RLS` (out of Q0 scope)

If STATUS flips:

- Shared Postgres with Postgres RLS policies per tenant
- Connection pooler SET `app.tenant_id`
- Stronger cross-tenant BOLA suite becomes product gate
- NATS subject or header tenancy strategy required

## Consequences

- Simpler ops and clearer blast radius per customer.
- Cost scales with number of customer stacks (accepted for enterprise path until Q3+).
- Multi-tenant SaaS is explicitly **not** the enterprise-0.1 product.

## Rejected alternatives

| Alt | Why rejected for default |
|-----|--------------------------|
| SHARED_RLS as default | Higher leak risk; needs Q3-scale isolation program |
| No tenant claim at all | Loses defense-in-depth and future migration path |
| Schema-per-tenant in one cluster | Ops complexity without ADR-003 alignment |
