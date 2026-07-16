# ERP 2026 – Feature Expansion Roadmap (do poziomu enova365 / Comarch XL / SAP / D365)

**Status:** żywy dokument · **Start:** 2026-06-05
**Cel:** Dociągnąć głębię funkcjonalną i wygodę UX do klasy enterprise, na bazie istniejącego (mocnego) szkieletu zdarzeń.

## Decyzje kierunkowe (zatwierdzone)

1. **Start:** Fundament UX + Kartoteka Produktów.
2. **Architektura danych podstawowych:** jedna centralna **Kartoteka Produktów (Product/Article Master)** jako źródło prawdy. Właścicielem zostaje **PLM** (ma już `Item` + relacje do BOM). INV i CRM stają się subskrybentami synchronizowanymi zdarzeniami `product.*`.
3. **Ambicja:** docelowo głębia klasy enova/SAP w wybranych obszarach.

## Diagnoza stanu (z analizy luk)

- **Mocne:** architektura DDD+CQRS+NATS+DB-per-service; pełny event spine CRM→PM→PLM→INV→PROC→MES→Finance→KSeF; logika domenowa (BOM release, rezerwacje, WIP, milestone billing).
- **Słabe:** głębia CRUD i UX w UI; część API brakuje mimo gotowych modeli (CRM katalog/zadania/dokumenty); brak ekranów (HR, Tax, Kartoteka Produktów, genealogia INV); Finance AR/AP to mocki.

## Warstwy realizacji

### Warstwa 0 — Fundament UX + Kartoteka Produktów  ✅ ZAMKNIĘTA (2026-06-05)
- Wspólne komponenty UI: `DataTable` (filtry/sort/paginacja), `FormField`, `Modal`, toasty.
- **Kartoteka Produktów (PLM Item Master)**: pogłębiony model + pełne CRUD API (lista z filtrami, detal, edycja, dezaktywacja) + zdarzenia `product.created/updated/deactivated.v1` + ekran UI (lista, szukajka, dodawanie, edycja, detal).
- Nawigacja: pozycja „Kartoteka Produktów".

### Warstwa 1 — Domknięcie CRUD we wszystkich modułach (użytkowy MVP)  ✅ ZAMKNIĘTA (2026-06-05)
- CRM: API katalogu, zadań, dokumentów, aktywności, BOM ✅; synchronizacja `product.*` → INV ✅ + CRM ✅.
- PLM: edytor BOM (drzewo, dodawanie komponentów, release) ✅; legacy `/boms` persist komponentów ✅.
- INV: zakładki Stany / Partie SN / Genealogia (forward+backward) ✅; API `POST/GET lots` ✅.
- PROC: kartoteka dostawców + ręczne PO ✅.
- Finance: realne AR/AP z bazy (Payable/Receivable) ✅; event-driven z PO approve + KSeF.
- Nowe ekrany: HR (kadry/RCP) ✅, Tax/KSeF (rejestr faktur) ✅.

### Warstwa 2 — Głębia enterprise (wybrane obszary)  ✅ ZAMKNIĘTA (2026-06-05)
- MES: routingi + operacje + zbieranie pracy + OEE ✅ (W2-M01: API + kiosk UI + hook `useMES`).
- PROC/INV: MRP II ✅ (W2-M04); WMS picking + bins ✅ (W2-M06); landed cost ✅ (W4-M04).
- Finance: GL ✅ (W2-M03); budżet vs wykonanie ✅ (W2-M08); środki trwałe ✅ (W5-M01).
- PM: EVM ✅ (W2-M02); harmonogram + ścieżka krytyczna ✅ (W2-M07); baseline Gantt + resource leveling ✅ (W5-M02).
- Quality: plany kontroli + AQL/sampling ✅ (W2-M05); SPC ✅ (W4-M02); ISO 9001 rejestr dokumentacji ✅ (W6-M04).
- Tax PL: JPK_V7M ✅ (W4-M03); KSeF produkcyjny ✅ (W6-M03, env-gated).

### Warstwa 3 — Wygoda „premium"  ✅ ZAMKNIĘTA (2026-06-05)
- Globalna wyszukiwarka ✅ (W3-M01: `GET /analytics/search` + ⌘K UI).
- Dashboardy BI/KPI per moduł ✅ (W3-M02: `GET /analytics/kpi` + ModuleKpiGrid).
- Audyt + powiadomienia ✅ (W3-M03: audit/notifications z NATS).
- Import/eksport CSV ✅ (W3-M04: export/import produktów + INV w Data Hub).
- Role/uprawnienia w UI ✅ (W4-M01: AuthContext + /settings/roles).

### Warstwa 4 — Głębia enterprise (dokończenie luk)  ✅ ZAMKNIĘTA (2026-06-05)
- W4-M01: RBAC UI — macierz ról, przełącznik dev, ekran `/settings/roles` ✅
- W4-M02: Quality SPC — cechy, pomiary, X-bar, Cp/Cpk ✅
- W4-M03: Tax JPK_V7M — generowanie ewidencji sprzedaży ✅
- W4-M04: PROC landed cost — koszt w pełni obciążony przy przyjęciu ✅
- Pipeline: `pnpm run pipeline:warstwa4` + `pnpm run pipeline:full` ✅

### Warstwa 5 — Domknięcie enterprise + workflow  ✅ ZAMKNIĘTA (2026-06-05)
- W5-M01: Finance środki trwałe — amortyzacja liniowa, `FixedAssetsPanel` ✅
- W5-M02: PM baseline Gantt — snapshot, wariancja, resource leveling ✅
- W5-M03: Workflow approvals — inbox w TopBar, NATS ingest ✅
- W5-M04: MES mobile kiosk — `/mes/kiosk` touch UI ✅
- Pipeline: `pnpm run pipeline:warstwa5` + rozszerzony `pipeline:full` ✅

### Warstwa 6 — Production readiness  ✅ ZAMKNIĘTA (2026-06-05)
- W6-M01: FA → GL auto-posting (D 402-DEP / C 071-FA-ACC) ✅
- W6-M02: Multi-tenant — `TenantSelector`, `GET /analytics/tenants` ✅
- W6-M03: KSeF production router (`KSEF_MODE=production`) + status panel ✅
- W6-M04: ISO 9001 — `IsoDocument`, compliance score, panel QMS ✅
- Pipeline: `pnpm run pipeline:warstwa6` + `pipeline:full` (W2–W6) ✅

### Warstwa 7 — Zaawansowane enterprise  ✅ ZAMKNIĘTA (2026-06-05)
- W7-M01: PM Interactive Gantt (`gantt-task-react`, drag dat, import CSV) ✅
- W7-M02: Tenant isolation — filtrowanie FA/ISO/approvals po `X-Tenant-Id` ✅
- W7-M03: JPK_KR — księga rachunkowa z GL (`GET /tax-legal/jpk/kr`) ✅
- W7-M04: E2E smoke (`smoke:e2e:w7`) + powiadomienia przy approve/reject ✅
- Pipeline: `pnpm run pipeline:warstwa7` + `pipeline:full` (W2–W7) ✅

### Warstwa 8 — Autonomous orchestration  ✅ ZAMKNIĘTA (2026-06-05)
- W8-M01: Playwright E2E (`e2e/erp-ui.spec.ts`, `pnpm run test:e2e`) ✅
- W8-M02: MS Project XML import (`POST /pm/projects/:id/schedule/import-xml`) ✅
- W8-M03: Email workflow — outbox + SMTP (`WORKFLOW_NOTIFY_EMAIL`, `GET /mail/outbox`) ✅
- W8-M04: Continuous 24/7 worker (`pnpm run worker:loop`) ✅
- Pipeline: `pnpm run pipeline:warstwa8` + `worker:continuous` ✅

### Warstwa 9 — Master orchestration  ✅ ZAMKNIĘTA (2026-06-05)
- W9-M01: Finance prod boot (`ensure-finance-prod.sh`, `start:fin:prod` w `boot:all`) ✅
- W9-M02: Command Center API (`GET /analytics/command-center`) ✅
- W9-M03: Master regression report (`regression-report.json`) ✅
- W9-M04: Master orchestrator worker (`pnpm run worker:master`) ✅
- W9-M05: CommandCenterPanel na dashboardzie ✅
- Pipeline: `pnpm run pipeline:warstwa9` + `pipeline:full` (W2–W9) ✅

### Warstwa 10 — Enterprise hardening  ✅ ZAMKNIĘTA (2026-06-05)
- W10-M01: PROC tenant isolation (`TenantMiddleware`, filtrowanie PO) ✅
- W10-M02: MSP XML PredecessorLink → `TaskDependency` ✅
- W10-M03: JPK_KR walidacja MF (`GET /jpk/kr/validate`) ✅
- W10-M04: GitHub Actions CI (contracts + regression + Playwright) ✅
- W10-M05: Frontend tenant-aware PROC + JPK validate panel ✅
- Pipeline: `pnpm run pipeline:warstwa10` + `pipeline:full` (W2–W10) ✅

### Warstwa 11 — Production path  ✅ ZAMKNIĘTA (2026-06-05)
- W11-M01: PROC DB fix (`ensure-databases.sh`, poprawiony `.env`) ✅
- W11-M02: Tenant isolation snapshot + provision (`/tenants/:id/isolation`) ✅
- W11-M03: PM MSP XML export z PredecessorLink ✅
- W11-M04: LoginButton + `fetchWithAuth` (Keycloak-ready) ✅
- W11-M05: TenantIsolationPanel + `preboot:all` DB sync ✅
- Pipeline: `pnpm run pipeline:warstwa11` + `pipeline:full` (W2–W11) ✅

### Warstwa 12 — ETO Traceability & Auth Stack  ✅ ZAMKNIĘTA (2026-06-05)
- W12-M01: Traceability Spine API (`GET /traceability/spine`) ✅
- W12-M02: INV genealogy seed-demo + analytics seed ✅
- W12-M03: MSP round-trip smoke (`smoke:msp-roundtrip`) ✅
- W12-M04: `boot-docker-stack.sh` + `ensure-auth-stack.sh` ✅
- W12-M05: PROC schema-per-tenant (`POST /orders/tenant-schema/ensure`) ✅
- W12-M06: TraceabilitySpinePanel na dashboardzie ✅
- Pipeline: `pnpm run pipeline:warstwa12` + `pipeline:full` (W2–W12) ✅

### Warstwa 13 — ETO Live Chain  ✅ ZAMKNIĘTA (2026-06-05)
- W13-M01: ETO chain orchestrator (`GET/POST /eto-chain/*`) ✅
- W13-M02: Live NATS smoke (`smoke:eto-live`) ✅
- W13-M03: Keycloak token auto-parse (hash fragment) ✅
- W13-M04: EtoChainPanel — one-click demo chain ✅
- W13-M05: Pipeline W13 + full pipeline W2–W13 ✅

### Warstwa 14 — Persistent Saga & Mission Worker  ✅ ZAMKNIĘTA (2026-06-05)
- W14-M01: Persistent ETO saga (`eto-sagas.json`) ✅
- W14-M02: PLM ETO Explosion (`POST /eto-chain/plm-explosion` + UI) ✅
- W14-M03: Auth enforce smoke (`smoke:auth-enforce`) ✅
- W14-M04: Mission worker (`worker:mission`) ✅
- W14-M05: Full stack boot (`boot:full`) ✅
- Pipeline: `pnpm run pipeline:warstwa14` + `pipeline:full` (W2–W14) ✅

### Warstwa 15 — DB Saga & Auth Enforce E2E  ✅ ZAMKNIĘTA (2026-06-05)
- W15-M01: EtoSaga Prisma (`analytics-db` :5445) + dual-write JSON fallback ✅
- W15-M02: 7-step NATS ETO smoke (`smoke:eto-live`) ✅
- W15-M03: AUTH_ENFORCE E2E (`smoke:auth-e2e`) ✅
- W15-M04: EtoChainPanel — historia sag + badge store ✅
- W15-M05: Pipeline W15 + `pipeline:full` (W2–W15) ✅

### Warstwa 16 — Saga Compensation & Production Auth  ✅ ZAMKNIĘTA (2026-06-05)
- W16-M01: `ensure-keycloak-ready.sh` — retry token + health wait ✅
- W16-M02: Saga compensation (`POST /eto-chain/compensate`, `EtoSagaCompensation`) ✅
- W16-M03: `boot-production-profile.sh` — AUTH_ENFORCE=true gateway ✅
- W16-M04: Playwright `eto-dashboard-chain` + `eto-plm-explosion` ✅
- W16-M05: Pipeline W16 + `pipeline:full` (W2–W16) ✅

### Warstwa 17 — NATS Compensation & Durable Orchestrator  ✅ ZAMKNIĘTA (2026-06-05)
- W17-M01: NATS compensation publisher (`natsPublished` on compensate) ✅
- W17-M02: `EtoOrchestrationJob` + background worker (5s tick) ✅
- W17-M03: `boot:all:auth` + `boot:auth` (AUTH_ENFORCE gateway) ✅
- W17-M04: Playwright `eto-full-chain.spec.ts` ✅
- W17-M05: Pipeline W17 + `pipeline:full` (W2–W17) ✅

### Warstwa 18 — INV/MES Compensation Rollback  ✅ ZAMKNIĘTA (2026-06-05)
- W18-M01: INV `SagaCompensationController` (NATS rollback listeners) ✅
- W18-M02: MES `SagaCompensationController` (cancel WO, reverse production) ✅
- W18-M03: Multi-tenant orchestrator (`tenantId` on jobs) ✅
- W18-M04: `smoke:compensation-rollback` ✅
- W18-M05: Pipeline W18 + `pipeline:full` (W2–W18) ✅

### Warstwa 19 — Stock Rollback & Temporal Workflow  ✅ ZAMKNIĘTA (2026-06-05)
- W19-M01: INV real stock rollback (Item/StockLevel/Lot increment) ✅
- W19-M02: YAML workflow `infra/workflows/eto-machine-build-v1.yaml` ✅
- W19-M03: `boot:smart` — `ERP_AUTH_ENFORCE=true` → `boot:all:auth` ✅
- W19-M04: Playwright `eto-plm-explosion-full` ✅
- W19-M05: Pipeline W19 + `pipeline:full` (W2–W19) ✅

### Warstwa 20 — Workflow-Driven Orchestrator  ✅ ZAMKNIĘTA (2026-06-05)
- W20-M01: Orchestrator czyta kroki z YAML (`EtoWorkflowService.getStepIds()`) ✅
- W20-M02: `smoke:workflow-orchestrator` + `smoke:plm-explosion-api` ✅
- W20-M03: MES auto-restart w pipeline (fix compensation 502) ✅
- W20-M04: Temporal docker profile (`pnpm run boot:temporal`) ✅
- W20-M05: Pipeline W20 + `pipeline:full` (W2–W20) ✅

### Warstwa 21 — Temporal Bridge & Stock Delta  ✅ ZAMKNIĘTA (2026-06-05)
- W21-M01: `EtoTemporalBridgeService` + `GET/POST /eto-chain/temporal/*` ✅
- W21-M02: INV `seed-released` + `smoke:stock-delta` (quantity verify) ✅
- W21-M03: `worker:temporal-bridge:loop` + `boot:prod:smart` ✅
- W21-M04: EtoChainPanel temporal/lite badge ✅
- W21-M05: Pipeline W21 + `pipeline:full` (W2–W21) ✅

### Warstwa 22 — Workflow Timeouts & Build All  ✅ ZAMKNIĘTA (2026-06-05)
- W22-M01: YAML step timeouts → orchestrator schedule + stale job recovery ✅
- W22-M02: `nest-build-all.sh` + `pnpm run build:all:nest` ✅
- W22-M03: `.env.erp` profile + `erp-env.sh` (`ERP_AUTH_ENFORCE`) ✅
- W22-M04: `GET /eto-chain/workflow/timeouts` + UI badge + smoke ✅
- W22-M05: Pipeline W22 + `pipeline:full` (W2–W22) ✅

### Warstwa 23 — Inkrementalna wartość APEX (bez rewolucji)  ✅ ZAMKNIĘTA (2026-06-05)
- W23-M01: Long-Lead Radar w PROC (`source: LONG_LEAD`, `proc.longlead.detected.v1`) ✅
- W23-M02: Universal Journal lite w finance (`GET /fin/universal-journal`) ✅
- W23-M03: `assertEtoOperationalPayload` + contract test ✅
- W23-M04: `.cursor/rules/erp-eto-incremental.mdc` ✅
- W23-M05: Pipeline W23 + regression (+2 endpointy) ✅

### Warstwa 24 — APEX dokończenie + payload hardening  ✅ ZAMKNIĘTA (2026-06-06)
- W24-M01: Double BOM w PLM (`subBomVersionId`, explosion, `GET /bom-versions/:id/double-bom`) ✅
- W24-M02: Hook `assertEtoOperationalPayload` w handlerach PM/INV ✅
- W24-M03: Panel long-lead w `MrpPanel.tsx` ✅
- W24-M04: Regression + PLM boms + contract test double-bom ✅
- W24-M05: Pipeline W24 + checkpoint ✅

### Warstwa 25 — Auth & Gateway hardening (TD-001/TD-002 → 🟡)  ✅ ZAMKNIĘTA (2026-06-06)

### Warstwa 26 — OTel / Jaeger (TD-009 → 🟡)  ✅ ZAMKNIĘTA (2026-06-06)
- W26-M01: Docker profile `otel` + Jaeger (:4318, :16686) ✅
- W26-M02: `GET /analytics/otel/status` ✅
- W26-M03: `smoke:otel` + `pnpm run boot:otel` ✅
- W26-M04: PRODUCTION-READINESS OTel → 🟡 ✅
- W26-M05: Pipeline W26 ✅

### Warstwa 27 — Genealogia INV chain ETO (TD-004 partial)  ✅ ZAMKNIĘTA (2026-06-06)
- W27-M01: `GET /inv/inventory/genealogy/chain/:serial` + summary ✅
- W27-M02: UI GenealogyPanel tab Chain ETO ✅
- W27-M03: smoke + contract test genealogy-chain ✅
- W27-M04: Regression endpoint ✅
- W27-M05: Pipeline W27 ✅

### Warstwa 28 — Outbox dead-letter dashboard (TD-008 → 🟡)  ✅ ZAMKNIĘTA (2026-06-06)
- W28-M01: `GET /outbox/dead-letter` w inv/proc/quality ✅
- W28-M02: `GET /analytics/outbox/dead-letter` aggregate ✅
- W28-M03: `smoke:outbox-dlq` ✅
- W28-M04: Alerting ⛔→🟡 (dashboard only) ✅
- W28-M05: Pipeline W28 ✅

### Warstwa 29 — Saga orchestrator readiness (TD-003 → 🟡)  ✅ ZAMKNIĘTA (2026-06-06)
- W29-M01: `GET /analytics/eto-chain/saga/readiness` ✅
- W29-M02: Orchestrator + temporal + workflow aggregate ✅
- W29-M03: `smoke:saga-readiness` + regression ✅
- W29-M04: TD-003 → 🟡 (yellow-minimum) ✅
- W29-M05: Pipeline W29 ✅

### Warstwa 30 — Regression stabilność  ✅ ZAMKNIĘTA (2026-06-06)
- W30-M01: FE auto-detect :3000/:3001 ✅
- W30-M02: UI optional gdy frontend down ✅
- W30-M03: Outbox DLQ optional w regression ✅
- W30-M04: Required vs optional score split ✅
- W30-M05: `boot-regression-pipeline.sh` + pipeline W30 ✅

### Warstwa 31 — EAM IoT lite (Faza 4)  ✅ ZAMKNIĘTA (2026-06-06)
- W31-M01: `BreakdownEvent` persist + POST /eam/breakdown ✅
- W31-M02: `GET /eam/iot/status` + `/eam/breakdowns/recent` ✅
- W31-M03: UI IoT strip na `/eam` ✅
- W31-M04: Contract test + `smoke:eam-iot` ✅
- W31-M05: Pipeline W31 ✅

### Warstwa 32 — NestJS overrides (TD-010 → 🟡)  ✅ ZAMKNIĘTA (2026-06-06)
- W32-M01: `pnpm-workspace.yaml` overrides @nestjs/* → 11.1.19 ✅
- W32-M02: `infra/nestjs-version-canonical.json` + audit ✅
- W32-M03: `GET /analytics/platform/nestjs-versions` ✅
- W32-M04: `@fastify/http-proxy` v10 + smoke ✅
- W32-M05: Pipeline W32 ✅

### Warstwa 33 — Finance prod boot + regression  ✅ ZAMKNIĘTA (2026-06-06)
- W33-M01: `ensure-finance-prod` w boot-regression ✅
- W33-M02: Dynamic finance required gdy :4010 up ✅
- W33-M03: `smoke:finance-prod` ✅
- W33-M04: Regression z finance prod ✅
- W33-M05: Pipeline W33 ✅

### Warstwa 34 — Observability stack (TD-008/TD-009)  ✅ ZAMKNIĘTA (2026-06-06)
- W34-M01: Fix OTel/outbox controller routing ✅
- W34-M02: `GET /analytics/platform/observability/readiness` ✅
- W34-M03: Dynamic OTel/outbox required w regression ✅
- W34-M04: smoke + contract test ✅
- W34-M05: Pipeline W34 ✅

### Warstwa 35 — Full stack regression  ✅ ZAMKNIĘTA (2026-06-06)
- W35-M01: boot-regression + Jaeger + finance ✅
- W35-M02: Observability + finance smoke ✅
- W35-M03: Regression 47/47 pełny stack ✅
- W35-M04: `pipeline:warstwa35` ✅
- W35-M05: Stabilny gate CI-ready ✅

### Warstwa 36 — Central audit log (TD-013 → 🟡)  ✅ ZAMKNIĘTA (2026-06-06)
- W36-M01: Structured audit fields (category, severity, actor, entity, correlation) ✅
- W36-M02: `GET /platform/audit/readiness` + `/platform/audit/summary` ✅
- W36-M03: Audit filters (`category`, `complianceOnly`) ✅
- W36-M04: Data Hub UI — filtry compliance + TD-013 badge ✅
- W36-M05: `smoke:audit-readiness` + regression + pipeline W36 ✅

### Warstwa 37 — Auth readiness (TD-001 → 🟡)  ✅ ZAMKNIĘTA (2026-06-06)
- W37-M01: `GET /platform/auth/readiness` — RBAC matrix + manufacturing guards ✅
- W37-M02: `smoke:auth-readiness` + auth-enforce smoke ✅
- W37-M03: Contract test + regression ✅
- W37-M04: `pipeline:warstwa37` ✅

### Warstwa 38 — Boot dev UX (TD-011 → 🟡)  ✅ ZAMKNIĘTA (2026-06-06)
- W38-M01: `boot-all-smart.sh` — ulimit, FRONTEND_PORT auto, skip if stack up ✅
- W38-M02: `resolve-frontend-port.sh` + `/tmp/erp-frontend.port` ✅
- W38-M03: `GET /platform/boot/readiness` ✅
- W38-M04: `smoke:boot-readiness` + FE detect ERP-only w regression ✅
- W38-M05: `pipeline:warstwa38` ✅

### Warstwa 39 — Genealogy E2E (TD-004 partial → 🟡)  ✅ ZAMKNIĘTA (2026-06-06)
- W39-M01: `GET /traceability/e2e/readiness` — spine + chain aggregate ✅
- W39-M02: `smoke:genealogy-e2e` + auto seed ✅
- W39-M03: Contract test + regression ✅
- W39-M04: `pipeline:warstwa39` ✅

### Warstwa 40 — Production readiness aggregate  ✅ ZAMKNIĘTA (2026-06-06)
- W40-M01: `GET /platform/production/readiness` — 6 TD checks aggregate ✅
- W40-M02: `smoke:production-readiness` ✅
- W40-M03: Contract test + regression 56/56 ✅
- W40-M04: `pipeline:warstwa40` ✅
- ⛔ Vault/TLS/mTLS — świadomie odłożone (wymaga infry prod)

### Warstwa 41 — Production Readiness UI  ✅ ZAMKNIĘTA (2026-06-06)
- W41-M01: `ProductionReadinessPanel.tsx` na dashboardzie `/` ✅
- W41-M02: TanStack Query + glassmorphism badge score ✅
- W41-M03: `pipeline:warstwa41` ✅

### Warstwa 42 — Gateway proxy readiness (TD-002 → 🟡)  ✅ ZAMKNIĘTA (2026-06-06)
- W42-M01: `GET /platform/gateway/readiness` — proxy route probes ✅
- W42-M02: `OperationsService.getGatewayReadiness()` (FA, PM, INV, HR) ✅
- W42-M03: `smoke:gateway-readiness` + contract test ✅
- W42-M04: Regression check Gateway readiness ✅
- W42-M05: `pipeline:warstwa42` ✅

### Warstwa 43 — ETO payload guard coverage (TD-004b → 🟡)  ✅ ZAMKNIĘTA (2026-06-06)
- W43-M01: `GET /platform/eto-payload/readiness` — guarded handler registry ✅
- W43-M02: `assertEtoOperationalPayload` w MES `record-production.handler` ✅
- W43-M03: Production readiness rozszerzone: 8 checks (TD-002 + TD-004b) ✅
- W43-M04: `smoke:eto-payload` + contract test ✅
- W43-M05: `pipeline:warstwa43` — PASS ✅

### Warstwa 44 — Full stack boot hardening (TD-011 ext → 🟡)  ✅ ZAMKNIĘTA (2026-06-06)
- W44-M01: `scripts/ensure-core-stack.sh` — 14 serwisów auto-start ✅
- W44-M02: `GET /platform/stack/readiness` — manufacturing/finance/platform groups ✅
- W44-M03: `boot-regression-pipeline` → ensure-core-stack ✅
- W44-M04: `smoke:stack-readiness` + contract test + regression 59/59 ✅
- W44-M05: `pipeline:warstwa44` — PASS ✅

### Warstwa 45 — Tax-Legal readiness (TD-005 → 🟡)  ✅ ZAMKNIĘTA (2026-06-06)
- W45-M01: `GET /platform/tax/readiness` — KSeF + JPK probes ✅
- W45-M02: Production readiness rozszerzone: 9 checks (TD-005) ✅
- W45-M03: `smoke:tax-readiness` + contract test ✅
- W45-M04: Regression 60/60 @ 100% ✅
- W45-M05: `pipeline:warstwa45` — PASS ✅

### Warstwa 46 — Genealogy E2E view + UI (TD-004 → 🟡)  ✅ ZAMKNIĘTA (2026-06-06)
- W46-M01: `GET /traceability/e2e/view` — 5-stage spine aggregate ✅
- W46-M02: UI tab E2E Spine w GenealogyPanel ✅
- W46-M03: `smoke:genealogy-e2e-view` + contract test ✅
- W46-M04: Regression 61/61 @ 100% ✅
- W46-M05: `pipeline:warstwa46` — PASS ✅

### Warstwa 47 — MES ETO spine (TD-004d → 🟡)  ✅ ZAMKNIĘTA (2026-06-07)
- W47-M01: `GET /health/eto` na mes-service ✅
- W47-M02: `GET /platform/mes/readiness` ✅
- W47-M03: Fix traceability spine MES probe ✅

### Warstwa 48 — Event Registry readiness (TD-012 lite → 🟡)  ✅ ZAMKNIĘTA (2026-06-07)
- W48-M01: `GET /platform/pact/readiness` — 18 Active events ✅
- W48-M02: smoke + contract test ✅

### Warstwa 49 — Production readiness v3  ✅ ZAMKNIĘTA (2026-06-07)
- W49-M01: 13 TD checks aggregate ✅
- W49-M02: ready @ 9/13, full stack 13/13 ✅

### Warstwa 50 — FINAL Production Hardening  ✅ ZAMKNIĘTA (2026-06-07)
- W50-M01: `pipeline:final` ✅
- W50-M02: Regression 63/63 @ 100% ✅
- W50-M03: `FAZA5-FINAL-CLOSURE.md` ✅

### Warstwa 51 — PLM SAP-deep (Faza 6 Domain Depth)  ✅ ZAMKNIĘTA (2026-06-07)
- W51-M01: `GET /boms/versions/:id/explosion` — multi-level BOM explosion ✅
- W51-M02: `GET /ecos/:id/impact` — ECO impact analysis + persist `impactSummary` ✅
- W51-M03: `GET /platform/plm-domain/readiness` ✅
- W51-M04: Contract **32/32**, regression **64/64** @ 100% ✅
- Pipeline: `pnpm run pipeline:warstwa51` ✅

### Warstwa 52 — MES SAP-deep  ✅ ZAMKNIĘTA (2026-06-07)
- W52-M01: `GET /routing/aggregate` — work center routing summary ✅
- W52-M02: `/platform/mes-domain/readiness` ✅
- Pipeline: `pnpm run pipeline:warstwa52` ✅

### Warstwa 53 — Finance SAP-deep  ✅ ZAMKNIĘTA (2026-06-07)
- W53-M01: `GET /fin/projects/:id/wip-breakdown` — cost type rollup ✅
- W53-M02: `/platform/finance-domain/readiness` ✅
- Pipeline: `pnpm run pipeline:warstwa53` ✅

### Warstwa 54 — FINAL Domain Depth  ✅ ZAMKNIĘTA (2026-06-07)
- W54-M01: `pipeline:domain-final` — 3-domain aggregate gate ✅
- W54-M02: Regression **66/66** @ 100% ✅
- W54-M03: `FAZA6-FINAL-CLOSURE.md` ✅

### Warstwa 55 — Quality SAP-deep  ✅ ZAMKNIĘTA (2026-06-07)
- W55-M01: `GET /capa/aggregate` ✅
- W55-M02: `/platform/quality-domain/readiness` ✅

### Warstwa 56 — Procurement SAP-deep  ✅ ZAMKNIĘTA (2026-06-07)
- W56-M01: `GET /mrp/aggregate` ✅
- W56-M02: `/platform/proc-domain/readiness` ✅

### Warstwa 57 — EAM SAP-deep  ✅ ZAMKNIĘTA (2026-06-07)
- W57-M01: `GET /eam/maintenance/aggregate` ✅
- W57-M02: `/platform/eam-domain/readiness` ✅

### Warstwa 58 — FINAL Extended Domain Depth  ✅ ZAMKNIĘTA (2026-06-07)
- W58-M01: `pipeline:extended-domain-final` — 6-domain gate ✅
- W58-M02: Regression **69/69** @ 100% ✅
- W58-M03: `FAZA7-FINAL-CLOSURE.md` ✅

## Zasada synchronizacji danych podstawowych

```
PLM (Product Master, źródło prawdy)
  └─ product.created.v1 / product.updated.v1 / product.deactivated.v1  (Outbox → NATS)
       ├─ INV  → upsert lokalnej kartoteki magazynowej (Item: sku=partNumber)
       └─ CRM  → upsert pozycji katalogowej (CatalogItem)
```

*Dokument aktualizowany wraz z postępem prac.*
