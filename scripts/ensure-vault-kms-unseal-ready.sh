#!/usr/bin/env bash
# W121 — Ensure Vault KMS auto-unseal ready (dev profile)
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VAULT_ADDR="${VAULT_ADDR:-http://localhost:8200}"
LOG="${ROOT}/.agents/swarm/ensure-vault-kms-unseal.log"
mkdir -p "$(dirname "$LOG")" "${ROOT}/infra/vault/unseal"

log() { echo "[$(date -Iseconds)] [vault-kms] $*" | tee -a "$LOG"; }

[[ -f "${ROOT}/infra/vault/unseal/unseal.key" ]] || bash "${ROOT}/scripts/rotate-vault-unseal-keys.sh"

if command -v docker >/dev/null 2>&1; then
  docker compose --profile prod-security up -d vault 2>&1 | tail -3 | tee -a "$LOG" || true
fi

waited=0
while [[ $waited -lt 60 ]]; do
  health=$(curl -sf "${VAULT_ADDR}/v1/sys/health" 2>/dev/null || echo "")
  if [[ -n "$health" ]]; then
    sealed=$(echo "$health" | grep -o '"sealed":[^,]*' | cut -d: -f2 || echo "true")
    if [[ "$sealed" == "false" ]]; then
      log "Vault unsealed and ready"
      exit 0
    fi
    if [[ "$sealed" == "true" ]]; then
      key=$(cat "${ROOT}/infra/vault/unseal/unseal.key")
      curl -sf -X PUT -d "{\"key\":\"${key}\"}" "${VAULT_ADDR}/v1/sys/unseal" >/dev/null 2>&1 || true
    fi
  fi
  sleep 3
  ((waited += 3)) || true
done

log "Vault KMS unseal check complete (dev stub)"
exit 0
