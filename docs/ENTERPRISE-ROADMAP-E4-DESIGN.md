# E4 — Multi-tenant Design

## Decision: DEFERRED

| Field | Value |
|-------|--------|
| Tenancy | **DEDICATED_STACK** remains |
| SHARED_RLS | Not adopted in this program |
| Tag enterprise-3.0.0 | **Not cut** until ADR + isolation gates |

## Rationale
- CRM models still lack `tenantId` columns (honest residual from 2.1)
- Business model for multi-customer SaaS not locked
- Dedicated stack provision (E3) covers multi-customer via clone

## When to open E4
1. ADR approved for SHARED_RLS or hybrid  
2. STATUS `tenancy: SHARED_RLS`  
3. Isolation e2e green  

Until then: **E4 = DEFERRED**, program may close after E3.
