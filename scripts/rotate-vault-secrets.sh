#!/usr/bin/env bash
# W117 — Rotate Vault KV secrets (backup old, generate new)
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VAULT_ADDR="${VAULT_ADDR:-http://localhost:8200}"
STAMP="$(date +%Y%m%d-%H%M%S)"
ARCHIVE="${ROOT}/infra/vault/rotation/archive/${STAMP}"
mkdir -p "$ARCHIVE"

log() { echo "[vault-secrets] $*"; }

if ! curl -sf "${VAULT_ADDR}/v1/sys/health" >/dev/null 2>&1; then
  log "Vault not reachable — run ensure-vault-secrets-ready.sh first"
  exit 1
fi

# Dev mode: export root token if unsealed dev instance
VAULT_TOKEN="${VAULT_TOKEN:-root}"

for key in db-password api-key jwt-secret; do
  path="secret/erp/${key}"
  old=$(curl -sf -H "X-Vault-Token: ${VAULT_TOKEN}" "${VAULT_ADDR}/v1/${path}" 2>/dev/null || echo "")
  if [[ -n "$old" ]]; then
    echo "$old" > "${ARCHIVE}/${key}.json"
  fi
  new_val="$(openssl rand -hex 16)"
  curl -sf -X POST -H "X-Vault-Token: ${VAULT_TOKEN}" \
    -d "{\"data\":{\"value\":\"${new_val}\"}}" \
    "${VAULT_ADDR}/v1/${path}" >/dev/null 2>&1 || log "WARN: could not write ${path}"
done

log "Vault secrets rotated — archive: ${ARCHIVE}"
