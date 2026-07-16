# Vault Raft Cluster Policy (W133)

Replaces HA stub (`vault-ha`) with integrated Raft storage for dev/staging.

- **Primary:** `vault` on `:8200` with Raft storage
- **Raft node config:** `infra/vault/raft/raft-config.hcl`
- **Compose service:** `vault-raft` on `:8202` (prod-observability profile)
- **Bootstrap:** `scripts/ensure-vault-raft-ready.sh`
- **Production:** 3+ node Raft cluster + cloud KMS auto-unseal
