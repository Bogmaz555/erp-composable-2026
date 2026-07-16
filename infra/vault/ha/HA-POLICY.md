# Vault HA Policy (W129)

- **Primary**: `vault` on `:8200` (prod-security / prod-observability)
- **Secondary stub**: `vault-ha` on `:8201` (prod-observability only)
- **Health check**: `scripts/ensure-vault-ha-ready.sh` verifies both nodes respond
- **Production**: replace stub with Raft cluster + cloud KMS auto-unseal
