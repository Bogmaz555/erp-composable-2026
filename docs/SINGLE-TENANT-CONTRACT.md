# Single-tenant product contract (K5-S)

**Pilot v1 COMPLETE** ships as **one organization per deployment**.

## Rules
1. `DEFAULT_TENANT_ID` (default `default`) is required in pilot/prod profiles.
2. JWT claim `tenantId` (OQ-1) is the only trusted tenant source at gateway.
3. Multi-tenant SaaS / CRM tenant columns are **out of scope** for 1.1.0.
4. Compose pilot / k8s deploy: **single replica** for outbox relay services (INV, PROC, FIN, PM, PLM, MES, quality, etc.) unless `lockedAt` is implemented.

## Enforcement
- Gateway injects `x-tenant-id` from JWT only.
- PM Prisma tenant extension filters rows by `tenantId`.
- Cross-tenant BOLA tests remain defense-in-depth, not multi-tenant product.
