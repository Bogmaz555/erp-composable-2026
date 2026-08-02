# ERP 2026 – Rejestr Długu Technicznego

**Cel:** Priorytetyzowany backlog po Faza 0–28 demo oraz **Pilot v1 hardening** (PR 1–21).  
**Ostatnia aktualizacja:** 2026-08-01 (PR 21 docs honesty)  
**Design:** [`docs/PILOT-V1-DESIGN.md`](./PILOT-V1-DESIGN.md)

> **Honesty:** W142 / Faza 28 „FINAL” **nie zamyka** production debt.  
> Pilot gate = `pnpm run smoke:pilot` — nie contract/regression theater.  
> Poziom docelowy Pilot v1 = single-tenant pilot, **nie** multi-customer production.

---

## Priorytet 1 – Critical (Pilot v1 baseline)

| ID | Problem | Wpływ | Status | Notatki |
|----|---------|-------|--------|---------|
| TD-001 | Auth produkcyjny / surface | Krytyczny | ✅ **Pilot** | **Auth default ON** (`AUTH_ENFORCE` unless `false`; `AUTH_DISABLE`). JWKS pilot, PUBLIC shrink, 401 P0 (`smoke:pilot:auth`). Residual: Vault/mTLS mesh prod |
| TD-002 | Gateway hybrid proxy vs Nest | Wysoki | ✅ **Pilot** | Pure env-based proxy + `*_SERVICE_URL` (PR 17); bind `0.0.0.0` / PORT. Residual: edge ACL polish |
| TD-003 | Saga orchestration | Wysoki ETO | 🟡 **G-lite** | Real correlationId + hardened reverse WIP (PR 16). **Temporal = non-DoD (KD-4)**. Full Temporal residual |
| TD-004 | Płytkie modele domenowe | Wysoki | 🟡 | Praca domenowa (nie „dług” pure); genealogy E2E partial |

---

## Priorytet 2 – High (Pilot reliability / data)

| ID | Problem | Wpływ | Status | Notatki |
|----|---------|-------|--------|---------|
| TD-OUTBOX | Outbox dual-write / invalid status / dual relay | Krytyczny reliability | ✅ **Pilot** | Schema `PROCESSING`+attempts (PR 4); relay v2 (PR 5); **TX writes** core producers (PR 6–9). Gate: `smoke:pilot:outbox` |
| TD-JS | JetStream unused / dual consumer risk | Wysoki | 🟢 **enterprise** | Q0: `ENTERPRISE=1` requires JetStream (`assertEnterpriseMessaging`). Opt-in remains for local non-enterprise. |
| TD-TENANT | Tenancy no-op / cross-tenant leak | Wysoki | ✅ **Pilot** | Shared `tenant-extension` + worker ALS (PR 15). Single-tenant-per-deploy + row filter. Gate: `smoke:pilot:tenant` |
| TD-MONEY | Monetary Float drift | Średni-wysoki | 🟡 | Pilot-critical Decimal blocklist (PR 11); secondary residual (PR 12 / KD-5) |
| TD-MIG | Prisma push-only / no baselines | Wysoki | ✅ **core** | Baselines + `PILOT=1` forbids push (`docs/PRISMA-MIGRATIONS.md`, PR 10) |
| TD-005 | Event versioning w kodzie | Wysoki | 🟡 | Event Registry = source of truth; freeze reverse payload (OQ-5) |
| TD-006 | `fix-*.js` root chaos | Średni | ✅ | Usunięte 2026-06-06 |
| TD-007 | Prisma client outputs | Wysoki | 🟡 | Standaryzacja częściowa |
| TD-008 | Retry / circuit breaker | Średni | 🟡 | Outbox attempts/FAILED + reclaim; no full CB mesh |
| TD-009 | Observability partial | Średni | 🟡 | Jaeger/OTel residual; R-OBS accepted for pilot |

---

## Priorytet 3 – Medium

| ID | Problem | Wpływ | Status | Notatki |
|----|---------|-------|--------|---------|
| TD-010 | NestJS version overrides | Ryzyko | 🟡 | overrides 11.x + audit |
| TD-011 | boot:all / docker dev UX | Uciążliwy | 🟡 | `boot:smart` + compose **profile pilot** (PR 18) |
| F2-TAX | KSeF/JPK produkcyjny | Średni | 🟡 | Sandbox env-gated; prod profile residual |
| TD-012 | Pact broker full | Średni | ⛔ residual | Event Registry readiness only; broker deferred |
| TD-013 | Central Audit Log | Compliance | 🟡 | Structured fields + readiness; not SIEM |
| TD-THEATER | Readiness/contract self-assert noise | Zaufanie | 🟡 accepted | **Not in pilot gate** (KD-6 / A7). Do not treat 130/130 as prod |
| TD-DR | Backup/restore unproven | Wysoki ops | ✅ **Pilot** | `backup-dbs` / `restore-dbs` / `dr-drill` — RPO 24h / RTO 2h (PR 19) |

---

## Priorytet 4 – Low / Nice to Have / Out of Pilot DoD

- Full Temporal workers (beyond G-lite status probe)
- mTLS mesh, Vault HA prod unseal, multi-region SaaS tenancy
- Convert **all** non-money Floats (engineering qty allowed — KD-5)
- Delete readiness theater files wholesale
- DMS full, iot-ai full, ISO certification track
- Lepsze tooling seedów; ujednolicenie tsconfigów

---

## Pilot v1 residual risk (from design)

| ID | Residual | Sev | Pilot stance |
|----|----------|-----|--------------|
| R5 | Partial compensation only (WIP + reservation scope) | Med | **Accepted** — G-lite in-scope only |
| R8 | G-lite ≠ Temporal | Med | **Accepted** KD-4 |
| R9 | Readiness noise | Low | Quarantined from `smoke:pilot` |
| R10 | mTLS out of pilot | Med | Network isolation residual |
| R-MONEY | Non-blocklist Floats | Med | KD-5 secondary residual |
| R-OBS | Metrics/alerts not DoD | Low | Best-effort |

---

## Uwagi ogólne

- **TD-001 / TD-002 / outbox / DR** are closed **for Pilot v1**, not for enterprise multi-env production.
- Domain depth (PLM/MES/INV deep models) remains planned product work, not pure debt.
- **Never claim production-ready solely because W142 or contract counts are green.**
- Update this registry when pilot residuals close or new gaps appear.

**Właściciel:** erp-orchestrator + erp-guardian  
**Gate:** `pnpm run smoke:pilot` · Design: `docs/PILOT-V1-DESIGN.md`

---

## TD-001 history (auth progress — consolidated)

- JWT guards + claim propagation on gateway proxy; Nest service guards on ETO mutations.
- Keycloak realm `erp`, demo users, role matrix + aliases (`WAREHOUSE`→`PRODUCTION_MANAGER`, etc.).
- Pilot: default-on auth; forbid `AUTH_ENFORCE=false` / missing JWKS in pilot CI (`ci-pilot-auth-env`).
- Smoke: `smoke:pilot:auth` → `smoke-auth-401` + `smoke-rbac-eto`.
- Remaining beyond pilot: Vault-managed secrets rotation, mTLS service mesh, device token for MES kiosk (OQ-2 → D60).

---

## Kategoria: Modele Domenowe (zakres produktowy)

- PLM / MES routing depth, INV LOT/SN genealogy completeness, Finance project accounting depth, TaxLegal fullness — **product scope**, partially advanced in Fazy 1–4.
- Finance WIP + reverse path hardened for pilot G-lite (PR 16).

**Uwaga:** Oczekiwane w Faza 0; nie mylić z „production ready”.
