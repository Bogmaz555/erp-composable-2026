# E0 — GA-lite sign-off Design

## Goal
Close Enterprise 2.1 GA-lite with **evidence-backed** sign-off without reopening P0–P5 implementation.

## Key Decisions
| ID | Decision |
|----|----------|
| KD-E0-1 | Sign-off is evidence in repo + flags; not a new feature branch of domain code |
| KD-E0-2 | Tags enterprise-2.1.p0…p4 + 2.1.0 must exist on origin |
| KD-E0-3 | DR dry-run on `erp-pilot-dr` is sufficient for E0 (live drill residual) |
| KD-E0-4 | Full pilot-eto 12/12 live UAT may remain residual if CI + smoke structural gates green — recorded honestly |
| KD-E0-5 | Tag `enterprise-2.1.0-signed` after merge of evidence pack |

## Alternatives
- Wait for human wet-ink only → delays roadmap; rejected for automation path (evidence pack = human-equivalent)

## Security
- `ci-no-secrets` must PASS
- Secrets contract remains env/Vault only

## Risks
| Risk | Mitigation |
|------|------------|
| Theater sign-off | check-e0-signoff requires EVIDENCE_PACK_DATE + flags |
| Missing tags | gate fails |

## PR Plan

### PR 1: Control plane + E0 evidence + signed tag
- Scaffold enterprise-roadmap scripts/docs
- Fill GA-LITE-SIGNOFF + DR evidence + GA_LITE_SIGNED
- Gate: check-e0-signoff + ci-no-secrets
- Tag: enterprise-2.1.0-signed
