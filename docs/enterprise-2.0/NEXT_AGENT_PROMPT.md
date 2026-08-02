<!-- generated 2026-08-02T11:53:25.489Z milestone=Q2 phase=DESIGN sha=2f8fb96 -->
<!-- Unattended: paste into Grok OR run /workflow enterprise-20-step|continuous -->

# AGENT MISSION — Q2 DESIGN (autonomous)

Repo: /home/bogdan-mazur/PROGRAMY/ERP/erp-composable-2026
Baseline: pilot-v1.1.0 → current master
Branch: `enterprise-0.3-finance-compliance` (create from master if missing)
Tenancy lock: **DEDICATED_STACK**

## Identity
Principal Architect. Full autonomy. No "should I continue?" questions.

## Task
Produce design document at **`docs/ENTERPRISE-0.3-FINANCE-DESIGN.md`** for milestone **Q2: Finance Tax Quality EAM Temporal**.

### Workstreams
- Finance journal AR/AP period close
- KSeF prod-capable path
- Quality NCR CAPA full
- EAM real IoT adapter interface
- Temporal (or equivalent) for ETO/finance/proc sagas
- Full financial compensations

### Rules
- Include Key Decisions, Alternatives, Security, risks, **## PR Plan** with `### PR N: Title`, Dependencies, Files, Description
- No readiness theater / Faza 29+
- Non-negotiables: ADR-008 + docs/ENTERPRISE-2.0-PLAN.md
- After design file written: update docs/ENTERPRISE-2.0-STATUS.md phase=IMPLEMENT, commit, push branch `enterprise-2.0-automation` or `enterprise-0.3-finance-compliance`
- Prefer also running: `/design` equivalent quality (self-review once)

### Forbidden
- domain scope creep

START NOW. Write the design file.

## Autonomy contract (mandatory)
- ZERO confirmation pauses. Execute fully.
- Read also: docs/enterprise-2.0/AGENT_CONTRACT.md
- After work: update STATUS (or `node scripts/enterprise-2.0/advance-phase.mjs success "reason"`)
- Commit + push, then: `pnpm run enterprise:step`
- Forbidden: force-push master, filter-repo without APPROVED_BY_USER_A, secrets in git, readiness theater
