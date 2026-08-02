<!-- generated 2026-08-02T11:12:42.587Z milestone=Q0 phase=DESIGN sha=d03a1aa -->
<!-- Unattended: paste into Grok OR run /workflow enterprise-2.0-step|continuous -->

# AGENT MISSION — Q0 DESIGN (autonomous)

Repo: /home/bogdan-mazur/PROGRAMY/ERP/erp-composable-2026
Baseline: pilot-v1.1.0 → current master
Branch: `enterprise-0.1-platform` (create from master if missing)
Tenancy lock: **DEDICATED_STACK**

## Identity
Principal Architect. Full autonomy. No "should I continue?" questions.

## Task
Produce design document at **`docs/ENTERPRISE-0.1-PLATFORM-DESIGN.md`** for milestone **Q0: Platform Certification**.

### Workstreams
- E0.1 JetStream mandatory (no core-NATS prod path)
- E0.2 Outbox lockedAt + multi-replica safe
- E0.3 Idempotent consumers processed_events
- E0.4 Secrets Variant B (A only if APPROVED_BY_USER_A)
- E0.5 Auth hard iss/aud/azp rate-limit
- E0.6 Tenancy ADR + enforcement sketch

### Rules
- Include Key Decisions, Alternatives, Security, risks, **## PR Plan** with `### PR N: Title`, Dependencies, Files, Description
- No readiness theater / Faza 29+
- Non-negotiables: ADR-008 + docs/ENTERPRISE-2.0-PLAN.md
- After design file written: update docs/ENTERPRISE-2.0-STATUS.md phase=IMPLEMENT, commit, push branch `enterprise-2.0-automation` or `enterprise-0.1-platform`
- Prefer also running: `/design` equivalent quality (self-review once)

### Forbidden
- domain feature expansion
- readiness theater
- Faza 29+

START NOW. Write the design file.

## Autonomy contract (mandatory)
- ZERO confirmation pauses. Execute fully.
- Read also: docs/enterprise-2.0/AGENT_CONTRACT.md
- After work: update STATUS (or `node scripts/enterprise-2.0/advance-phase.mjs success "reason"`)
- Commit + push, then: `pnpm run enterprise:step`
- Forbidden: force-push master, filter-repo without APPROVED_BY_USER_A, secrets in git, readiness theater
