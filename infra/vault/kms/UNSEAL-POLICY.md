# Vault Auto-Unseal Policy (W121 — KMS dev profile)

- **Scope**: dev Vault auto-unseal via Shamir threshold + KMS stub (`infra/vault/kms-unseal.hcl`)
- **Unseal keys**: stored in `infra/vault/unseal/` (gitignored in prod; dev `.gitkeep` only)
- **Automation**: `scripts/ensure-vault-kms-unseal-ready.sh` — start Vault, apply KMS config, unseal if sealed
- **Rotation**: `scripts/rotate-vault-unseal-keys.sh` — rekey + archive old keys
- **Prerequisite**: `docker compose --profile prod-security up -d vault`
