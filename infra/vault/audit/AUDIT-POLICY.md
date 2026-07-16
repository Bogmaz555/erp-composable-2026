# Vault Audit Logging Policy (W125)

- **Audit device**: file sink at `/vault/logs/audit.log` (dev profile)
- **Events logged**: auth, secret read/write, unseal, policy changes
- **Retention**: 90 days — rotated via `scripts/rotate-vault-audit-log.sh`
- **Compliance check**: `scripts/ensure-vault-audit-ready.sh` verifies audit enabled + log present
- **Prerequisite**: Vault running (`docker compose --profile prod-security up -d vault`)
