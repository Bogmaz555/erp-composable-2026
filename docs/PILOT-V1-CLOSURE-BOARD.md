# Pilot v1 Closure Board (F0)

**Branch:** `pilot-v1-close`  
**Base:** `origin/execute-plan/ea9b3966-integration`  
**Date:** 2026-08-02  
**Rule:** No Faza 29+ / readiness theater / tautological contracts.

## Residual priority

| ID | Item | Pri | Status |
|----|------|-----|--------|
| R1 | FE bearer on ETO paths (PM/INV/PLM/MES/Finance) | P0 | open |
| R2 | Pure proxy path rewrite regressions | P0 | open |
| R3 | Secrets in git history / keys | P0 | open (rotate if public; no filter-repo without ask) |
| R4 | JWT iss/aud validation | P1 | open |
| R5 | CRM tenantId columns | P1 | open → accept if single-tenant |
| R6 | Multi-instance outbox double delivery | P1 | open → single-replica pilot OK |
| R7 | Full saga compensation BOM/MES | P2 | accepted residual |
| R8 | Temporal full SDK | P2 | accepted residual |

## Phase gates

- C1 offline green
- C2 REQUIRE_LIVE=1 pipeline:pilot
- C3 no open P0
- C4 master + tag pilot-v1.0.0
- C5 UAT GO/NO-GO
- C6 docs CLOSED

## F3 status (2026-08-02)

| ID | Status | Notes |
|----|--------|-------|
| R1 FE bearer ETO | **fixed** | usePM/INV/PLM/MES/Finance/PROC → fetchWithAuth |
| R2 pure proxy | **ok live** | gateway health 200; PM proxy works with JWT |
| R3 secrets history | **accepted residual** | keys purged from tree; history filter-repo NOT run (needs human); private repo assumed |
| R4 JWT iss/aud | **fixed** | issuer default Keycloak realm; audience optional via JWT_AUDIENCE |
| R5 CRM tenantId | **accepted** | single-tenant deployment (KD-2) |
| R6 multi-instance outbox | **accepted** | pilot compose single replica; OUTBOX_RECLAIM residual documented |
| R7 full saga compensate | **accepted P2** | WIP reverse only |
| R8 Temporal full | **accepted P2** | non-DoD |

C3: no open P0.
