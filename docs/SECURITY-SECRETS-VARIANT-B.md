# Secrets policy — Variant B (Pilot v1 COMPLETE)

**Date:** 2026-08-02  
**Choice:** Variant B — **do not rewrite git history** (filter-repo not run).

## What we accept
- Historical commits may contain former TLS keys / unseal material.
- Working tree is clean of `*.key` / `cluster-keys.json` (enforced by `scripts/ci-no-secrets.sh`).
- Dev/pilot Meili master key is **env-only** (`MEILI_MASTER_KEY`), never committed.

## Required operations
1. Treat repo as **private** until history purge (Variant A) is approved.
2. **Rotate** any credentials that ever appeared in git before production customer data:
   - DB passwords (compose defaults `erp_password` → vault-generated)
   - Keycloak admin
   - Meili master key
   - JWT/HS256 secrets if used outside JWKS
3. Issue **new** mTLS CA outside repo for any non-dev deploy.

## Variant A (not executed)
`git filter-repo` + force-push + full CA rotation — only when `STATUS=APPROVED_BY_USER_A`.
