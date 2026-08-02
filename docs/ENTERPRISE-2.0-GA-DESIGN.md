# Enterprise 2.0.0 — Ops Certification GA Design (Q5)

| Field | Value |
|-------|-------|
| **Document** | Enterprise Q5 Ops Certification / GA |
| **Baseline** | `enterprise-0.5-ux-mdm` |
| **Target tag** | `enterprise-2.0.0` |
| **Branch** | `enterprise-2.0.0-ga` |
| **Status** | Ready for IMPLEMENT |
| **Tenancy** | **DEDICATED_STACK** |

---

## Overview

Q0–Q4 closed platform → ETO → finance → scale → UX. **Q5** certifies **operations GA**: real SLOs, DR drill, pen-test pack + SBOM, ISO 27001 control map, Helm umbrella + air-gap notes.

### Workstreams

1. SLO real metrics all services  
2. DR enterprise RPO/RTO drilled  
3. Pen-test pack + SBOM  
4. ISO 27001 control map  
5. Helm umbrella all services air-gap notes  

---

## Key Decisions

### KD-Q5-1 — SLOs from live metrics

Prometheus/Grafana queries + burn-rate alerts where present; document per-service SLI (availability, latency p95). No fake readiness files.

### KD-Q5-2 — DR drill

Use existing `scripts/dr-drill.sh` with `COMPOSE_PROJECT_NAME=erp-pilot-dr` only for live; dry-run default in gate.

### KD-Q5-3 — SBOM + pen-test pack

Generate SBOM via `syft` or `pnpm` audit export; pen-test pack = checklist + auth surface inventory (not full external pen-test).

### KD-Q5-4 — ISO 27001 map

Control matrix CSV/MD mapping Annex A themes to repo evidence (auth, secrets B, logging, backup).

### KD-Q5-5 — Helm umbrella

Umbrella chart notes under `infra/helm/`; air-gap: offline image list + values.

---

## PR Plan

### PR 1: SLO dashboard + SLI doc

- **Files:** `docs/enterprise-2.0/SLO-MATRIX.md`, grafana json if present, metrics endpoints audit  
- **Description:** Per-service SLI table + links to Grafana.

### PR 2: DR drill evidence + RPO/RTO

- **Files:** `docs/enterprise-2.0/DR-RPO-RTO.md`, harden `scripts/dr-drill.sh` dry-run exit codes  
- **Description:** RPO/RTO targets; dry-run gate safe.

### PR 3: SBOM + pen-test pack

- **Files:** `docs/enterprise-2.0/PENTEST-PACK.md`, `scripts/enterprise-2.0/gen-sbom.sh`  
- **Description:** Auth attack surface inventory; SBOM generation script.

### PR 4: ISO 27001 control map

- **Files:** `docs/enterprise-2.0/ISO27001-CONTROL-MAP.md`  
- **Description:** Map controls to ADR/scripts evidence.

### PR 5: Helm umbrella + air-gap notes

- **Files:** `infra/helm/README-UMBRELLA.md`, air-gap image list  
- **Description:** Deploy order; offline notes.

### PR 6: Q5 gate structural + STATUS

- **Files:** `scripts/enterprise-2.0/check-q5-ga.sh`, milestones (no recursive gate-check)  
- **Description:** Structural file presence + dr-drill dry-run.

---

## Gates

```bash
bash scripts/enterprise-2.0/check-q5-ga.sh
COMPOSE_PROJECT_NAME=erp-pilot-dr DR_DRILL_DRY_RUN=1 bash scripts/dr-drill.sh
pnpm run smoke:pilot
```

**Do not** nest `gate-check.sh Q5` inside itself.

---

## Success

Tag `enterprise-2.0.0` on master; STATUS DONE; program complete.
