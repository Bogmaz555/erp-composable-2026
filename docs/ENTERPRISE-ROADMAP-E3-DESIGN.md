# E3 — Platform Product Design

## Goal
Repeatable dedicated-stack operations: deploy, secrets, backup, cutover, provision clone.

## Key Decisions
| ID | Decision |
|----|----------|
| KD-E3-1 | GitOps optional; ship cutover v2 + provision script first |
| KD-E3-2 | Secrets via ExternalSecret / Vault ref only in Helm |
| KD-E3-3 | Pentest High residual tracked in PENTEST-FINDINGS if not zero |

## PR Plan

### PR 1: Cutover v2 + dedicated-stack provision script + E3 design
Docs + scripts/provision-dedicated-stack.sh
