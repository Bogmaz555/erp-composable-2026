# ERP 2026 – MASTER PLAN

**Wersja:** 3.2  
**Data:** 2026-06-08  
**Bieżąca faza:** **Faza 28** — K8s Extended, Tenant Hardening, KSeF Prod (W139–W142) ✅

> Szczegóły gate: `docs/PROJECT-STATE.md` | Closure: `.agents/orchestrator/CHECKPOINTS/FAZA28-FINAL-CLOSURE.md`

---

## 1. Wizja

Composable ERP dla produkcji jednostkowej (ETO) — architektura mikroserwisowa, DDD, CQRS, NATS + Outbox, database-per-service.

---

## 2. Stan na dziś (2026-06-07)

| Obszar | Status | Gate |
|--------|--------|------|
| Governance + Event Registry | ✅ 100% | Faza 0 |
| Manufacturing ETO spine | ✅ ~90% | Faza 1 |
| Finance + KSeF | ✅ ~85% | Faza 2 |
| Procurement MRP | ✅ ~72% | Faza 3 |
| Quality + EAM | 🔄 ~55% | Faza 4 pilotaż |
| Production hardening W47–W50 | ✅ | 30/30 contracts |
| BI + CI + Playwright W67–W86 | ✅ | F14: 74/74 |
| Observability + Security W87–W110 | ✅ | F20: 98/98 |
| SLO + Vault + Cross-chain W111–W130 | ✅ | **F25: 118/118** |
| **K8s + Visual + Vault Raft W131–W134** | ✅ | **F26: 122/122** |
| **Helm + VisualDiff + Q/EAM W135–W138** | ✅ | **F27: 126/126** |
| **K8sExt + Tenant + KSeF W139–W142** | ✅ | **F28: 130/130** |

**Aktualny gate:** Contract **130/130** | Regression **125/125** @ 100%

---

## 3. Fazy strategiczne (W47+)

| Faza | Warstwy | Focus | Status |
|------|---------|-------|--------|
| 5 | W47–W50 | Production hardening | ✅ |
| 6 | W51–W54 | Domain depth | ✅ |
| 8–9 | W59–W66 | Data trust + Security | ✅ |
| 10–14 | W67–W86 | BI, CI, Playwright, metrics | ✅ |
| 15–20 | W87–W110 | Grafana, alerts, mTLS, 11-mod matrix | ✅ |
| 21–22 | W111–W118 | SLO burn-rate, cross-chain, TLS/Vault secrets | ✅ |
| 23–25 | W119–W130 | SLO alerting/routing, Vault KMS/audit/HA, prod-obs | ✅ |
| **26** | **W131–W134** | **K8s manifests, visual regression, Vault Raft** | ✅ |
| **27** | **W135–W138** | **Helm charts, visual diff gate, Q/EAM production** | ✅ |
| **28** | **W139–W142** | **K8s extended, tenant hardening, KSeF prod** | ✅ |
| 29+ | W143+ | Vault Raft 3-node, Helm remaining services, KSeF live | 📋 |

---

## 4. Faza 28 — plan (W139–W142) ✅

| Warstwa | Deliverable | Gate env |
|---------|-------------|----------|
| **W139** | K8s extended manifests + `/platform/k8s-extended/readiness` | `CI_K8S_EXTENDED` |
| **W140** | Tenant hardening + `/platform/tenant-hardening/readiness` | `CI_TENANT_HARDENING` |
| **W141** | KSeF production profile + `/platform/ksef-prod/readiness` | `CI_KSEF_PROD` |
| **W142 FINAL** | `pnpm run pipeline:faza28-final` | 130/130 contracts, 125/125 regression |

---

## 5. Faza 29+ — kolejka

- Vault Raft 3-node cluster (replace dev stub)
- Helm templates for remaining services
- KSeF sandbox MF integration (live certs)

Żywa lista: `docs/FEATURE-EXPANSION-ROADMAP.md`

---

## 6. Zasady autonomicznej pracy

1. Wzorzec fazy: readiness → probe → smoke → +4 contracts → regression (+3) → CI → pipeline → closure
2. Checkpoint: `CHECKPOINTS/FAZA{N}-FINAL-CLOSURE.md` + `CURRENT-CONTEXT.md` + `PROJECT-STATE.md`
3. Nie commituj bez explicit request
4. Minimalny diff, istniejące konwencje

---

## 7. Dokumenty kanoniczne

| Dokument | Rola |
|----------|------|
| `docs/PROJECT-STATE.md` | Pełny stan + historia faz |
| `docs/FEATURE-EXPANSION-ROADMAP.md` | Warstwy W0–Wn |
| `.agents/orchestrator/CURRENT-CONTEXT.md` | Bieżący kontekst agenta |
| `docs/GOVERNANCE.md` | Proces |
| `docs/TECHNICAL-DEBT.md` | Dług |
