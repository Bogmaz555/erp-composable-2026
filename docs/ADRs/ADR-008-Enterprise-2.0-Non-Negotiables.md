# ADR-008: Enterprise 2.0 Non-Negotiables

**Status:** Accepted  
**Date:** 2026-08-02  
**Baseline:** pilot-v1.1.0  

## Context

Pilot v1 COMPLETE proved ETO value with honest gates. Enterprise requires platform guarantees that cannot be waived for demo speed.

## Decision

The following are **blocking** for any tag `enterprise-0.x` and `enterprise-2.0.0`:

1. **Auth always on** in enterprise profiles; JWT iss (and aud when configured).  
2. **JetStream** is the production event transport; dual Nest+JS subscribe forbidden.  
3. **Outbox** transactional writes; multi-replica claim safety.  
4. **Idempotent** consumers on money/stock/saga paths.  
5. **No secrets** in working tree; CI `ci-no-secrets`; history Variant B unless A approved.  
6. **Tenancy model** locked in STATUS (`DEDICATED_STACK` default).  
7. **Decimal** for money; `check-no-float-money` required.  
8. **Quality gates** are live-oriented scripts and e2e — not file-existence readiness.  
9. **Automation** advances only when GATE phase exits 0.

## Consequences

- Slower feature velocity during Q0–Q1.  
- Demo shortcuts (AUTH_ENFORCE=false, core NATS only, trigger-demo as sole path) are non-compliant for enterprise tags.  
- Violations fail `scripts/enterprise-2.0/gate-check.sh`.
