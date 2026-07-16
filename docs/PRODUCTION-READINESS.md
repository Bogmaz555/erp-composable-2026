# Production Readiness Checklist — ERP Composable 2026

**Status:** Pilotaż ETO domknięty end-to-end (Faza 0–4). Dokument śledzi gotowość
produkcyjną i pozostałe twarde wymagania przed wdrożeniem klienckim.

Legenda: ✅ gotowe · 🟡 częściowe (pilotaż/stub) · ⛔ do zrobienia

---

## 1. Architektura i domena

| Obszar | Status | Uwagi |
|--------|--------|-------|
| DDD + CQRS w klastrze Manufacturing | ✅ | PM, INV, PROC, MES, Quality, EAM, Finance |
| NATS event bus + Outbox pattern | ✅ | Relay w inv/proc/quality; at-least-once |
| Database-per-Service (Prisma/Postgres) | ✅ | osobne schematy/klienty per serwis |
| Traceability spine `bomComponentId` (ADR-006) | ✅ | INV genealogy fwd/bwd |
| Lekka saga `EtoSagaStep` | ✅ | STOCK_OUT→PO→APPROVE→RECEIVE |

## 2. Pętle biznesowe end-to-end

| Tor | Status |
|-----|--------|
| ETO spine: BOM→WO→production→WIP costing | ✅ |
| Milestone billing FAT/SAT → Finance → KSeF → INVOICED | ✅ |
| Revenue recognition po KSeF | ✅ |
| MRP/Shortage → PO → approve → Finance+PM → receive → INV | ✅ |
| Quality: auto-inspekcje + NCR → fever/WBS hold | ✅ |
| Quality: CAPA (ISO 9001 §10.2) NCR→CAPA→VERIFIED | ✅ |
| EAM: breakdown (IoT stub) → PM fever / MES on-hold | 🟡 stub IoT |

## 3. Bezpieczeństwo / Auth (TD-001)

| Element | Status | Uwagi |
|---------|--------|-------|
| JWT strategy (dev secret + Keycloak JWKS) | ✅ | `USE_KEYCLOAK_JWKS=true` |
| Keycloak realm + role + demo users | ✅ | ADMIN/ENGINEER/PROCUREMENT/PLANNER/ACCOUNTANT/INSPECTOR/VIEWER |
| RBAC smoke (SKIP-safe) | ✅ | `npm run smoke:rbac` |
| Global guard (env-gated) | ✅ | `AUTH_ENFORCE=true`: globalny JWT guard (Nest) + hook auth na proxy fastify (crm/pm/inv/proc/analytics) z propagacją `x-user-id`/`x-roles`/`x-tenant-id` |
| Secrets management (Vault/env) | ⛔ | obecnie `.env`; brak rotacji |
| TLS / mTLS między serwisami | ⛔ | |
| **TD-001 overall (W25)** | **🟡** | dev Keycloak + AUTH_ENFORCE + smoke; prod rollout pending |
| **TD-002 overall (W25)** | **🟡** | proxy v9 + /api/health; Nest 10/11 mix remains |

## 4. Observability

| Element | Status |
|---------|--------|
| Live telemetry SSE (`/api/analytics/stream`) | ✅ |
| Aggregated counters (`/api/analytics/counters`) | ✅ |
| OpenTelemetry tracing | 🟡 | W26: Jaeger profile + `/analytics/otel/status` |
| Healthchecks `/health` + `/health/ready` | ✅ | inv/proc/quality/eam/mes/plm |
| Centralne logi (ELK/Loki) | ⛔ | wymaga infry prod |
| Alerting (dead-letter outbox) | 🟡 | W28: `/analytics/outbox/dead-letter` |

## 5. Jakość / Testy

| Element | Status |
|---------|--------|
| Contract testy (eto/proc/ncr/eam/capa + readiness) | ✅ `npm run test:contracts` **30/30** |
| Master regression | ✅ **63/63** @ 100% |
| Production readiness aggregate | ✅ **13/13** TD checks |
| Live NATS E2E | 🟡 `smoke:faza3:live` (wymaga infra) |
| Pact broker (warstwa 2 ADR-007) | ⛔ planowane |
| Unit coverage > próg | 🟡 częściowe |

## 6. Dług techniczny do zamknięcia przed prod

- ✅ **Global `JwtAuthGuard` + proxy auth boundary** — `AUTH_ENFORCE=true` (Nest + fastify proxies); RBAC claims propagowane downstream.
- ✅ **Outbox dead-letter + retry/backoff** — `attempts`/`lastError` + status `FAILED` po `OUTBOX_MAX_ATTEMPTS` (default 5) w inv/proc/quality.
- ✅ **Legacy eventy usunięte** (`inventory.stock_depleted`, `procurement.order.approved`) — kanoniczne v1.
- ✅ **Migracje Prisma** — `npm run db:migrate:deploy` (`scripts/prisma-migrate-deploy.sh`, per-service, migrate deploy z fallbackiem db push).
- ✅ **Healthchecks / readiness probes** — `/health` + `/health/ready` (DB ping) w inv/proc/quality/eam/mes/plm; `infra/k8s/README.md`.
- ⛔ **Centralny secrets (Vault) + TLS/mTLS** — wymaga infry produkcyjnej.
- ⛔ **OTel collector + centralne logi/alerting** — wymaga infry produkcyjnej.
- ⛔ **Pact broker** (warstwa 2 ADR-007).

## 7. Uruchomienie (dev)

```bash
# infra
docker compose up -d            # postgres per-service, nats, redis, keycloak
# wszystkie serwisy + frontend
pnpm run boot:all
# bramki jakości (lekkie, bez pełnej infra)
pnpm run ci:contracts
```

## 8. Definicja gotowości produkcyjnej (DoR→DoP)

Pilotaż ETO jest **funkcjonalnie kompletny** (wszystkie tory domknięte end-to-end).
Do wdrożenia produkcyjnego wymagane są pozycje ⛔ z sekcji 3, 4 i 6
(hardening bezpieczeństwa, observability prod, reliability outbox, migracje, infra k8s).
