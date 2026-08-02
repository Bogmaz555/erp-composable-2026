# Secrets contract (Enterprise 2.1 P0)

**Never commit secret values.** Use Vault, K8s Secrets, or local `.env` (gitignored).

Related: Variant B history (`docs/SECURITY-SECRETS-VARIANT-B.md`), `infra/enterprise.env.example`, `bash scripts/ci-no-secrets.sh`.

## Profiles

| Profile | How secrets are injected |
|---------|--------------------------|
| `local-pilot` | `.env` / shell export (dev defaults OK) |
| `staging` | K8s `Secret` + envFrom / Vault agent |
| `prod` | Vault or cloud secret manager → K8s only |

## Required keys (no values here)

### Platform / auth
| Key | Required | Notes |
|-----|----------|--------|
| `KEYCLOAK_ISSUER` | staging/prod | JWT iss |
| `KEYCLOAK_JWKS_URI` | staging/prod | JWKS URL |
| `JWT_AUDIENCE` | recommended | aud claim |
| `JWT_AZP_ALLOWLIST` | optional | client ids |
| `JWT_SECRET` | only if HS256 dev | never prod |
| `AUTH_ENFORCE` | prod = true | never false in prod |
| `AUTH_DISABLE` | must be unset/false | |

### Messaging
| Key | Required | Notes |
|-----|----------|--------|
| `NATS_URL` | yes | |
| `NATS_JETSTREAM` | enterprise = true | |
| `ENTERPRISE` | staging/prod = 1 | or `ERP_PROFILE=enterprise` |

### Data
| Key | Required | Notes |
|-----|----------|--------|
| `*_DATABASE_URL` | per service | Postgres DSN |
| `FINANCE_DATABASE_URL` | finance | |
| `DMS_DATABASE_URL` | dms when used | |

### Search / Meili
| Key | Required | Notes |
|-----|----------|--------|
| `MEILI_MASTER_KEY` | when Meili on | env only |
| `MEILI_HOST` | when Meili on | |

### Webhooks (Q4+)
| Key | Required | Notes |
|-----|----------|--------|
| `WEBHOOK_SIGNING_SECRET` | when webhooks on | HMAC |

### Tenancy
| Key | Required | Notes |
|-----|----------|--------|
| `TENANCY_MODEL` | default DEDICATED_STACK | |
| `ERP_TENANT_ID` | dedicated stack | |

## Forbidden

- Secrets in `values-*.yaml` committed to git  
- Hardcoded Meili/Keycloak passwords in source  
- Committing `backups/*.dump` with live data without policy  

## Verification

```bash
bash scripts/ci-no-secrets.sh
# staging/prod: kubectl get secret -n erp-prod  (names only; no print data in tickets)
```
