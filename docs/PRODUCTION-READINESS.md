# Production Readiness Checklist — ERP Composable 2026

**Status (honest):** **Pilot v1 hardening** — single-tenant-per-deployment pilot target.  
**Not production-ready.** Faza 0–28 / W0–W142 built an advanced POC / sales-demo with a large readiness/contract surface; those layers are **not** the pilot acceptance gate.

| Pole | Wartość |
|------|---------|
| **Design** | [`docs/PILOT-V1-DESIGN.md`](./PILOT-V1-DESIGN.md) (binding) |
| **Honest gate** | `pnpm run smoke:pilot` / `pnpm run pipeline:pilot` |
| **Hosting primary** | `docker compose --profile pilot` (OQ-3) |
| **DR contract** | RPO **24h** / RTO **2h** (OQ-4) |
| **W142 / Faza 28** | Demo + platform readiness theater — **≠ production**, **≠ Pilot DoD** |

Legenda: ✅ pilot-ready · 🟡 partial / residual · ⛔ out of pilot / needs prod infra

---

## 0. Pilot v1 honesty (read first)

1. **Do not equate W142, contract 130/130, or regression 125/125 with production readiness.** Those suites largely assert readiness endpoints and file presence; they are historical demo gates (see KD-6 in design).
2. **Pilot acceptance = live-oriented `smoke:pilot` groups**, not `pipeline:faza28-final` or contract theater.
3. **Level today:** advanced POC → Pilot v1 track (PR 1–20 hardening). Suitable for a controlled single-customer pilot when `REQUIRE_LIVE=1 pnpm run smoke:pilot` is green on the pilot stack — **not** multi-tenant SaaS, mTLS mesh, or ISO-grade prod.
4. Full design, residuals, and PR map: **`docs/PILOT-V1-DESIGN.md`**.

### Honest gate (`smoke:pilot`)

| Script | Co sprawdza |
|--------|-------------|
| `smoke:pilot:auth` | 401 on P0 paths; ETO RBAC (VIEWER deny + writers) |
| `smoke:pilot:outbox` | Transactional outbox INV/PROC + FIN/MES structure/live |
| `smoke:pilot:eto` | G-lite saga compensation (reverse WIP + correlationId) |
| `smoke:pilot:tenant` | Shared tenant-extension + isolation smoke |
| `smoke:pilot:js` | JetStream ETO path (**opt-in**; skip with `SKIP_JS=1`) |
| `smoke:pilot` | all groups above |
| `pipeline:pilot` | `ci-pilot-auth-env` + compose inventory + suite + DR dry-run |

```bash
# Structure-friendly (live SKIPs when stack down → exit 0)
pnpm run smoke:pilot

# Fail-closed live acceptance
REQUIRE_LIVE=1 pnpm run smoke:pilot
pnpm run pipeline:pilot
```

---

## 1. Architektura i domena (Pilot v1)

| Obszar | Status | Uwagi |
|--------|--------|-------|
| DDD + CQRS (Manufacturing cluster) | ✅ | PM, INV, PROC, MES, Quality, EAM, Finance |
| NATS + **transactional outbox** | ✅ | Domain write + outbox same TX (PR 6–9); relay v2 (PR 5); enum `PENDING\|PROCESSING\|PROCESSED\|FAILED` |
| JetStream | 🟡 | **Opt-in** `NATS_JETSTREAM=true` (PR 13–14); single consumer path when on; Nest dual-subscribe banned for migrated subjects |
| Database-per-Service (Prisma) | ✅ | ADR-003; core baselines + `PILOT=1` forbids push-only |
| Traceability spine `bomComponentId` | ✅ | ADR-006 |
| Saga **G-lite** (not Temporal) | ✅ | Real correlationId/projectId; hardened reverse WIP; Temporal = **non-DoD** (KD-4) |
| Tenancy | ✅ | Single-tenant-per-deploy + shared `tenant-extension` row filter (defense-in-depth, not SaaS) |

---

## 2. Pętle biznesowe end-to-end (demo + pilot spine)

| Tor | Status |
|-----|--------|
| ETO spine: BOM→WO→production→WIP costing | ✅ pilot path |
| Milestone billing FAT/SAT → Finance → KSeF → INVOICED | 🟡 sandbox / env-gated |
| Revenue recognition po KSeF | 🟡 |
| MRP/Shortage → PO → approve → receive → INV | ✅ |
| Quality NCR/CAPA | 🟡 pilotaż |
| EAM breakdown (IoT stub) | 🟡 stub |
| G-lite compensation (fail-at-WIP → reverse) | ✅ `smoke:pilot:eto` |

---

## 3. Bezpieczeństwo / Auth (TD-001) — Pilot defaults

| Element | Status | Uwagi |
|---------|--------|-------|
| **Auth default ON** | ✅ | Enforced unless `AUTH_ENFORCE=false` or `AUTH_DISABLE=true` (local insecure only) |
| JWT + Keycloak JWKS | ✅ | Pilot: `USE_KEYCLOAK_JWKS=true` required (`ci:pilot-auth-env`) |
| PUBLIC proxy surface shrunk | ✅ | Health only on proxy public list; P0 data plane → **401** without token |
| RBAC ETO mutations | ✅ | Canonical realm roles + aliases; VIEWER deny writes (`smoke:pilot:auth`) |
| Secrets in tree / Meili hardcode | ✅ | Purged; `MEILI_MASTER_KEY` env; `backups/` gitignored (PR 1) |
| Gateway pure proxy + env `*_SERVICE_URL` | ✅ | KD-8 / PR 17–18 |
| Vault rotation / mTLS mesh prod | ⛔ | Residual — needs prod infra (out of Pilot DoD) |
| **TD-001 overall** | **🟡→✅ pilot** | Pilot auth surface done; full prod secrets/mTLS residual |

---

## 4. Observability

| Element | Status |
|---------|--------|
| Health `/health` + readiness on core services | ✅ |
| OpenTelemetry / Jaeger profile | 🟡 best-effort residual |
| Central logs (ELK/Loki) + prod alerting | ⛔ out of Pilot DoD (R-OBS) |
| Outbox DLQ / attempts / FAILED | ✅ relay v2 |

---

## 5. Jakość / Testy (honest)

| Element | Status | Uwagi |
|---------|--------|-------|
| **`pnpm run smoke:pilot`** | ✅ **pilot gate** | auth / outbox / eto / tenant / js |
| **`pnpm run pipeline:pilot`** | ✅ | + auth-env CI + compose inventory + DR dry-run |
| Contract / regression W-layer counts | 🟡 historical | Demo readiness theater — **not** pilot DoD (KD-6) |
| Pact broker | ⛔ residual | ADR-007 layer 2 deferred |
| Unit coverage threshold | 🟡 partial | |

---

## 6. Pilot v1 checklist (from design PR 1–20)

| Track | Status | Notes |
|-------|--------|-------|
| Secrets purge + Meili env | ✅ | PR 1 |
| Auth surface + 401 P0 + JWKS | ✅ | PR 2 — default on |
| RBAC role matrix ETO | ✅ | PR 3 |
| Outbox schema PROCESSING + attempts | ✅ | PR 4 |
| Relay v2 (single impl) | ✅ | PR 5 |
| Outbox transactional writes (core) | ✅ | PR 6–9 |
| Prisma baselines / money Decimal blocklist | ✅ / 🟡 | PR 10–11; secondary residual PR 12 |
| JetStream kernel + single consumer | 🟡 opt-in | PR 13–14; `NATS_JETSTREAM` |
| Tenancy extension + worker ALS | ✅ | PR 15 |
| G-lite reverse WIP + correlationId | ✅ | PR 16 |
| Deploy compose pilot + Dockerfiles | ✅ | PR 17–18 |
| DR backup/restore + drill | ✅ | PR 19 — RPO 24h / RTO 2h |
| Honest smoke suite | ✅ | PR 20 — this gate |
| Docs honesty | ✅ | PR 21 — this document |

**Still ⛔ / residual before multi-customer production (not Pilot DoD):**

- Central Vault + TLS/mTLS mesh between services
- Full Temporal workers (G-lite is pilot path)
- Pact broker, SaaS multi-tenant, ISO, DMS full
- Delete/quarantine all readiness theater endpoints
- Convert every non-blocklist Float in monorepo

---

## 7. Uruchomienie (pilot compose)

```bash
# Infra + pilot profile (OQ-6 minimum image set)
export MEILI_MASTER_KEY=...   # required if Meili used; never commit
export AUTH_ENFORCE=true
export AUTH_DISABLE=false
export USE_KEYCLOAK_JWKS=true
export PILOT=1
# optional after M6:
# export NATS_JETSTREAM=true

docker compose --profile pilot up -d

# Quality gate
pnpm run smoke:pilot
# or full pipeline:
pnpm run pipeline:pilot
```

Dev-only insecure (never pilot): `AUTH_ENFORCE=false` or `AUTH_DISABLE=true`.

---

## 8. Definicja gotowości

| Poziom | Znaczenie |
|--------|-----------|
| **W142 / Faza 28 FINAL** | Sales demo + platform readiness surface complete historically — **not production** |
| **Pilot v1** | Single-tenant pilot: auth ON, outbox TX, G-lite, tenancy filter, compose pilot, DR drill, `smoke:pilot` green live |
| **Production (future)** | Vault/mTLS, multi-env ops, full observability, residual compensations, ISO/compliance as needed |

Pilotaż ETO jest **funkcjonalnie użyteczny** na ścieżce spine + hardening PR 1–20.  
**Do wdrożenia produkcyjnego multi-customer** wymagane są residuale ⛔ (infra security, ops, residual domain depth) — patrz `docs/PILOT-V1-DESIGN.md` Risks & Non-Goals.

---

## 9. Disaster Recovery (Pilot v1 / OQ-4)

| Contract | Value | Notes |
|----------|-------|-------|
| **RPO** | **24h** | Nightly (or on-demand) `pg_dump -Fc` per service DB via `scripts/backup-dbs.sh` |
| **RTO** | **2h** | Restore drill target measured by `scripts/dr-drill.sh` wall-clock |

### Runbook (compose pilot)

```bash
# 1) On-demand / nightly backup (writes ./backups/<timestamp>/ + MANIFEST.txt)
./scripts/backup-dbs.sh ./backups

# 2) Restore into running erp-*-db containers (name parity with docker-compose.yml)
./scripts/restore-dbs.sh ./backups/<timestamp>

# 3) DR drill — backup → destroy named DB volumes → recreate → restore → smoke
#    Default is SAFE dry-run (no volume destroy):
./scripts/dr-drill.sh
#    Live destructive drill (local/pilot only):
DR_DRILL_DRY_RUN=0 ./scripts/dr-drill.sh
#    Restore from a known backup without re-dumping:
DR_DRILL_DRY_RUN=0 RESTORE_FROM=./backups/<timestamp> ./scripts/dr-drill.sh
```

**Name parity:** scripts use fixed `container_name` values from compose (`erp-crm-db`, `erp-pm-db`, …). Volume destroy uses `${COMPOSE_PROJECT_NAME:-$(docker compose config name)}_${volume}` (e.g. `crm_pgdata`).

**Exit codes:** `backup-dbs.sh` / `restore-dbs.sh` fail closed (non-zero) on dump/restore hard errors, empty dumps, or zero successful DBs. `pg_restore` exit 1 (warnings with `--clean`) is accepted; exit ≥2 is fatal.

**Artifacts:** keep `backups/` out of git (gitignored). Off-host copy of nightly dumps is required to meet RPO outside the compose host.

---

## References

- [`docs/PILOT-V1-DESIGN.md`](./PILOT-V1-DESIGN.md) — binding Pilot v1 design (KD-1…KD-8, OQ-1…OQ-6, PR 1–21)
- [`docs/PROJECT-STATE.md`](./PROJECT-STATE.md) — honest project state
- [`docs/TECHNICAL-DEBT.md`](./TECHNICAL-DEBT.md) — TD registry aligned to pilot
- `scripts/smoke-pilot-suite.ts` — honest gate orchestrator

---

## Pilot v1 CLOSED (2026-08-02)

**Tag:** `pilot-v1.0.0` · **Merge:** PR #1 · **SHA:** `da7569f`

### Accepted residual (not blockers for single-tenant pilot)

| ID | Item |
|----|------|
| R3 | Git history may still contain old keys — rotate if repo public; tree clean |
| R5 | CRM lacks tenantId columns — single-tenant deployment |
| R6 | Multi-instance outbox reclaim double-delivery — pilot single replica |
| R7 | Full saga compensation BOM/MES — WIP reverse only |
| R8 | Temporal full SDK — non-DoD |
| UAT-UI | Full browser ETO path as engineer — manual before customer demo |
| DR-live | `DR_DRILL_DRY_RUN=0` not run on shared env — dry-run PASS |

### Gate commands

```bash
pnpm run smoke:pilot
REQUIRE_LIVE=1 AUTH_ENFORCE=true USE_KEYCLOAK_JWKS=true NATS_JETSTREAM=true pnpm run smoke:pilot
DR_DRILL_DRY_RUN=1 bash scripts/dr-drill.sh
```
