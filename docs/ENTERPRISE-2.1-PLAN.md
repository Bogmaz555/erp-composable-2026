# Enterprise ERP 2.1 — Production Hardening & Domain Depth

**Baseline:** `enterprise-2.0.0` (Q0–Q5 program DONE)  
**Target:** `enterprise-2.1.0` (dedicated-tenant **production GA-lite**)  
**Horizon:** ~3–9 months (indicative)  
**Control plane:** `docs/ENTERPRISE-2.1-STATUS.md` + `docs/enterprise-2.1/milestones.json`  
**Automation:** `scripts/enterprise-2.1/` (same pattern as 2.0)

---

## Relationship to 2.0

| | Enterprise 2.0 | Enterprise 2.1 |
|--|----------------|----------------|
| Goal | Platform + spine + ops **scaffolding** GA in monorepo | **Prod-capable** single-tenant + domain depth |
| Tag | `enterprise-2.0.0` | `enterprise-2.1.0` |
| Status machine | **DONE** — do not reset | New STATUS file (independent) |
| Honesty | Foundations + residual debt | Close residual that blocks first production tenant |

2.0 is **closed**. 2.1 is a **new program**, not a restart of Q0–Q5.

---

## Non-negotiables (inherit 2.0 ADR-008 + tighten for prod)

1. Auth always ON in prod profiles; iss/aud (and azp when configured)  
2. JetStream mandatory on prod path; multi-node HA path **live** or explicitly waived with risk sign-off  
3. Outbox TX + multi-replica claim (`lockedAt`)  
4. Idempotent consumers on money/stock/saga  
5. No secrets in git; Vault/K8s Secrets only in prod  
6. Tenancy default **DEDICATED_STACK**  
7. Decimal money; migrate-only in prod  
8. Gates = live + e2e + structural — never readiness theater  
9. No Faza 29+ pipelines  
10. **DR live** only with approved project name (e.g. `erp-pilot-dr` / prod DR project)  
11. No force-push master; no filter-repo without `APPROVED_BY_USER_A`

---

## North star (what “fully realized” means for 2.1)

A **single dedicated tenant** can:

- Run ETO week **without CLI** (UI + API only)  
- Post money paths with period discipline and compensations  
- Survive process restart and documented DR drill  
- Be operated with real SLOs/alerts and secret hygiene  
- Pass external pen-test **scope pack** + SBOM/CVE gate in CI  

**Out of 2.1 (→ 2.2+):** multi-region active-active, SHARED_RLS SaaS, marketplace plugins, mass-production MES, AI-autonomous ERP.

---

## Program phases (P0–P5)

Each phase: **DESIGN → IMPLEMENT → GATE → RELEASE**  
Tags: `enterprise-2.1.p0` … `enterprise-2.1.p5` then **`enterprise-2.1.0`** on final merge.

| ID | Tag | Focus | Outcome |
|----|-----|--------|---------|
| **P0** | `enterprise-2.1.p0-bootstrap` | Prod bootstrap | Staging+prod topology, secrets, deploy path, health matrix |
| **P1** | `enterprise-2.1.p1-observability` | Observability + SLO | OTel/metrics on core services, burn alerts, runbooks |
| **P2** | `enterprise-2.1.p2-dr` | DR + resilience | Live DR drill evidence, backup schedule, RPO/RTO measured |
| **P3** | `enterprise-2.1.p3-domain` | Domain depth | Finance/tax/Temporal prod path, ETO money reliability |
| **P4** | `enterprise-2.1.p4-ux-dms` | UX + DMS prod | UAT ETO week, S3/object DMS, search/webhook ops |
| **P5** | `enterprise-2.1.0` | Compliance + cutover | Pen-test close, SBOM CI, ISO evidence pack, GA-lite sign-off |

---

## P0 — Prod bootstrap

### Goals
- Documented **staging** and **prod** compose/Helm profiles  
- All secrets from env/Vault; `ci-no-secrets` green  
- One-command **health matrix** (gateway + core services)  
- Finance `dist/main` (or image) **stable start** (no flaky nest path)  
- Enterprise profile flags (`ENTERPRISE=1`, `NATS_JETSTREAM=true`) enforced in prod values  

### Gate (indicative)
- `bash scripts/ci-no-secrets.sh`  
- `pnpm run smoke:pilot`  
- Structural: prod/staging values + health-matrix script present  
- Boot: core services healthy ≥ N minutes  

### Exit
Tag `enterprise-2.1.p0-bootstrap`

---

## P1 — Observability + SLO

### Goals
- OTel (or existing) traces on gateway + PM/INV/FIN/MES  
- Prometheus scrapes + Grafana dashboards for SLI from `docs/enterprise-2.0/SLO-MATRIX.md`  
- Alert rules: gateway availability, error rate, outbox lag (if metric exists)  
- On-call runbook: page → dashboard → common restarts  

### Gate
- Structural SLO/alerts present  
- Smoke pilot green  
- Optional: alertmanager dry-fire  

### Exit
Tag `enterprise-2.1.p1-observability`

---

## P2 — DR + resilience

### Goals
- Scheduled backups (cron/K8s CronJob) for all pilot DBs  
- **Live** DR drill once on `COMPOSE_PROJECT_NAME=erp-pilot-dr` (or approved name) with evidence log  
- RPO/RTO **measured** and written to `docs/enterprise-2.1/DR-EVIDENCE.md`  
- JetStream HA: either 3-node lab **or** signed residual with mitigation  

### Gate
- `DR_DRILL_DRY_RUN=1` always green  
- Live drill evidence file present (or STATUS waiver)  
- smoke:pilot after restore smoke  

### Exit
Tag `enterprise-2.1.p2-dr`

---

## P3 — Domain depth (money + saga)

### Goals
- Finance: period close stable; AR/AP usable for ETO invoice path; reverse paths green under live  
- Tax: KSeF staging with real-shaped config; prod fail-closed proven  
- Temporal: **at least one** critical workflow live (ETO fail-step or KSeF+revenue) **or** G-lite promoted with explicit residual  
- Outbox relay multi-replica smoke (2 processes)  

### Gate
- `REQUIRE_LIVE=1 REQUIRE_LIVE_STRICT=1 pnpm run smoke:pilot`  
- `REQUIRE_LIVE=1 REQUIRE_LIVE_STRICT=1` saga compensation  
- Structural domain checks  

### Exit
Tag `enterprise-2.1.p3-domain`

---

## P4 — UX + DMS production

### Goals
- ETO week UI path UAT checklist signed (human or scripted browser with real data)  
- DMS: object storage backend (S3/minio); versions persisted in DB  
- Global search authz + Meili in prod profile  
- Webhooks: signed delivery + retry + DLQ log  

### Gate
- Playwright e2e pilot-eto-complete 12/12  
- smoke:pilot  
- Structural UX/DMS checks  

### Exit
Tag `enterprise-2.1.p4-ux-dms`

---

## P5 — Compliance + cutover → `enterprise-2.1.0`

### Goals
- External or internal pen-test against pack scope; findings triaged  
- SBOM in CI (syft/grype or equivalent); high CVE policy  
- ISO 27001 evidence links (not just map)  
- Cutover runbook for first dedicated tenant  
- Sign-off checklist in STATUS  

### Gate
- Full pilot suite + e2e  
- check-p5-compliance structural  
- Human sign-off field in STATUS: `GA_LITE_SIGNED=true` (optional hard gate)  

### Exit
Tag **`enterprise-2.1.0`** — dedicated-tenant production GA-lite

---

## Workstreams cross-cut (all phases)

| Stream | Owner archetype | Continuous duty |
|--------|-----------------|-----------------|
| Platform | erp-guardian / platform eng | Auth, NATS, deploy, secrets |
| Domain | domain owners | Finance, tax, MES, quality |
| UX | frontend + PM | ETO week, search |
| Ops | SRE | SLO, DR, on-call |
| Compliance | security | Pen-test, SBOM, ISO evidence |

---

## Timeline (indicative)

| Horizon | Milestone |
|---------|-----------|
| 0–4 weeks | P0 bootstrap |
| 1–2 months | P0+P1 |
| 2–4 months | through P2 |
| 4–7 months | through P3 |
| 6–9 months | P4+P5 → **enterprise-2.1.0** |

Adjust concurrency: P1∥P2 after P0; P3∥P4 after P2 where independent.

---

## Risks

| Risk | Mitigation |
|------|------------|
| Scope creep to full SAP-like ERP | Hard non-goals; P3 limited to ETO-critical money |
| Demo theater returns | Gates stay live-oriented; no Faza 29+ |
| DR live damages shared DBs | Only `erp-pilot-dr` / dedicated project |
| Finance flaky boot | P0 owns stable image/start path |
| Temporal ops cost | Explicit fallback residual if not funded |

---

## Success criteria (`enterprise-2.1.0`)

- [ ] Staging + prod deploy paths documented and exercised  
- [ ] Secrets only via Vault/env; ci-no-secrets green  
- [ ] Core SLOs alertable  
- [ ] DR evidence (dry-run always; live once)  
- [ ] Live hard smoke:pilot + saga green  
- [ ] ETO week without CLI (UAT)  
- [ ] DMS versions on durable storage  
- [ ] SBOM/CVE gate in CI  
- [ ] Pen-test findings closed or accepted with residual IDs  
- [ ] Tag `enterprise-2.1.0` on master  

---

## Automation

```bash
pnpm run enterprise21:status
pnpm run enterprise21:prompt
pnpm run enterprise21:step
pnpm run enterprise21:gate
pnpm run enterprise21:loop
```

Same semantics as 2.0: DESIGN/IMPLEMENT by agent; GATE local; RELEASE `gh pr` + tag.

**Resume one-liner:**

```text
RESUME Enterprise 2.1. Repo /home/bogdan-mazur/PROGRAMY/ERP/erp-composable-2026
Read docs/ENTERPRISE-2.1-STATUS.md + docs/enterprise-2.1/NEXT_AGENT_PROMPT.md
Execute fully. No confirmation pauses. Commit. Push. pnpm run enterprise21:step
```

---

## After 2.1 → 2.2+ (not scheduled here)

- SHARED_RLS multi-tenant  
- Multi-region  
- Full accounting suite / payroll  
- Mass MES / IoT fleet  
- Marketplace / AI autonomous agents  
