# ERP 2026 – Central Event Registry

**Wersja:** 0.9 (Faza 0 – MISSION-002)  
**Status:** W budowie  
**Ostatnia aktualizacja:** 2026-06 (SILENT-61)

---

## Instrukcja Użycia

Ten dokument jest **Single Source of Truth** dla wszystkich zdarzeń w systemie.

**Zasady:**
- Każdy event musi mieć swój plik w `docs/EVENTS/{nazwa}.md`
- Przed dodaniem nowego eventu — sprawdź ten rejestr
- Zmiana payloadu = nowa wersja + nowy plik + aktualizacja tego rejestru
- `erp-guardian` blokuje pracę, jeśli event jest używany w kodzie bez wpisu w rejestrze

---

## Eventy wg Bounded Context

### CRM
- `crm.opportunity.accepted.v1` — **Active**
- CRM consumes `finance.payment.milestone.reached.v1`, `tax.invoice.ksef.sent.v1` — **Active** (updates paymentMilestones JSON)
- `crm.lead.created.v1` — **Planned**

### Project Management (PM)
- `pm.project.created.v1` — **Planned**
- `pm.project.released.v1` — **Planned**
- `pm.material.requested.v1` — **Active** (Faza 1B — Outbox from RequestMaterial, bomComponentId)
- PM consumes `plm.bom.released.v2` — **Active** (@EventPattern in pm-service)
- PM consumes `proc.purchaseorder.approved.v1` — **Active**
- PM consumes `quality.ncr.raised.v1`, `quality.ncr.closed.v1` — **Active**
- PM consumes `eam.breakdown.detected.v1`, `eam.maintenance.scheduled.v1` — **Active**

### Manufacturing Execution (MES)
- `mes.workorder.created.v1` — **Planned**
- `mes.workorder.started.v1` — **Planned**
- `mes.production.recorded.v1` — **Active** (INV release + Finance LABOR/OVERHEAD) — see `mes.production.recorded.v1.md`
- `mes.workorder.completed.v1` — **Planned**
- `mes.workorder.failed.v1` — **Planned**

### PLM
- `plm.item.created.v1` — **Planned**
- `plm.bom.released.v2` — **Active** (Faza 1)
- `plm.eco.approved.v1` — **Planned**
- `plm.bom.changed.v1` — **Planned**

### Inventory
- `inv.stock.out.v1` — **Active** (SHORTAGE → Procurement auto PO; Outbox relay)
- `inventory.stock.reserved.v1` — **Planned** (legacy name; see reservation.created)
- `inventory.reservation.created.v1` — **Active** (Faza 1 – ETO traceability, links to bomComponentId)
- `inventory.reservation.released.v1` — **Active** (Faza 1 – emitted on production complete / consumption)
- `inventory.stock.released.v1` — **Planned**
- `inventory.lot.created.v1` — **Planned** (traceability critical)
- `inventory.stock.transaction.created.v1` — **Planned** (from StockTransaction model)

### Procurement
- `proc.purchaseorder.created.v1` — **Active** (MRP + shortage)
- `proc.purchaseorder.approved.v1` — **Active** (PM WBS update)
- `proc.material.received.v1` — **Active** (goods receipt → INV stock)

### Finance
- Finance consumes `proc.purchaseorder.approved.v1` — **Active** (MATERIAL commitment + 201-AP)
- `finance.payment.milestone.reached.v1` — **Active** (Faza 2 — PM FAT/SAT → MilestoneBilling → TaxLegal)
- `finance.revenue.recognized.v1` — **Active** (po KSeF — revenue recognition)
- `finance.journal.entry.created.v1` — **Planned**
- `finance.invoice.issued.v1` — **Planned** (przez TaxLegal)
- `finance.payment.received.v1` — **Planned**

### Quality
- `quality.ncr.raised.v1` — **Active** (Outbox → PM fever / WBS hold)
- `quality.ncr.closed.v1` — **Active**
- `quality.capa.created.v1` — **Active** (CAPA ISO 9001 §10.2)
- `quality.capa.verified.v1` — **Active**
- Quality consumes `proc.material.received.v1`, `mes.workorder.completed.v1` — **Active** (auto inspection)
- `quality.inspection.completed.v1` — **Planned**

### TaxLegal (specjalny status)
- `tax.invoice.ksef.sent.v1` — **Active** (Faza 2 — KSeF sandbox/mock po milestone)
- `tax.jpk.generated.v1` — **Planned**

### EAM
- `eam.maintenance.scheduled.v1` — **Active**
- `eam.breakdown.detected.v1` — **Active** (IoT stub → PM/MES)

### HR
- `hr.time.entry.recorded.v1` — **Active** (Faza 2 — Finance LABOR booking)

### Removed (legacy — usunięte w SILENT-78)
- `inventory.stock_depleted` — **Removed** → kanoniczny `inv.stock.out.v1`
- `procurement.order.approved` — **Removed** → kanoniczny `proc.purchaseorder.approved.v1`

---

## Status Legend

- **Active** — Event jest już emitowany w kodzie
- **Planned** — Zdefiniowany w blueprintach, do implementacji w Fazie 1+
- **Deprecated** — Nie używać, istnieje nowsza wersja
- **Removed** — Usunięty z kodu po migracji konsumentów

---

## Statystyki (aktualne na zamknięcie Fazy 0)

- Eventy udokumentowane: 10
- Bounded contexts pokryte: 8/11
- Najważniejsze missing do Fazy 1: pełne traceability events (as-built), więcej tax-legal events, labor tracking events

---

**Aktualizuj ten plik przy każdej zmianie eventów.**
