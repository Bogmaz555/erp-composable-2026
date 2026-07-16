# ERP Composable 2026 — Stan Projektu (pełne podsumowanie)

**Ostatnia aktualizacja:** 2026-06-08  
**Bieżąca warstwa:** **FINAL** — Faza 28 K8sExtended TenantHardening KSeFProd (W142) ✅

---

## 1. Czym jest ten projekt

Composable ERP dla produkcji jednostkowej (ETO) — architektura mikroserwisowa, DDD, CQRS, NATS + Outbox, database-per-service. Poziom: **zaawansowany POC / demo sprzedażowe enterprise**.

---

## 2. Co jest zrobione (skrót faz)

| Faza / obszar | Status | Kluczowe osiągnięcia |
|---------------|--------|----------------------|
| **Faza 0** Governance | ✅ 100% | GOVERNANCE, ADR 001–007, Event Registry, blueprinty modułów |
| **Faza 1** Manufacturing | ✅ ~90% pilotaż | Traceability spine (`bomComponentId`), PLM→PM→MES→INV, genealogy, Keycloak dev |
| **Faza 2** Finance + Tax | ✅ ~85% | Milestone FAT/SAT, KSeF, WIP costing, HR labor → Finance |
| **Faza 3** Procurement | ✅ ~72% | MRP/SHORTAGE → PO → approve → receive → INV |
| **Faza 4** Quality + EAM | ✅ ~55% pilotaż | NCR, CAPA, breakdown events, IoT lite (W31) |
| **Warstwy W0–W35** UX + ETO + observability | ✅ W35 | Patrz roadmap |

### Najmocniejsze fragmenty kodu
- CRM + CPQ (milestone billing FAT/SAT)
- PM z CCPM (fever zones, bufory)
- Pełny event spine ETO (7+ kroków saga, orchestrator, compensation, Temporal bridge)
- Frontend glassmorphism + TanStack Query + moduły BI/KPI
- Contract tests + pipeline autonomiczny (W2–W35)

### Naprawy operacyjne (2026-06-06)
- **HR DB** — `apps/hr/.env` port 5443 (było 5432/5440), `/api/hr/employees` OK
- **Finance build** — `ignoreDeprecations: 6.0` → `nest-build-all` PASS
- **Prisma CLI** — `ensure-databases.sh` + `prisma-migrate-deploy.sh` → `prisma@5.22.0`
- **Regression** — 49 checks (+ HR employees, Tax health)

### FINAL — Faza 5 Production Hardening (W47–W50) ✅
- **W47** — MES ETO spine: `/health/eto`, `/platform/mes/readiness`
- **W48** — TD-012 lite: `/platform/pact/readiness` (18 Active events)
- **W49** — Production readiness **13 TD checks** @ 100%
- **W50** — Final pipeline `pnpm run pipeline:final`
- Contract tests: **30/30** | Regression: **63/63** @ 100%

### Faza 6 — Domain Depth (W51–W54) ✅
- **W51** PLM · **W52** MES · **W53** Finance · **W54** `pipeline:domain-final`
- Contract **37/37** | Regression **66/66**

### Faza 8 — Data Trust (W59–W62) ✅
- Live cost-summary, import preview, data-integrity readiness

### Faza 9 — Security & Import (W63–W66) ✅
- **W63** — `/platform/auth-enforcement/readiness`
- **W64** — Import staging (stage/commit/rollback)
- **W65** — `/platform/validation/readiness`
- **W66** — `pnpm run pipeline:faza9-final`
- Contract **53/53** | Regression **73/73** @ 100%

### Faza 10 — BI & Persistence (W67–W70) ✅
- **W67** — `GET /bi/projects/:id/dashboard` + `/platform/bi-readiness/readiness`
- **W68** — `/platform/ci-auth/readiness` (CI auth profile)
- **W69** — Prisma `ImportStagingBatch` + `/platform/import-staging/readiness`
- **W70** — `pnpm run pipeline:faza10-final`
- Contract **58/58** | Regression **76/76** @ 100%

### Faza 11 — Frontend BI & Projections (W71–W74) ✅
- **W71** — Frontend PM BI panel + `/platform/frontend-bi/readiness`
- **W72** — `CI_AUTH_ENFORCE=true` w GitHub Actions + `ci-contract-gate.sh`
- **W73** — Prisma `BiProjectSnapshot` + `/platform/bi-projection/readiness`
- **W74** — `pnpm run pipeline:faza11-final`
- Contract **62/62** | Regression **78/78** @ 100%

### Faza 12 — BI Scheduler & CI Auth (W75–W78) ✅
- **W75** — BI refresh scheduler + `/platform/bi-scheduler/readiness`
- **W76** — Playwright `e2e/pm-bi-panel.spec.ts` + `/platform/pm-e2e/readiness`
- **W77** — `ci-auth-enforce-probe.ts` + `/platform/ci-auth-enforce/readiness`
- **W78** — `pnpm run pipeline:faza12-final`
- Contract **66/66** | Regression **81/81** @ 100%

### Faza 13 — Retention & CI Live (W79–W82) ✅
- **W79** — BI snapshot TTL retention + `/platform/bi-retention/readiness`
- **W80** — Playwright CI probe + `/platform/playwright-ci/readiness`
- **W81** — Auth enforce live CI job + `/platform/ci-auth-live/readiness`
- **W82** — `pnpm run pipeline:faza13-final`
- Contract **70/70** | Regression **84/84** @ 100%

### Faza 14 — Metrics & CI Regression (W83–W86) ✅
- **W83** — BI retention metrics (JSON + Prometheus) + `/platform/bi-metrics/readiness`
- **W84** — Playwright stack boot CI + `/platform/playwright-stack/readiness`
- **W85** — AUTH_ENFORCE regression probe + `/platform/ci-auth-regression/readiness`
- **W86** — `pnpm run pipeline:faza14-final`
- Contract **74/74** | Regression **87/87** @ 100%

### Faza 15 — Grafana & CI Hardening (W87–W90) ✅
- **W87** — Grafana dashboard `bi-snapshot-metrics.json` + `GET bi/metrics/grafana/dashboard` + `/platform/grafana-bi/readiness`
- **W88** — Playwright PM BI required (no `continue-on-error`) + `/platform/playwright-required/readiness`
- **W89** — Keycloak auth regression probe + `/platform/ci-auth-keycloak/readiness`
- **W90** — `pnpm run pipeline:faza15-final`
- Contract **78/78** | Regression **90/90** @ 100%

### Faza 16 — Observability & CI Prod (W91–W94) ✅
- **W91** — Prometheus + Grafana provisioning (`observability` profile) + `/platform/grafana-provision/readiness`
- **W92** — Playwright module matrix (PM/Finance/INV) + `/platform/playwright-matrix/readiness`
- **W93** — AUTH_ENFORCE prod profile + mandatory `auth-enforce-live` + `/platform/ci-auth-enforce-prod/readiness`
- **W94** — `pnpm run pipeline:faza16-final`
- Contract **82/82** | Regression **93/93** @ 100%

### Faza 17 — Alerts, Matrix Ext & Vault (W95–W98) ✅
- **W95** — BI retention alert rules + Alertmanager + `/platform/bi-alerts/readiness`
- **W96** — Playwright matrix ext (PROC + Quality) — 5 module specs
- **W97** — Vault + TLS dev (`prod-security` profile) + `/platform/vault-tls-prod/readiness`
- **W98** — `pnpm run pipeline:faza17-final`
- Contract **86/86** | Regression **95/95** @ 100%

### Faza 18 — Notify, Matrix MES/EAM & mTLS (W99–W102) ✅
- **W99** — Alertmanager Slack/email channels + `/platform/alert-notify/readiness`
- **W100** — Playwright matrix +MES +EAM (7 module specs)
- **W101** — Gateway mTLS sidecar `:4445` + `/platform/mtls-gateway/readiness`
- **W102** — `pnpm run pipeline:faza18-final`
- Contract **90/90** | Regression **97/97** @ 100%

### Faza 19 — Escalation, Matrix CRM/Tax & mTLS Proxy (W103–W106) ✅
- **W103** — PagerDuty/Opsgenie escalation + `/platform/alert-escalation/readiness`
- **W104** — Playwright matrix +CRM +Tax (9 module specs)
- **W105** — Full mTLS proxy `:4446` → `:4005` + `/platform/mtls-proxy/readiness`
- **W106** — `pnpm run pipeline:faza19-final`
- Contract **94/94** | Regression **99/99** @ 100%

### Faza 20 — Oncall, Matrix 11-Mod & Client mTLS (W107–W110) ✅ FINAL
- **W107** — Alertmanager on-call `time_intervals` + `/platform/alert-oncall/readiness`
- **W108** — Playwright matrix +HR +PLM (**11 modules** — full UI coverage)
- **W109** — Client-cert mTLS verify on gateway proxy + `/platform/mtls-client-verify/readiness`
- **W110** — `pnpm run pipeline:faza20-final`
- Contract **98/98** | Regression **101/101** @ 100%

### Faza 21 — SLO Burn-Rate, Cross-Chain E2E & TLS Rotation (W111–W114) ✅ FINAL
- **W111** — Prometheus multi-window SLO burn-rate alerts + `/platform/slo-burn-rate/readiness`
- **W112** — Playwright cross-module chain PM→Finance→Tax + CI job `playwright-cross-chain`
- **W113** — TLS cert rotation automation (`rotate-tls-certs.sh`, 90-day policy)
- **W114** — `pnpm run pipeline:faza21-final`
- Contract **102/102** | Regression **104/104** @ 100%

### Faza 22 — SLO Dashboard, PROC→INV→Quality & Vault Secrets (W115–W118) ✅ FINAL
- **W115** — Grafana SLO error budget dashboard + `/platform/grafana-slo-dashboard/readiness`
- **W116** — Playwright cross-module chain PROC→INV→Quality + CI job `playwright-proc-inv-quality-chain`
- **W117** — Vault KV secrets rotation (`rotate-vault-secrets.sh`, 90-day policy)
- **W118** — `pnpm run pipeline:faza22-final`
- Contract **106/106** | Regression **107/107** @ 100%

### Faza 23 — SLO Alerting, MES→EAM→CRM & Vault KMS (W119–W122) ✅ FINAL
- **W119** — Grafana SLO alerting → Alertmanager + `/platform/slo-alerting/readiness`
- **W120** — Playwright cross-module chain MES→EAM→CRM + CI job `playwright-mes-eam-crm-chain`
- **W121** — Vault KMS auto-unseal dev stub + `/platform/vault-kms-unseal/readiness`
- **W122** — `pnpm run pipeline:faza23-final`
- Contract **110/110** | Regression **110/110** @ 100%

### Faza 24 — SLO Routing, HR→PLM→PM & Vault Audit (W123–W126) ✅ FINAL
- **W123** — SLO critical → PagerDuty/Opsgenie + `/platform/slo-routing/readiness`
- **W124** — Playwright HR→PLM→PM chain + CI job `playwright-hr-plm-pm-chain`
- **W125** — Vault audit logging + `/platform/vault-audit/readiness`
- **W126** — `pnpm run pipeline:faza24-final`
- Contract **114/114** | Regression **113/113** @ 100%

### Faza 25 — Prod Observability, Chain Matrix & Vault HA (W127–W130) ✅ FINAL
- **W127** — `prod-observability` compose profile + `/platform/prod-observability/readiness`
- **W128** — Playwright all cross-chains matrix + CI job `playwright-all-chains-matrix`
- **W129** — Vault HA stub (`vault-ha` :8201) + `/platform/vault-ha/readiness`
- **W130** — `pnpm run pipeline:faza25-final`
- Contract **118/118** | Regression **116/116** @ 100%

### Faza 26 — K8s Deploy, Visual Regression & Vault Raft (W131–W134) ✅ FINAL
- **W131** — K8s manifests (`infra/k8s/deploy/`) + `/platform/k8s-deploy/readiness`
- **W132** — Playwright visual baseline + CI job `playwright-visual-baseline`
- **W133** — Vault Raft cluster (`vault-raft` :8202) + `/platform/vault-raft/readiness`
- **W134** — `pnpm run pipeline:faza26-final`
- Contract **122/122** | Regression **119/119** @ 100%

### Faza 27 — Helm, Visual Diff Gate & Quality/EAM Production (W135–W138) ✅ FINAL
- **W135** — Helm chart (`infra/helm/erp/`) + `/platform/helm-deploy/readiness`
- **W136** — Playwright visual diff strict CI + `/platform/playwright-visual-diff/readiness`
- **W137** — NCR/CAPA + EAM production endpoints + `/platform/quality-eam-prod/readiness`
- **W138** — `pnpm run pipeline:faza27-final`
- Contract **126/126** | Regression **122/122** @ 100%

### Faza 28 — K8s Extended, Tenant Hardening & KSeF Prod (W139–W142) ✅ FINAL
- **W139** — K8s extended manifests (PM/PLM/Finance/Quality/EAM/Proc) + `/platform/k8s-extended/readiness`
- **W140** — Multi-tenant hardening (`X-Tenant-Id`, `/tenants/hardening/check`) + `/platform/tenant-hardening/readiness`
- **W141** — KSeF production profile (`/ksef/production/profile`) + `/platform/ksef-prod/readiness`
- **W142** — `pnpm run pipeline:faza28-final`
- Contract **130/130** | Regression **125/125** @ 100%

### Poprzednio (W46)
- **W46** — TD-004: `traceability/e2e/view` — 5-stage spine PLM→FIN
- UI: tab **E2E Spine** w `/inv` → Genealogia
- Contract tests: **28/28** (21 suites)
- Regression: **61/61** @ 100%

### Poprzednio (W45)
- **W45** — TD-005: `platform/tax/readiness` — KSeF + JPK aggregate probes
- Production readiness: **9 TD checks** @ 100%
- Contract tests: **27/27** (20 suites)
- Regression: **60/60** @ 100%

### Poprzednio (W44)
- **W44** — TD-011 ext: `ensure-core-stack.sh`, `platform/stack/readiness`, boot-regression hardening
- Regression: **59/59** @ 100% (54/54 required)
- Contract tests: **26/26** (19 suites)

### Poprzednio (W41–W43)
- **W41** — Production Readiness UI panel na dashboardzie `/`
- **W42** — TD-002: `platform/gateway/readiness`, proxy probes (FA, PM, INV, HR)
- **W43** — TD-004b: `platform/eto-payload/readiness`, `assertEtoOperationalPayload` w MES
- Production readiness rozszerzone: **8 TD checks** (score 75%, ready @ 6/8)
- Contract tests: **25/25** (18 suites)
- Regression: **55/58** (44/47 required @ 94%) — pełny stack z PM/PROC/INV/PLM

### Poprzednio (W37–W40)
- **W37** — TD-001: `platform/auth/readiness`, RBAC matrix API
- **W38** — TD-011: `boot:smart`, FRONTEND_PORT auto, `platform/boot/readiness`
- **W39** — TD-004 partial: `traceability/e2e/readiness`, genealogy chain aggregate
- **W40** — `platform/production/readiness` — 6 TD checks @ 100%
- Contract tests: **23/23** (16 suites)
- Regression: **56/56** (51 required @ 100%)

### Poprzednio (W36)
- **W36** — TD-013: structured audit log, readiness/summary API, compliance filters, Data Hub UI
- Contract tests: **19/19** (12 suites)
- Regression: **52/52** (44 required @ 100%)

### Poprzednio (W34–W35)
- **W34** — OTel/outbox routing fix, observability readiness API, dynamic required
- **W35** — Full stack regression (Jaeger + finance + observability)
- Contract tests: **17/17**
- Regression: **49/49** (44 required @ 100%) — HR + Tax w checkach

### Poprzednio (W32–W33)
- **W32** — TD-010: pnpm overrides NestJS 11.1.19, audit API, smoke
- **W33** — Finance prod boot, dynamic finance required w regression
- Contract tests: **16/16**
- Regression: **46/46** (z finance prod)

### Poprzednio (W29–W31)
- **W29** — TD-003 saga readiness API + smoke
- **W30** — Regression stabilność (FE auto-detect, optional UI/outbox)
- **W31** — EAM IoT lite: BreakdownEvent persist, status/recent API, UI strip
- Contract tests: **15/15**
- Regression: **45/45** (34 required @ 100%)

### Poprzednio (W26–W28)
- **W26** — Jaeger profile, `/analytics/otel/status`, `boot:otel`
- **W27** — Genealogia chain ETO + UI tab Chain
- **W28** — Outbox DLQ dashboard aggregate
- Contract tests: **13/13**

### Poprzednio (W24–W25)
- **Double BOM** — `subBomVersionId`, explosion przy release, `GET /bom-versions/:id/double-bom`
- **Payload guard** — `assertEtoOperationalPayload` w PM/INV handlerach
- **Long-Lead UI** — `MrpPanel.tsx` + `useLongLeadRadar()`
- Contract tests: **12/12**

### Poprzednio (W23 — APEX inkrementalnie)
- **Long-Lead Radar** — PROC, `GET /proc/long-lead/radar`, PO `source: LONG_LEAD`
- **Universal Journal lite** — Finance, `GET /fin/universal-journal`
- **`assertEtoOperationalPayload`** — shared-kernel + test kontraktowy
- Zasady: `.cursor/rules/erp-eto-incremental.mdc`

---

## 3. Architektura (nie zmieniamy bez ADR)

```
Frontend (Next.js) → API Gateway (:4005) → mikroserwisy (NestJS + Prisma)
                              ↓
                         NATS JetStream + Outbox relay
```

**Serwisy:** plm, pm, mes, inv, proc, finance, crm, quality, eam, hr, tax-legal, analytics, api-gateway.

**Frozen (chronione):** glassmorphism UI, CQRS w CRM/PM/MES, Outbox CRM, CPQ, CCPM fields.

---

## 4. Otwarty dług techniczny (priorytet)

| ID | Problem | Status |
|----|---------|--------|
| TD-001 | Auth produkcyjny | 🟡 W37 — auth/readiness API, RBAC 7 ról |
| TD-002 | Gateway proxy | 🟡 W42 — gateway/readiness API, proxy probes |
| TD-003 | Saga orchestracja | 🟡 W29 — readiness API |
| TD-004 | Głębokie modele domenowe | 🟡 W39–W49 — genealogy E2E + UI + MES spine |
| TD-012 | Pact broker | 🟡 W48 — Event Registry readiness (broker odłożony) |
| TD-006 | fix-*.js na root | ✅ Usunięte |
| TD-010 | NestJS overrides | 🟡 W32 |
| TD-011 | boot:all dev UX | 🟡 W38/W44 — boot:smart + stack/readiness + ensure-core-stack |
| TD-013 | Audit log | 🟡 W36 |

Pełna lista: `docs/TECHNICAL-DEBT.md`

---

## 5. Co przed nami (kolejność)

### ✅ Faza 5 — Production Hardening — ZAMKNIĘTA (2026-06-07)

Patrz: `.agents/orchestrator/CHECKPOINTS/FAZA5-FINAL-CLOSURE.md`

### Odłożone (wymaga infry prod)
- ⛔ Vault/TLS/mTLS — wymaga infry prod
- TD-012 Pact — stopniowo przy nowych integracjach
- Głębsze modele SAP-deep — praca domenowa (nie dług)

### Średni horyzont
- Głębsze modele PLM/MES/INV (genealogia produkcyjna end-to-end)
- Pełny regression live 37/37 stabilnie na CI
- Production readiness (`docs/PRODUCTION-READINESS.md`)
- TaxLegal KSeF produkcyjny (env-gated już jest)

### Świadomie odłożone (APEX)
MCP runtime, AI swarm, WebXR, osobny agent-orchestrator mikroserwis — mapa: `docs/APEX-VALUE-MAP.md`

---

## 6. Dokumentacja — co czytać

| Plik | Po co |
|------|-------|
| **Ten plik** | Pełny obraz stanu |
| `docs/FEATURE-EXPANSION-ROADMAP.md` | Historia warstw W0–W23 + plan W24+ |
| `.agents/orchestrator/CURRENT-CONTEXT.md` | Krótki kontekst dla agentów |
| `.agents/orchestrator/MASTER-PLAN.md` | Wizja strategiczna i fazy |
| `docs/GOVERNANCE.md` | Zasady pracy |
| `docs/EVENTS/REGISTRY.md` | Kontrakty zdarzeń |
| `docs/TECHNICAL-DEBT.md` | Backlog techniczny |
| `docs/APEX-VALUE-MAP.md` | Co wchłonęliśmy z analizy zewnętrznej |

---

## 7. Komendy operacyjne

```bash
pnpm run boot:smart               # zalecany start dev
pnpm run build:all:nest
pnpm run test:contracts           # 130/130
pnpm run regression:report        # 125/125
pnpm run pipeline:faza28-final
kubectl apply -k infra/k8s/deploy/ --dry-run=client
pnpm run smoke:faza28-k8s-tenant-ksef-final
```

---

## 8. Struktura `.agents/` po cleanup (2026-06-06)

Usunięto: 80+ checkpointów SILENT, 59 mission briefów, logi pipeline, `fix-*.js`, folder analizy APEX (zmapowany w docs).

Zostało:
- `orchestrator/CURRENT-CONTEXT.md`, `MASTER-PLAN.md`
- `orchestrator/CHECKPOINTS/FAZA0-FINAL-CLOSURE.md`, `WARSTWA23–W33-CLOSURE.md`
- `skills/` — skille agentów
- `templates/` — szablony misji/blueprintów
- `swarm/decisions/` — decyzje architektoniczne
- `swarm/swarm-max-speed.yaml` — konfiguracja swarm
