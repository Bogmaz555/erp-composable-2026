# Enterprise 0.4 — Isolation and Scale Design (Q3)

| Field | Value |
|-------|-------|
| **Document** | Enterprise Q3 Isolation + Scale |
| **Baseline** | `enterprise-0.3-finance-compliance` |
| **Target tag** | `enterprise-0.4-isolation-scale` |
| **Branch** | `enterprise-0.4-isolation-scale` |
| **Status** | Ready for IMPLEMENT |
| **Tenancy lock** | **DEDICATED_STACK** (STATUS; SHARED_RLS not selected) |

---

## Overview

Q0–Q2 closed platform, ETO spine, finance/compliance. **Q3** hardens **isolation and scale** so enterprise deploys are not single-node demo topology.

### Workstreams

1. Tenancy model enforced (DEDICATED_STACK — STATUS default)  
2. NetworkPolicy + non-public services  
3. NATS 3-node or documented HA path  
4. k6 business-path load budgets  
5. HPA / PDB / resources on Helm  

---

## Background

| Area | Residual | Q3 target |
|------|----------|-----------|
| Tenancy | ADR-009 + pilot tenant-extension; dedicated stack contract | Runtime assert `TENANCY_MODEL=DEDICATED_STACK`; reject SHARED without STATUS flip |
| Network | Services often bind 0.0.0.0; compose public ports | Helm NetworkPolicy: only gateway ingress; DB/NATS internal |
| NATS | Single `erp-nats` container | Document + optional compose/k8s 3-node JetStream cluster; single-node allowed with HA runbook |
| Load | No budgeted k6 | `scripts/load/eto-path.k6.js` + thresholds |
| Helm | Charts partial | HPA + PDB + requests/limits on gateway + core services |

---

## Key Decisions

### KD-Q3-1 — DEDICATED_STACK enforced

`TENANCY_MODEL` must equal STATUS tenancy under ENTERPRISE. SHARED_RLS only if STATUS says so (currently does not).

### KD-Q3-2 — NetworkPolicy deny-by-default ingress

Gateway accepts external; all other pods only from mesh namespace / gateway.

### KD-Q3-3 — NATS HA path documented + optional cluster

Prefer: `infra/nats/HA.md` + `docker-compose.nats-ha.yml` or k8s StatefulSet notes. Gate does not require 3 live nodes if runbook + single-node JetStream proven.

### KD-Q3-4 — k6 budgets (ETO path)

p95 latency and error rate thresholds on gateway health + authenticated PM list smoke path.

### KD-Q3-5 — HPA/PDB minimum

Gateway + 3 critical services (pm, inv, finance) with minReplicas=1, PDB maxUnavailable=1 for multi-replica profiles.

---

## PR Plan

### PR 1: Tenancy model runtime enforcement

- **Files:** shared-kernel tenancy assert, gateway/main, ADR-009 cross-link, env example  
- **Description:** Fail closed when ENTERPRISE and TENANCY_MODEL mismatch STATUS default DEDICATED_STACK.

### PR 2: NetworkPolicy + non-public service notes

- **Files:** `infra/k8s/networkpolicy/*.yaml`, Helm values `networkPolicy.enabled`  
- **Description:** Deny ingress except gateway; document compose port exposure residual.

### PR 3: NATS HA runbook + optional compose

- **Files:** `infra/nats/HA.md`, optional `docker-compose.nats-ha.yml`  
- **Description:** 3-node JetStream path; single-node pilot residual explicit.

### PR 4: k6 ETO path load budgets

- **Files:** `scripts/load/eto-path.k6.js`, `package.json` script `load:eto`  
- **Description:** Thresholds for health + PM; document how to run.

### PR 5: Helm HPA PDB resources

- **Files:** `infra/helm/**` or `charts/` HPA/PDB/resources for gateway, pm, inv, finance  
- **Description:** Requests/limits + HPA + PDB templates.

### PR 6: Q3 gate docs + STATUS

- **Files:** gate-check notes, STATUS  
- **Description:** smoke:pilot + structural checks for policies/HPA presence.

---

## Gates

```bash
pnpm run smoke:pilot
bash scripts/enterprise-2.0/gate-check.sh Q3
# structural: networkpolicy files, HA.md, k6 script, HPA yaml exist
```

---

## Success

Tag `enterprise-0.4-isolation-scale`; Q3 checklist done → Q4 DESIGN.
