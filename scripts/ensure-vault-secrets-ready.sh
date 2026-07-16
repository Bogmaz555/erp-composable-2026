#!/usr/bin/env bash
# W117 — Ensure Vault is up and secrets exist (rotate if stale/missing)
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VAULT_ADDR="${VAULT_ADDR:-http://localhost:8200}"
LOG="${ROOT}/.agents/swarm/ensure-vault-secrets.log"
MAX_WAIT="${VAULT_MAX_WAIT:-60}"
mkdir -p "$(dirname "$LOG")"

log() { echo "[$(date -Iseconds)] [vault-secrets] $*" | tee -a "$LOG"; }

bash "${ROOT}/scripts/ensure-vault-tls-ready.sh" 2>&1 | tail -3 | tee -a "$LOG" || true

log "waiting for Vault (${MAX_WAIT}s max)"
waited=0
while [[ $waited -lt $MAX_WAIT ]]; do
  if curl -sf "${VAULT_ADDR}/v1/sys/health" >/dev/null 2>&1; then
    log "Vault ready (${waited}s)"
    break
  fi
  sleep 3
  ((waited += 3)) || true
done

if [[ $waited -ge $MAX_WAIT ]]; then
  log "FAIL: Vault not ready"
  exit 1
fi

VAULT_TOKEN="${VAULT_TOKEN:-root}"
needs_rotate=0
for key in db-password api-key jwt-secret; do
  if ! curl -sf -H "X-Vault-Token: ${VAULT_TOKEN}" "${VAULT_ADDR}/v1/secret/erp/${key}" >/dev/null 2>&1; then
    log "missing secret/erp/${key} — rotate"
    needs_rotate=1
  fi
done

if [[ $needs_rotate -eq 1 ]]; then
  bash "${ROOT}/scripts/rotate-vault-secrets.sh" 2>&1 | tee -a "$LOG"
else
  log "Vault secrets OK"
fi
