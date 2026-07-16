#!/usr/bin/env bash
# W97 — Vault + TLS dev stack (prod-security profile)
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
VAULT_URL="${VAULT_ADDR:-http://localhost:8200}"
LOG="${ROOT}/.agents/swarm/ensure-vault-tls.log"
MAX_WAIT="${VAULT_MAX_WAIT:-60}"

log() { echo "[$(date -Iseconds)] [vault-tls] $*" | tee -a "$LOG"; }
mkdir -p "$(dirname "$LOG")"

bash "${ROOT}/scripts/generate-dev-tls-certs.sh" 2>&1 | tee -a "$LOG"

if command -v docker >/dev/null 2>&1; then
  docker compose --profile prod-security up -d vault 2>&1 | tail -3 | tee -a "$LOG" || true
fi

log "waiting for Vault (${MAX_WAIT}s max)"
waited=0
while [[ $waited -lt $MAX_WAIT ]]; do
  if curl -sf "${VAULT_URL}/v1/sys/health" >/dev/null 2>&1; then
    log "Vault ready (${waited}s)"
    exit 0
  fi
  sleep 3
  ((waited += 3)) || true
done

log "FAIL: Vault not ready"
exit 1
