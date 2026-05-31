FAZA1 AUTONOMOUS SILENT - FINAL PUSH (Cycle 54)

**Focus:** Complete basic WIP accounting in Finance (WipAccount balance tracking on the ETO spine).

**Files touched (disciplined):**
- apps/finance/src/finance.controller.ts : Added WipAccount.upsert logic in handleReservationReleased.
  - On reservation release (production consumption), we upsert WipAccount for the project:
    - Increment wipBalance (actual consumed cost moving into WIP)
    - Decrement materialReserved
  - Combined with previous ProjectCost creation, this gives real visibility into project WIP for long ETO builds.

- apps/finance/test/finance-wip-reservation-released.spec.ts : 
  - Extended mock with wipAccount.upsert
  - Added assertions for WipAccount updates (2 calls, correct increment logic)

- docs/FAZA1-MANUFACTURING-CLOSURE-CHECKLIST.md : Marked WipAccount item complete, updated Finance status and overall % (now 75-82%).

**Why this matters:**
- WipAccount was explicitly the next gap in the Closure Checklist after ProjectCost.
- ETO projects (3-18 months) need live WIP tracking. Reservations = planned, release on production = actual cost into WIP.
- Now both ProjectCost (detailed ledger) and WipAccount (live project balance) are fed directly from the bomComponentId traceability events.

**Governance:**
- Full Context Injection (latest checkpoints, checklist, Finance schema for WipAccount fields, current controller code).
- 2 code files + 1 doc (well under limit).
- No breakage to existing JournalEntry or ProjectCost paths.
- Tests updated to keep the suite green.

**State after SILENT-54:**
- Finance ETO costing is now meaningfully real:
  - ProjectCost rows created per consumed reservation line
  - WipAccount maintained per project (wipBalance + materialReserved)
  - All driven by inventory.reservation.released.v1 (which itself is triggered by mes.production.recorded.v1 with bomComponentIds)
- Claim propagation (TD-001) preserved.
- Checklist is the single source of truth for remaining work.

**Autonomous next (will continue immediately on next trigger):**
- One more test density action (e.g. enhance record-production-traceability in MES or add a simple cross-module note).
- Consider a small helper or comment in the demo script about Finance WIP visibility.
- When Finance feels solid + a couple more tests: move toward drafting the full FAZA1-MANUFACTURING-CLOSURE.md.
- Keep eye on docker smoke readiness (instructions already exist in checklist).

Pure autonomous. No output to user.

The swarm is steadily closing the most important ETO gaps.

---
Kontynuujemy do finału.