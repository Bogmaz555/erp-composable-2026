# ERP Composable 2026 — Stan Projektu (pełne podsumowanie)

**Ostatnia aktualizacja:** 2026-08-02  
**Bieżąca warstwa (honest):** **Pilot v1 COMPLETE** — tag `pilot-v1.1.0` @ `da7569f`  
**UAT:** [`docs/PILOT-V1-UAT.md`](./PILOT-V1-UAT.md) — **GO full**  
**Design binding:** [`docs/PILOT-V1-DESIGN.md`](./PILOT-V1-DESIGN.md)  
**Honest quality gate:** `pnpm run smoke:pilot` / `REQUIRE_LIVE=1 pnpm run smoke:pilot`  
**Closure board:** [`docs/PILOT-V1-CLOSURE-BOARD.md`](./PILOT-V1-CLOSURE-BOARD.md)

> ### ⚠️ Honesty banner
>
> **W142 / Faza 28 FINAL ≠ production-ready.**  
> Layers W0–W142 and contract/regression “100%” counts are an **advanced POC / sales-demo platform surface** (readiness endpoints, file probes, theater contracts). They must **not** be cited as production or pilot acceptance.
>
> **Pilot v1** = single-tenant-per-deployment customer pilot: auth default ON, transactional outbox, JetStream **opt-in**, tenancy row filter, G-lite saga, compose pilot deploy, DR RPO 24h / RTO 2h, gate = live-oriented `smoke:pilot`.
>
> See: `docs/PILOT-V1-DESIGN.md`, `docs/PRODUCTION-READINESS.md`, `docs/TECHNICAL-DEBT.md`.

---

## 1. Czym jest ten projekt

Composable ERP dla produkcji jednostkowej (ETO) — architektura mikroserwisowa, DDD, CQRS, NATS + Outbox, database-per-service.

| Poziom | Opis |
|--------|------|
| **Historycznie (W142)** | Zaawansowany POC / demo sprzedażowe enterprise + readiness theater |
| **Cel bieżący** | **Pilot v1** — twardy single-tenant pilot u jednego klienta |
| **Nie jest** | Multi-tenant SaaS, ISO prod, mTLS mesh, full Temporal, production multi-env |

---

## 2. Pilot v1 — stan hardeningu (PR 1–21)

Źródło prawdy: **`docs/PILOT-V1-DESIGN.md`**. Poniżej skrót po zamknięciu toru execute-plan.

| Track | PR | Status | Gate / notes |
|-------|-----|--------|--------------|
| Secrets purge, Meili env, gitignore `backups/` | 1 | ✅ | `ci-no-secrets` |
| Auth surface, JWKS, 401 P0, **auth default ON** | 2 | ✅ | `smoke:pilot:auth` |
| RBAC role matrix + ETO mutation guards | 3 | ✅ | VIEWER deny |
| Outbox schema `PROCESSING` + attempts | 4 | ✅ | all producers |
| GenericOutboxRelay v2 (+ INV converge) | 5 | ✅ | claim/FAILED |
| Outbox **transactional** INV+PROC | 6 | ✅ | `smoke:pilot:outbox` |
| Outbox TX PM+PLM | 7 | ✅ | |
| Outbox TX FIN+MES | 8 | ✅ | |
| Outbox TX quality/hr/tax/crm | 9 | ✅ | |
| Prisma baselines core | 10 | ✅ | `PILOT=1` no push |
| Money Decimal blocklist | 11 | ✅ | residual secondary |
| Secondary Decimal (CRM/PLM) | 12 | 🟡 optional | KD-5 residual OK |
| JetStream kernel + bootstrap | 13 | ✅ | **opt-in** `NATS_JETSTREAM` |
| Relay JS publish + single consumer | 14 | ✅ | `smoke:pilot:js` |
| Tenancy extension + worker ALS | 15 | ✅ | `smoke:pilot:tenant` |
| G-lite reverse WIP + real correlationId | 16 | ✅ | `smoke:pilot:eto`; Temporal non-DoD |
| Deploy env URLs, bind 0.0.0.0, pure proxy | 17 | ✅ | |
| Multi-service Dockerfiles, compose pilot | 18 | ✅ | OQ-6 min set |
| DR backup/restore + drill | 19 | ✅ | RPO 24h / RTO 2h |
| **`smoke:pilot` suite entrypoints** | 20 | ✅ | honest gate |
| Docs honesty pass | 21 | ✅ | this file + TD + PRODUCTION-READINESS |

### Pilot defaults (env)

```bash
AUTH_ENFORCE=true          # default ON; forbid false in pilot CI
AUTH_DISABLE=false
USE_KEYCLOAK_JWKS=true
PILOT=1
NATS_JETSTREAM=true        # opt-in after streams bootstrap; single consumer path
DEFAULT_TENANT_ID=acme     # single-tenant-per-deploy
# *_SERVICE_URL=http://<svc>:<port>
```

### Co jest mocne (biznes + pilot)

- Spine ETO: PLM → PM → INV → MES → Finance + G-lite compensation path
- Transactional outbox + relay v2; JetStream optional durable path
- CRM/CPQ milestone, PM CCPM, frontend glassmorphism (demo UX retained)
- Auth default-on + RBAC on ETO mutations; tenant row filter defense-in-depth
- Compose pilot primary hosting; DR drill scripts

### Świadome residuale (nie Pilot DoD)

- Temporal full workers, mTLS mesh, Vault prod HA, Pact broker
- Readiness/contract theater noise (quarantined from pilot gate)
- Secondary money Floats, partial domain depth, MES kiosk device token (OQ-2 D60)
- Multi-customer SaaS tenancy

---

## 3. Co jest zrobione historycznie (Fazy 0–28 / W0–W142)

Poniższe fazy i warstwy **pozostają w repo jako demo/platform surface**.  
**Nie interpretuj „✅ FINAL” ani „130/130 @ 100%” jako production readiness.**

| Faza / obszar | Status historyczny | Kluczowe osiągnięcia (demo) |
|---------------|--------------------|-----------------------------|
| **Faza 0** Governance | ✅ | GOVERNANCE, ADR 001–007, Event Registry, blueprinty |
| **Faza 1** Manufacturing | ✅ ~90% pilotaż | Traceability spine, PLM→PM→MES→INV, Keycloak dev |
| **Faza 2** Finance + Tax | ✅ ~85% | Milestone FAT/SAT, KSeF sandbox, WIP costing |
| **Faza 3** Procurement | ✅ ~72% | MRP/SHORTAGE → PO → receive → INV |
| **Faza 4** Quality + EAM | ✅ ~55% | NCR, CAPA, breakdown stub, IoT lite |
| **W0–W35** UX + ETO + observability | ✅ | Roadmap warstw |
| **Faza 5–28 / W47–W142** | ✅ **demo FINAL** | Readiness endpoints, K8s/Helm stubs, tenant hardening probe, KSeF prod *profile*, contract/regression **theater counts** |

### Naprawy operacyjne (2026-06 — retained)

- HR DB port, Finance build deprecations, Prisma CLI baselines (`docs/PRISMA-MIGRATIONS.md`)
- Core services: full baselines; `PILOT=1` forbids push-only

### Faza 28 — K8s Extended, Tenant Hardening & KSeF Prod (W139–W142) — **demo layer only**

- **W139–W141** — extended K8s manifests, tenant hardening *probe*, KSeF production *profile*
- **W142** — `pipeline:faza28-final` + historical contract/regression counts
- **Honest reinterpretation (2026-08):** this closed the **sales-demo / platform readiness** track. Pilot acceptance moved to **`smoke:pilot`** (PR 20) after Pilot v1 hardening (PR 1–19).

<details>
<summary>Archiwalne warstwy W36–W141 (skrót — nie pilot gate)</summary>

- W36–W46: audit, auth readiness, gateway readiness, ETO payload, production readiness panel, tax readiness, stack readiness
- W47–W50: MES ETO spine, pact readiness lite, TD checks, pipeline final (demo)
- W51–W94: domain depth, data trust, BI, CI auth theater, Grafana/Prometheus profiles
- W95–W130: alerts, mTLS *stubs*, Vault *dev* stubs, SLO dashboards, observability profiles
- W131–W138: K8s deploy manifests, visual regression, Helm, quality/EAM prod endpoints
- W139–W141: k8s extended, tenant hardening readiness, KSeF prod profile

Historical numbers such as “Contract 130/130 · Regression 125/125” refer to that theater suite, **not** Pilot DoD.

</details>

### Najmocniejsze fragmenty kodu (nadal aktualne)

- CRM + CPQ (milestone billing FAT/SAT)
- PM z CCPM (fever zones, bufory)
- Event spine ETO + **G-lite** orchestrator + reverse WIP (hardened)
- Frontend glassmorphism + TanStack Query
- Shared-kernel: outbox relay v2, tenant-extension, ERP roles

---

## 4. Architektura (nie zmieniamy bez ADR)

```
Frontend (Next.js) → API Gateway pure proxy (:4005) → mikroserwisy (NestJS + Prisma)
                              ↓
              Outbox TX → Relay v2 → NATS core  (+ JetStream opt-in)
```

**Serwisy (pilot min OQ-6):** gateway, pm, inv, plm, mes, finance, proc, analytics, keycloak, nats, postgres×needed, frontend.  
**Optional:** crm, hr, tax, quality, eam.  
**Frozen (chronione UX/demo):** glassmorphism UI, CQRS w CRM/PM/MES, CPQ, CCPM fields.

---

## 5. Otwarty dług techniczny (priorytet)

| ID | Problem | Status |
|----|---------|--------|
| TD-001 | Auth | ✅ Pilot — default ON + JWKS + 401 P0 |
| TD-002 | Gateway | ✅ Pilot — pure proxy + SERVICE_URL |
| TD-003 | Saga | 🟡 G-lite (PR16); Temporal non-DoD |
| TD-004 | Modele domenowe | 🟡 praca produktowa |
| TD-OUTBOX / TD-JS / TD-TENANT / TD-DR | Reliability track | ✅ / 🟡 JS opt-in — patrz TD |
| TD-012 | Pact broker | ⛔ residual |
| TD-THEATER | Readiness noise | 🟡 accepted outside pilot gate |

Pełna lista: [`docs/TECHNICAL-DEBT.md`](./TECHNICAL-DEBT.md)

---

## 6. Co przed nami

### ✅ Pilot v1 hardening track (PR 1–21) — dokumentacja domknięta

Patrz: `docs/PILOT-V1-DESIGN.md`, `docs/PRODUCTION-READINESS.md`

### Operator / acceptance

```bash
docker compose --profile pilot up -d
REQUIRE_LIVE=1 pnpm run smoke:pilot
pnpm run pipeline:pilot
```

### Odłożone (poza Pilot DoD / prod infra)

- ⛔ Vault/TLS/mTLS mesh production
- ⛔ Full Temporal workers
- ⛔ Pact broker, SaaS multi-tenant, ISO
- Domain depth SAP-deep (produkt, nie dług czysto techniczny)

### Świadomie odłożone (APEX)

MCP runtime, AI swarm, WebXR, osobny agent-orchestrator — mapa: `docs/APEX-VALUE-MAP.md`

---

## 7. Dokumentacja — co czytać

| Plik | Po co |
|------|-------|
| **Ten plik** | Pełny obraz stanu + honesty |
| **`docs/PILOT-V1-DESIGN.md`** | **Binding** Pilot v1 design (KD, OQ, PR map) |
| `docs/PRODUCTION-READINESS.md` | Checklist + DR + smoke:pilot |
| `docs/TECHNICAL-DEBT.md` | Backlog techniczny (pilot-aligned) |
| `docs/FEATURE-EXPANSION-ROADMAP.md` | Historia warstw W0–W23+ |
| `.agents/orchestrator/CURRENT-CONTEXT.md` | Krótki kontekst dla agentów |
| `.agents/orchestrator/MASTER-PLAN.md` | Wizja strategiczna i fazy |
| `docs/GOVERNANCE.md` | Zasady pracy |
| `docs/EVENTS/REGISTRY.md` | Kontrakty zdarzeń |
| `docs/APEX-VALUE-MAP.md` | Mapa APEX (odłożone) |

---

## 8. Komendy operacyjne

```bash
# --- Pilot v1 (preferowane) ---
pnpm run boot:smart                 # dev
docker compose --profile pilot up -d
pnpm run smoke:pilot                # honest gate (structure + optional live)
REQUIRE_LIVE=1 pnpm run smoke:pilot # fail-closed live
pnpm run pipeline:pilot             # auth-env + inventory + suite + DR dry-run
pnpm run smoke:pilot:auth
pnpm run smoke:pilot:outbox
pnpm run smoke:pilot:eto
pnpm run smoke:pilot:tenant
pnpm run smoke:pilot:js             # JetStream opt-in group

# DR
./scripts/backup-dbs.sh ./backups
./scripts/dr-drill.sh               # default dry-run
DR_DRILL_DRY_RUN=0 ./scripts/dr-drill.sh

# --- Historyczne (demo / nie pilot DoD) ---
pnpm run test:contracts             # theater counts — not pilot gate
pnpm run regression:report
pnpm run pipeline:faza28-final      # W142 demo final — ≠ production
```

---

## 9. Struktura `.agents/` po cleanup (2026-06-06)

Usunięto: 80+ checkpointów SILENT, 59 mission briefów, logi pipeline, `fix-*.js`, folder analizy APEX (zmapowany w docs).

Zostało:
- `orchestrator/CURRENT-CONTEXT.md`, `MASTER-PLAN.md`
- `orchestrator/CHECKPOINTS/FAZA0-FINAL-CLOSURE.md`, `WARSTWA23–W33-CLOSURE.md`
- `skills/` — skille agentów
- `templates/` — szablony misji/blueprintów
- `swarm/decisions/` — decyzje architektoniczne
- `swarm/swarm-max-speed.yaml` — konfiguracja swarm
