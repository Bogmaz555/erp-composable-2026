# E2 — Domain Depth ETO Design

## Goal
Deepen dedicated-stack ETO path without breaking enterprise auth/messaging baseline.

## Key Decisions
| ID | Decision |
|----|----------|
| KD-E2-1 | Happy path = CRM lead → PM project → PLM BOM release → PROC PO → INV reserve → MES WO → FIN WIP |
| KD-E2-2 | Each step emits versioned events + outbox (no dual-write) |
| KD-E2-3 | UAT path documented in `docs/enterprise-roadmap/E2-UAT-PATH.md` |
| KD-E2-4 | Full 2.3.0 tag only after smoke:pilot:eto green + UAT checklist rows checked |

## Workstreams → PR slices

### PR 1: UAT path + E2 design (this)
### PR 2: CRM→PM accept opportunity → create project
### PR 3: PLM BOM release → PROC long-lead
### PR 4: INV/MES/FIN compensation depth
### PR 5: UX ETO week + RBAC nav polish

## Security
All mutations via gateway JWT; tenantId default.

## Risks
Scope explosion → slice PRs; residual if e2e incomplete.

## PR Plan

### PR 1: E2 design + UAT path scaffold
Docs only; STATUS → IMPLEMENT for code slices.

### PR 2–5
See workstreams; each ends with gate slice green.

## Delivery note (2026-08-03)

**Shipped in first E2 code slice:** CRM pipeline ACCEPTED → outbox `crm.opportunity.won.v1` → PM project (NATS + HTTP `POST /projects/from-opportunity`), frontend CRM gateway URL fix, smoke-e2-crm-pm.

**Residual PR 3–5:** PLM long-lead, INV/MES/FIN depth, UX RBAC polish — continue on E3 or follow-up E2.x if needed. Tag `enterprise-2.3.0` marks CRM→PM spine hardening + UAT path, not full domain complete.
