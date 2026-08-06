# Stan aplikacji — ERP Composable 2026

**Snapshot date (UTC):** 2026-08-06T14:41:47Z  
**Repo:** https://github.com/Bogmaz555/erp-composable-2026  
**Branch:** `master`  
**HEAD:** `2d89760` (`2d89760f7b5971a1f5f53f7bf1e37aa3a4d694bc`)  
**Working tree:** clean (synced with `origin/master`)

---

## 1. Co to jest

Composable, event-driven **ERP dla ETO** (Engineering-to-Order): monorepo (pnpm) z mikroserwisami NestJS (CQRS), frontendem Next.js, NATS JetStream, Postgres **per service**, auth Keycloak, API Gateway.

**Model tenancy:** `DEDICATED_STACK` (jedna firma / jeden stack) — nie multi-tenant SaaS.

**Profil docelowy:** Enterprise **GA-lite** / pilot-prod dedicated — nie „SAP zero residuali”.

---

## 2. Programy i tagi (zamknięte)

| Program | STATUS | Tag(i) |
|---------|--------|--------|
| Enterprise 2.0 | **DONE** (Q0–Q5) | `enterprise-2.0.0` |
| Enterprise 2.1 | **DONE** (P0–P5), `GA_LITE_SIGNED: true` | `enterprise-2.1.0`, p0–p4, `enterprise-2.1.0-signed` |
| Roadmap E0–E4 | **DONE** (E4 multi-tenant **DEFERRED**) | `enterprise-2.2.0`, `2.3.0`, `2.4.0` |

Control plane:
- `docs/ENTERPRISE-2.0-STATUS.md`
- `docs/ENTERPRISE-2.1-STATUS.md`
- `docs/ENTERPRISE-ROADMAP-STATUS.md`
- `docs/ENTERPRISE-ROADMAP.md`
- `pnpm run enterprise:step` / `enterprise21:step` / `enterprise-roadmap:step` → no-op gdy DONE

**Scheduler RESUME Enterprise 2.0:** tylko no-op (program zamknięty).

---

## 3. CI / jakość

| | |
|---|---|
| Ostatni zielony run (tip) | PR #17 merge · success |
| Run | https://github.com/Bogmaz555/erp-composable-2026/actions/runs/30851454904 |
| Kluczowe gate’y | sekrety, contracts, auth-enforce-live (naprawione), pilot-auth Helm |

---

## 4. Architektura runtime (lokalnie w momencie snapshotu)

| Komponent | Port | Rola | Snapshot listen |
|-----------|------|------|-----------------|
| Frontend (Next) | **3010** | UI (3000/3001 często zajęte) | TAK |
| API Gateway | **4005** | JWT proxy `/api/*` | TAK |
| CRM | 4001 | Leady / opportunities | TAK |
| PM | 4002 | Projekty ETO | TAK |
| INV | 4003 | Magazyn | (core stack) |
| PROC | 4004 | Zakupy | (core stack) |
| MES | 4006 | Produkcja | (core stack) |
| PLM | 4007 | BOM/ECO | (core stack) |
| Quality | 4008 | NCR/CAPA | satelita |
| EAM | 4009 | Utrzymanie | satelita |
| Finance | 4010 | WIP / journal | (core) |
| Analytics | 4011 | BI / auth context | (core) |
| HR | 4012 | HR | satelita |
| DMS | 4013 | Dokumenty | satelita |
| Tax-legal | 4015 | KSeF/JPK | satelita |
| Keycloak | **8080** | Realm `erp` | TAK |
| NATS | 4222 | JetStream | infra docker |
| Postgres | 5433–5445 | DB per service | docker |

### Logowanie UI

| | |
|---|---|
| URL | http://localhost:3010 |
| User demo | `demo.admin` / `demo123` |
| Token | localStorage `erp-access-token` |
| Proxy login | `POST /auth/token` → Keycloak (działa też przez tunnel) |
| API | Bearer wymagany (`AUTH_ENFORCE=true` w profilu enterprise) |

### Boot

```bash
pnpm run boot:enterprise          # core under ENTERPRISE=1
bash scripts/health-matrix.sh     # gateway+PM+INV+PROC+MES+PLM+FIN+analytics
PORT=3010 pnpm --filter frontend exec next dev -H 0.0.0.0 -p 3010
```

---

## 5. Spójność i awarie (model)

| | |
|---|---|
| Wewnątrz serwisu | Strong consistency (Postgres + transakcja) |
| Między serwisami | **Eventual consistency** (outbox → JetStream → consumery) |
| Brak | Global 2PC; pełne HA NATS (residual single-node) |
| Gdy serwis padnie | Izolacja domeny; proces ETO może stanąć na tym kroku |
| Gdy NATS padnie | Outbox rośnie w DB; po powrocie relay dogania |
| DR | Dry-run OK (`erp-pilot-dr`); live tylko z operatorem |

---

## 6. Dane (orientacyjnie, lokalne DB)

| DB | Orientacja |
|----|------------|
| CRM | setki opportunity / klienci (seed + UAT) |
| PM | projekty (w tym z CRM ACCEPTED → project) |
| PROC | PO (seed) |
| INV / MES / FIN | dane seed / smoke |

Dokładne liczby zmieniają się przy seed/UAT — nie są kontraktem release.

---

## 7. Co jest „dopięte” vs residual

### Dopięte
- Auth JWKS + CI auth-enforce-live
- Outbox na core producers
- Enterprise flags / Helm pilot+enterprise
- GA-lite sign-off (`GA_LITE_SIGNED=true`)
- CRM → PM: `ACCEPTED` → outbox `crm.opportunity.won.v1` + `POST /api/pm/projects/from-opportunity`
- Smoke: `scripts/smoke-e2-crm-pm.ts`
- Roadmap E0–E3 delivered; E4 deferred

### Residual (świadomy)
| Item | Uwagi |
|------|--------|
| JetStream HA 3-node | residual do re-review (doc) |
| Live DR | operator + `erp-pilot-dr` |
| ETO 12/12 full UAT | nie pełny formalny 12/12 live |
| Domain depth | PLM/INV/MES/FIN/UX RBAC — dalsze feature PR-y |
| Multi-tenant SHARED_RLS | **DEFERRED** |
| APPROVED_BY_USER_A | false |
| Temporal full saga | residual / G-lite |
| 100 users load test | brak formalnego testu w gate — architektura OK na firmę przy monitoringu |

---

## 8. Skala (orientacja)

| Scenariusz | Ocena |
|------------|--------|
| 1 firma, ~100 userów biurowych + ETO | **Tak**, przy sensownym HW + backup + alerty |
| Multi-customer SaaS | **Nie** w tej konfiguracji |
| Zero SPOF | **Nie** (single NATS, typowy single gateway bez HA) |

---

## 9. Kluczowe pliki

| Plik | Treść |
|------|--------|
| `README.md` | Opis produktu i quick start |
| `docs/APPLICATION-STATE.md` | **Ten snapshot** |
| `docs/ENTERPRISE-*-STATUS.md` | Maszyny statusów programów |
| `docs/enterprise-2.1/GA-LITE-SIGNOFF.md` | Evidence pack GA-lite |
| `docs/enterprise-roadmap/*` | Roadmap E0–E4 |
| `docs/TECHNICAL-DEBT.md` | Dług techniczny |
| `scripts/boot-enterprise.sh` | Boot core |
| `scripts/health-matrix.sh` | Health 8 serwisów |
| `scripts/smoke-e2-crm-pm.ts` | Smoke CRM→PM |

---

## 10. Następne sensowne prace (poza zamkniętymi programami)

1. Feature PR-y: głębia PLM → PROC → INV → MES → FIN  
2. NATS HA lub formalne przedłużenie residualu  
3. Live DR drill + metryki outbox w prod  
4. Load/smoke „100 users” na staging  
5. Wyłączenie zbędnego schedulera RESUME 2.0 (tylko no-op)

---

*Dokument wygenerowany jako zapis stanu aplikacji — aktualizować przy kolejnym release / go-live.*
