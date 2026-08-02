# Saga min chaos evidence (K6)

**Date:** 2026-08-02  
**Evidence:** `REQUIRE_LIVE_STRICT=1 npx tsx scripts/smoke-saga-compensation.ts`

1. Seed WIP balance 100 for unique projectId  
2. Publish `finance.wip.cost.reversed` twice (same correlationId)  
3. Assert WIP balance 0  
4. Assert exactly **one** ProjectCost REVERSAL (idempotent)  
5. Assert JournalEntry source=SAGA_COMPENSATION  

In-scope compensations: WIP reverse (+ reservation restore if wired).  
Out of scope: full BOM unrelease, Temporal SDK.
