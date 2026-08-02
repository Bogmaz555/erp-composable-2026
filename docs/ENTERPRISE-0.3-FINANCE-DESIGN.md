# Enterprise 0.3 — Finance Tax Quality EAM Temporal Design (Q2)

| Field | Value |
|-------|-------|
| **Document** | Enterprise Q2 Finance / Tax / Quality / EAM / Temporal |
| **Repo** | `/home/bogdan-mazur/PROGRAMY/ERP/erp-composable-2026` |
| **Baseline** | `enterprise-0.2-eto-spine` (after Q1) + `pilot-v1.1.0` |
| **Target tag** | `enterprise-0.3-finance-compliance` |
| **Branch** | `enterprise-0.3-finance-compliance` |
| **Status** | **IMPLEMENT complete — ready for GATE** |
| **Date** | 2026-08-02 |
| **Tenancy** | **DEDICATED_STACK** |
| **Non-negotiables** | ADR-008, ENTERPRISE-2.0-PLAN |

---

## Overview

Q0 certified platform (auth, JetStream, outbox lockedAt). Q1 hardened ETO manufacturing spine. **Q2** closes the **money, compliance, quality, asset, and long-running saga** layer so enterprise ETO can invoice, compensate, CAPA, and maintain without demo shortcuts.

**In scope workstreams (milestones.json):**

1. Finance journal AR/AP period close  
2. KSeF prod-capable path  
3. Quality NCR CAPA full  
4. EAM real IoT adapter interface  
5. Temporal (or equivalent) for ETO/finance/proc sagas  
6. Full financial compensations  

**Out of scope:** multi-region, SHARED_RLS, mass-production MES, Faza 29+ readiness theater.

---

## Background (honest residuals)

| Area | Current code | Gap for enterprise |
|------|--------------|--------------------|
| Finance | Universal journal, project costing, WIP reverse (PR16), KSeF revenue on `tax.invoice.ksef.sent.v1` | No formal **period close**; AR/AP thin; compensations incomplete beyond WIP reverse |
| Tax/KSeF | `KsefSandboxService` + `KsefProductionService` + `KsefRouterService` env-gated | Prod path needs cert/token lifecycle, fail-closed when `KSEF_MODE=production` without config; evidence pack |
| Quality | NCR/CAPA controllers + aggregates exist (`ncr-capa-production`, `capa-aggregate`) | Event-driven full CAPA chain + outbox TX consistency; e2e path |
| EAM | `eam-iot.controller` / production services | Adapter interface is stubby; need contract + one real adapter shape (MQTT/HTTP mock ok if interface real) |
| Saga/Temporal | G-lite orchestrator; TD-003 Temporal **non-DoD for pilot** | Enterprise Q2: Temporal **or equivalent durable** for ETO/finance/proc — not only G-lite status probe |
| Compensations | `ReverseWipCost` + correlationId | Expand: reservation release, PO cancel financial side, revenue reverse on KSeF fail |

Anchors:

- `apps/finance/src/universal-journal.service.ts`, `commands/reverse-wip-cost.handler.ts`  
- `apps/tax-legal/src/ksef-*.ts`, `tax-legal.controller.ts`  
- `apps/quality-service/src/ncr-capa-production.*`, `capa-aggregate.*`  
- `apps/eam-service/src/eam-iot.controller.ts`  
- `docs/TECHNICAL-DEBT.md` TD-003, F2-TAX  

---

## Goals / Non-Goals

### Goals

- Period-close command + blocked postings when period CLOSED  
- KSeF production profile runnable with env secrets (not git) + sandbox default  
- CAPA lifecycle events outbox-safe; NCR → CAPA link enforced  
- `IotAdapter` interface + at least one concrete adapter (HttpWebhook or Mqtt stub with tests)  
- Temporal worker package **or** documented durable saga runner with workflow defs for ETO fail-step + finance reverse  
- Compensations matrix implemented for money-moving ETO steps  

### Non-Goals

- Full Polish accounting suite (only ETO-critical AR/AP skeleton)  
- Replacing Keycloak  
- Real factory PLC drivers  

---

## Key Decisions

### KD-Q2-1 — Period close first-class

**Decision:** `AccountingPeriod` model (or table) per tenant with status OPEN|CLOSING|CLOSED. Postings (journal, WIP reverse) refuse CLOSED. Close is explicit command with actor audit.  
**Alt rejected:** Soft “don’t post in UI only”.

### KD-Q2-2 — KSeF prod-capable ≠ always prod

**Decision:** Keep router: `KSEF_MODE=sandbox|production`. Production requires `KSEF_TOKEN` / cert paths from env or Vault; fail boot of tax-legal under ENTERPRISE if mode=production and missing. Sandbox remains default for gates.  
**Alt rejected:** Hardcode production credentials.

### KD-Q2-3 — Temporal preferred, G-lite retained

**Decision:** Introduce Temporal workflows for (1) ETO fail-step compensation, (2) KSeF send + revenue recognize, (3) optional PO receive. Keep G-lite as fallback when `TEMPORAL_ADDRESS` unset (feature flag). Gate does **not** require live Temporal cluster if fallback path proven — but code + worker must exist and unit-test.  
**Honesty:** Live Temporal in CI optional; structure + local docker temporal (already `erp-temporal` in stack) preferred when up.

### KD-Q2-4 — Compensations matrix

| Forward | Compensation |
|---------|----------------|
| WIP post | `finance.wip.cost.reversed` (exists) |
| INV reserve | `inventory.reservation.released.v1` |
| KSeF send / revenue | reverse revenue journal keyed by correlationId |
| PO commit (if money) | release commitment |

### KD-Q2-5 — Quality CAPA events

**Decision:** NCR open → CAPA create → CAPA close emit outbox events with ProcessedEvent idempotency on consumers.

### KD-Q2-6 — EAM IoT interface

**Decision:**

```ts
interface IotAdapter {
  readonly name: string;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  publishTelemetry(assetId: string, payload: Record<string, unknown>): Promise<void>;
  onAlarm?(handler: (alarm: IotAlarm) => void): void;
}
```

`HttpIotAdapter` implements against configurable webhook URL; tests with mock server.

---

## Architecture (target)

```text
[ETO / PM / MES] --events--> [Temporal workflows | G-lite fallback]
                                  |
                    +-------------+-------------+
                    v             v             v
               [Finance]     [Tax/KSeF]    [Quality]
               period close  prod router   NCR/CAPA
               compensations outbox TX     outbox TX
                    |
               [EAM IoT adapter] --telemetry--> maintenance triggers
```

---

## PR Plan

### PR 1: Accounting period + close API

- **Dependencies:** none  
- **Files:** `apps/finance/prisma/schema.prisma`, migration, `period-close.service.ts`, controller, journal guards  
- **Description:** OPEN/CLOSED periods; refuse posts when CLOSED; admin close command.

### PR 2: AR/AP skeleton + journal links

- **Dependencies:** PR 1  
- **Files:** finance AR/AP models or minimal Invoice/Payable refs, journal entry type extensions  
- **Description:** Minimal AR invoice / AP bill records linked to journal for ETO billing path (not full ERP finance).

### PR 3: KSeF production fail-closed + evidence

- **Dependencies:** none (parallel PR 1)  
- **Files:** `ksef-production.service.ts`, `ksef-router.service.ts`, `tax-legal` boot assert, `docs/enterprise-2.0/KSEF-RUNBOOK.md`  
- **Description:** ENTERPRISE + KSEF_MODE=production requires config; sandbox default; status endpoint honest.

### PR 4: Full financial compensations

- **Dependencies:** PR 1  
- **Files:** reverse handlers (revenue, reservation side-effects if missing), saga compensation publisher, tests  
- **Description:** Implement matrix KD-Q2-4; smoke extends saga compensation.

### PR 5: Quality NCR→CAPA full outbox path

- **Dependencies:** none  
- **Files:** quality NCR/CAPA services, prisma if needed, outbox TX writes, event registry docs  
- **Description:** Complete lifecycle with events; no empty catch on outbox.

### PR 6: EAM IotAdapter + Http adapter

- **Dependencies:** none  
- **Files:** `apps/eam-service/src/iot/iot-adapter.ts`, `http-iot.adapter.ts`, wire controller, unit tests  
- **Description:** Real interface + one adapter; no fake “readiness only”.

### PR 7: Temporal workflows + worker package

- **Dependencies:** PR 4  
- **Files:** `packages/temporal-workflows` or `apps/temporal-worker`, workflow defs, activities calling HTTP/NATS, env `TEMPORAL_ADDRESS`  
- **Description:** Durable ETO compensation + KSeF/revenue workflows; G-lite fallback when Temporal down.

### PR 8: Q2 gate hardening + docs

- **Dependencies:** PR 4, PR 5, PR 7  
- **Files:** `milestones.json` gate cmds, optional `smoke:enterprise:q2`, STATUS  
- **Description:** Gate remains live smoke:pilot + saga compensation; document Temporal optional live.

---

## Implementation order

```text
PR1 → PR2
PR3 ∥ PR5 ∥ PR6
PR1 → PR4 → PR7 → PR8 → GATE → RELEASE
```

Serial safe default: **1 → 2 → 3 → 4 → 5 → 6 → 7 → 8**.

---

## Testing / Gates

```bash
REQUIRE_LIVE=1 REQUIRE_LIVE_STRICT=1 pnpm run smoke:pilot
REQUIRE_LIVE=1 REQUIRE_LIVE_STRICT=1 npx tsx scripts/smoke-saga-compensation.ts
bash scripts/enterprise-2.0/gate-check.sh Q2
# optional if temporal up:
# TEMPORAL_ADDRESS=localhost:7233 pnpm --filter temporal-worker test
```

Unit: period close blocks post; KSeF prod missing config throws; CAPA outbox; IotAdapter mock; Temporal workflow unit with test env.

---

## Risks

| Risk | Mitigation |
|------|------------|
| Temporal ops burden | Flag + G-lite fallback; use existing `erp-temporal` container |
| Scope creep full accounting | PR2 skeleton only |
| KSeF real certs unavailable | Sandbox default; prod fail-closed documented |
| Double compensation | ProcessedEvent + correlationId unique |

---

## Success criteria

- Tag `enterprise-0.3-finance-compliance`  
- GATE Q2 exit 0  
- Period close enforced in code  
- KSeF router honest in enterprise  
- CAPA event path + EAM adapter interface + Temporal (or proven fallback)  
- STATUS checklist Q2: done → Q3 DESIGN  

---

## Self-review

- Workstreams map 1:1 to PR plan  
- No Faza 29+  
- Residuals cited from TD-003 / code  
- Automation-friendly ## PR Plan with ### PR N  

**DESIGN complete when this file committed and STATUS phase=IMPLEMENT.**
