# Tenant Isolation Hardening Policy (W140)

## Scope

Row-level tenant isolation via `X-Tenant-Id` header propagated by API Gateway.

## Checks

1. Gateway injects `x-tenant-id` (default `public` when missing)
2. Analytics `/tenants/:id/isolation` snapshot per module
3. Cross-tenant probe: `default` vs `isolation-test` snapshots
4. PROC tenant middleware enforces header

## CI Gate

`CI_TENANT_HARDENING=true` → `scripts/ci-tenant-hardening-probe.ts`
