# Vault Secrets Rotation Policy (W117)

- **Scope**: dev Vault KV secrets under `secret/erp/*` (DB passwords, API keys, JWT signing keys)
- **Rotation interval**: 90 days (automated check via `scripts/ensure-vault-secrets-ready.sh`)
- **Automation**: `scripts/rotate-vault-secrets.sh` — backup current, generate new, update Vault KV
- **Prerequisite**: Vault running (`docker compose --profile prod-security up -d vault`)
- **Post-rotation**: restart affected services (gateway, analytics) to pick up new secrets
