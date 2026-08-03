# E1 — Production Hardening Design

## Goal
Make dedicated-stack **staging/prod** profiles production-ready under `ENTERPRISE=1` + `PILOT=1` without multi-tenant scope.

## Key Decisions
| ID | Decision |
|----|----------|
| KD-E1-1 | JetStream HA: **signed residual** for pilot window (single-node OK); HA path remains documented |
| KD-E1-2 | JWT hard claims on staging/prod Helm: `JWT_AUDIENCE=erp-api`, `JWT_AZP_ALLOWLIST=erp-frontend,erp-gateway` |
| KD-E1-3 | MEILI_MASTER_KEY required whenever AUTH_ENFORCE (already gateway assert) — set in Helm enterprise env map |
| KD-E1-4 | Prisma **migrate deploy** policy for prod; `db push` only local/CI |
| KD-E1-5 | Outbox lag alert YAML + on-call pointer |

## Alternatives
- Force 3-node NATS immediately → ops cost; deferred as residual with date

## Security
- Audience/azp pin reduces token confusion
- No secrets committed — Helm values only names/refs

## Risks
| Risk | Mitigation |
|------|------------|
| Tokens without `aud` fail prod | Document Keycloak audience mapper; local CI may soft-skip hard claims without ENTERPRISE JWT_HARD |
| Residual HA accepted too long | Residual re-review date in JETSTREAM-HA-RESIDUAL |

## PR Plan

### PR 1: E1 hardening docs + Helm JWT/Meili + alerts + migrate policy
- Design + residual update + Helm values + prometheus outbox alert stub + migrate policy doc
- Gate: `check-e1-hardening.sh` + `ci-pilot-auth-env`
