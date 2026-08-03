#!/usr/bin/env bash
# ERP 2026 — AUTH_ENFORCE=true end-to-end smoke (Keycloak + gateway restart)
# SKIP-safe when Keycloak unavailable.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
export PATH="${HOME}/.local/share/mise/installs/node/22/bin:${PATH:-}"
LOG="${ROOT}/.agents/swarm/auth-enforce-e2e.log"
GW_PORT=4005
# Capture intent to restore AFTER we clear CI-exported AUTH_ENFORCE for cold boots
RESTORE_ENFORCE="${AUTH_ENFORCE:-false}"
GW_LOG=/tmp/erp-gw-auth-e2e.log

log() { echo "[$(date -Iseconds)] [auth-e2e] $*" | tee -a "$LOG"; }
mkdir -p "$(dirname "$LOG")"
: >"$LOG"

wait_http() {
  local url="$1" expect_re="${2:-^[23]}" tries="${3:-40}" label="${4:-http}"
  local code
  for i in $(seq 1 "$tries"); do
    code=$(curl -sS -o /dev/null -w "%{http_code}" --max-time 3 "$url" 2>/dev/null || echo 000)
    if [[ "$code" =~ $expect_re ]]; then
      log "wait ${label}: ${code} (try ${i})"
      echo "$code"
      return 0
    fi
    sleep 2
  done
  log "wait ${label}: last=${code:-000} after ${tries} tries"
  echo "${code:-000}"
  return 1
}

start_gateway_auth() {
  fuser -k "${GW_PORT}/tcp" 2>/dev/null || true
  sleep 2
  : >"$GW_LOG"
  # Explicit env — avoid ENTERPRISE hard-claim failures in CI without JWT_AUDIENCE
  nohup env \
    HOST=0.0.0.0 \
    PORT="${GW_PORT}" \
    AUTH_ENFORCE=true \
    USE_KEYCLOAK_JWKS=true \
    KEYCLOAK_JWKS_URI="${KEYCLOAK_JWKS_URI:-http://127.0.0.1:8080/realms/erp/protocol/openid-connect/certs}" \
    KEYCLOAK_ISSUER="${KEYCLOAK_ISSUER:-http://127.0.0.1:8080/realms/erp}" \
    JWT_ISSUER_EXTRA="${JWT_ISSUER_EXTRA:-http://localhost:8080/realms/erp}" \
    DEFAULT_TENANT_ID="${DEFAULT_TENANT_ID:-default}" \
    MEILI_MASTER_KEY="${MEILI_MASTER_KEY:-pilot-dev-meili-key-not-for-prod}" \
    NATS_URL="${NATS_URL:-nats://127.0.0.1:4222}" \
    PM_SERVICE_URL="${PM_SERVICE_URL:-http://127.0.0.1:4002}" \
    ANALYTICS_SERVICE_URL="${ANALYTICS_SERVICE_URL:-http://127.0.0.1:4011}" \
    bash -c "cd '${ROOT}/apps/api-gateway' && npm run start:dev" \
    >>"$GW_LOG" 2>&1 &
  echo $! > /tmp/erp-gw-auth-e2e.pid
}

log "phase 1: keycloak ready"
if ! bash "${ROOT}/scripts/ensure-keycloak-ready.sh" 2>&1 | tee -a "$LOG"; then
  log "SKIP: Keycloak not ready"
  exit 0
fi
TOKEN=$(cat "${ROOT}/.agents/swarm/last-keycloak-token.txt" 2>/dev/null || echo "")
if [[ -z "$TOKEN" ]]; then
  log "SKIP: no Keycloak token"
  exit 0
fi
log "token OK (${#TOKEN} chars)"

log "phase 2: restart gateway AUTH_ENFORCE=true + JWKS"
start_gateway_auth

# Nest watch compile can exceed 18s on cold CI runners
if ! wait_http "http://127.0.0.1:${GW_PORT}/api/health" '200' 45 "gateway-health" >/dev/null; then
  log "gateway failed to become healthy — last log:"
  tail -60 "$GW_LOG" 2>/dev/null | tee -a "$LOG" || true
  log "FAIL: gateway not up (connection refused / timeout)"
  exit 1
fi

fails=0

code_noauth=$(curl -sS -o /dev/null -w "%{http_code}" --max-time 8 \
  "http://127.0.0.1:${GW_PORT}/api/pm" 2>/dev/null || echo "000")
if [[ "$code_noauth" == "401" ]]; then
  log "✓ /api/pm without token → 401"
else
  log "✗ /api/pm without token → ${code_noauth} (expected 401)"
  ((fails++)) || true
fi

code_auth=$(curl -sS -o /dev/null -w "%{http_code}" --max-time 8 \
  -H "Authorization: Bearer ${TOKEN}" \
  "http://127.0.0.1:${GW_PORT}/api/pm" 2>/dev/null || echo "000")
# 2xx/3xx/404/502 acceptable: auth accepted, upstream may be partial
if [[ "$code_auth" =~ ^(2|3|404|502) ]]; then
  log "✓ /api/pm with bearer → ${code_auth}"
else
  log "✗ /api/pm with bearer → ${code_auth}"
  ((fails++)) || true
fi

# Truly public path (see PUBLIC_PATH_PREFIXES in api-gateway main.ts)
code_public=$(curl -sS -o /dev/null -w "%{http_code}" --max-time 8 \
  "http://127.0.0.1:${GW_PORT}/api/health" 2>/dev/null || echo "000")
if [[ "$code_public" =~ ^[23] ]]; then
  log "✓ public /api/health → ${code_public}"
else
  log "✗ public /api/health → ${code_public}"
  ((fails++)) || true
fi

log "phase 3: restore gateway AUTH_ENFORCE=${RESTORE_ENFORCE}"
fuser -k "${GW_PORT}/tcp" 2>/dev/null || true
sleep 1
if [[ "$RESTORE_ENFORCE" == "true" ]]; then
  nohup env HOST=0.0.0.0 AUTH_ENFORCE=true USE_KEYCLOAK_JWKS=true \
    KEYCLOAK_JWKS_URI=http://127.0.0.1:8080/realms/erp/protocol/openid-connect/certs \
    KEYCLOAK_ISSUER=http://127.0.0.1:8080/realms/erp \
    JWT_ISSUER_EXTRA=http://localhost:8080/realms/erp \
    MEILI_MASTER_KEY="${MEILI_MASTER_KEY:-pilot-dev-meili-key-not-for-prod}" \
    bash -c "cd '${ROOT}/apps/api-gateway' && npm run start:dev" \
    >>/tmp/erp-gw-restore.log 2>&1 &
else
  nohup env HOST=0.0.0.0 AUTH_ENFORCE=false \
    MEILI_MASTER_KEY="${MEILI_MASTER_KEY:-pilot-dev-meili-key-not-for-prod}" \
    bash -c "cd '${ROOT}/apps/api-gateway' && npm run start:dev" \
    >>/tmp/erp-gw-restore.log 2>&1 &
fi
# best-effort restore wait (non-fatal)
wait_http "http://127.0.0.1:${GW_PORT}/api/health" '^[23]' 20 "gateway-restore" >/dev/null || true

log "auth-enforce e2e complete (fails=${fails})"
if [[ "$fails" -gt 0 ]]; then
  exit 1
fi
exit 0
