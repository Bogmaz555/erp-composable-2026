# Tenant Isolation Hardening Policy (W140 / Pilot PR 15)

## Model (honest scope)

**Single-tenant per deployment** for Pilot v1: one organization per stack.

`tenantId` is a **row-level defense-in-depth** filter (mis-seed / config error safety net), **not** a multi-tenant SaaS product. Cross-tenant probes with two tenantIds in one DB prove the filter; they do not commit us to shared multi-tenant hosting.

## Claim and propagation

| Surface | Name | Notes |
|---------|------|--------|
| JWT / Keycloak claim | **`tenantId`** | OQ-1 resolved — canonical claim name |
| Legacy JWT fallback | `tenant` | Accepted only if `tenantId` absent |
| Gateway → services | `x-tenant-id` | Spoofed inbound headers dropped; set only from verified claims |
| Events / workers | `payload.tenantId` | Prefer event field; else `DEFAULT_TENANT_ID` |

## Shared implementation (source of truth)

**Only** `apps/shared-kernel/src/tenant-extension.ts`:

- Prisma client extension: merge `tenantId` into list/filter mutations; force on create
- **`findUnique` → rewritten to `findFirst({ …uniqueFields, tenantId })`** — never inject `tenantId` into `findUnique` `where` (illegal when `@id` is `id` alone, not `@@unique([id, tenantId])`)
- **AsyncLocalStorage** `runWithTenant` / `runWithTenantAsync` for NATS/cron workers (no HTTP REQUEST scope)
- `system-tenant` allowed **only** when `ALLOW_SYSTEM_TENANT=true` (migrate/seed jobs)

### Service adoption status

| Service | Status |
|---------|--------|
| **PM** | `isolatedClient` → real `extendPrismaWithTenant` (`modelsWithTenantId: 'all'`) |
| **CRM** | Extension **wired**; schema still **has no `tenantId` columns** → `modelsWithTenantId: []` (honest no row filter until schema gains fields) |
| **INV / FIN / MES / PROC / …** | Models mostly have `tenantId`; Prisma services not yet universally wrapped — app-level filters + event `tenantId` remain; workers sample-wired with `runWithTenant` (INV material-request, FIN WIP reverse, CRM finance events) |

## Prisma operation rules

| Operation | Strategy |
|-----------|----------|
| `findMany`, `findFirst`, `count`, `aggregate`, `updateMany`, `deleteMany` | Merge `where` with `tenantId` |
| `create` / `createMany` | Force `data.tenantId` |
| **`findUnique`** | Rewrite to **`findFirst({ where: { id, tenantId } })`** |
| **`upsert`** | `findFirst` + `update`/`create` with tenant |
| `update` / `delete` by id | Tenant-scoped load then mutate by `id` |
| `$queryRaw` | **Forbidden** without bound `tenantId` (code review; not auto-injected) |

## Checks

1. Gateway drops spoofed `x-tenant-id` / `x-user-id` / `x-roles`, re-injects from JWT (`tenantId` claim)
2. Analytics `/tenants/:id/isolation` snapshot per module (best-effort)
3. Cross-tenant probe: `default` vs `isolation-test` snapshots (defense-in-depth)
4. PROC tenant middleware enforces header (legacy path)
5. **`scripts/smoke-tenant-isolation.ts`** — structure + ALS + findUnique rewrite unit (two-tenant mock denial)

## CI Gate

| Flag / script | Purpose |
|---------------|---------|
| `CI_TENANT_HARDENING=true` → `scripts/ci-tenant-hardening-probe.ts` | File / endpoint presence |
| `pnpm run smoke:tenant-isolation` → `scripts/smoke-tenant-isolation.ts` | PR 15 shared extension + worker ALS + claim name |

## Residual risk (accepted for pilot)

- CRM domain tables without `tenantId` — extension wired but does not filter rows yet
- Services without `isolatedClient` still rely on explicit `where: { tenantId }` in handlers
- Raw SQL / admin paths must stay out of pilot write surfaces
- Multi-tenant SaaS is **out of scope** (see design KD-2 / A1 rejected)
