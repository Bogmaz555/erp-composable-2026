#!/usr/bin/env bash
# ERP 2026 — Wait for Keycloak ready + obtain dev token (retry)
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
KC_URL="${KEYCLOAK_URL:-http://localhost:8080}"
REALM="${KEYCLOAK_REALM:-erp}"
LOG="${ROOT}/.agents/swarm/ensure-keycloak.log"
TOKEN_FILE="${ROOT}/.agents/swarm/last-keycloak-token.txt"
MAX_WAIT="${KEYCLOAK_MAX_WAIT:-120}"

log() { echo "[$(date -Iseconds)] [keycloak] $*" | tee -a "$LOG"; }
mkdir -p "$(dirname "$LOG")"

if command -v docker >/dev/null 2>&1; then
  docker compose up -d keycloak 2>&1 | tail -3 | tee -a "$LOG" || true
fi

log "waiting for realm ${REALM} (max ${MAX_WAIT}s)"
waited=0
while [[ $waited -lt $MAX_WAIT ]]; do
  if curl -sf "${KC_URL}/realms/${REALM}/.well-known/openid-configuration" >/dev/null 2>&1; then
    log "realm ready (${waited}s)"
    break
  fi
  sleep 3
  ((waited += 3)) || true
done

if [[ $waited -ge $MAX_WAIT ]]; then
  log "FAIL: Keycloak not ready"
  exit 1
fi

bash "${ROOT}/scripts/fix-keycloak-demo-users.sh" 2>&1 | tee -a "$LOG" || true

TOKEN=""
for attempt in 1 2 3 4 5; do
  TOKEN=$(bash "${ROOT}/scripts/get-keycloak-token.sh" 2>/dev/null || echo "")
  if [[ -n "$TOKEN" ]]; then
    echo "$TOKEN" > "$TOKEN_FILE"
    log "token OK attempt=${attempt} (${#TOKEN} chars)"
    exit 0
  fi
  log "token retry ${attempt}/5"
  sleep 4
done

log "FAIL: could not obtain token"
exit 1
