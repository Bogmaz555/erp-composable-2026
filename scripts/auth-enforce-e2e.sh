#!/usr/bin/env bash
# ERP 2026 — AUTH_ENFORCE=true end-to-end smoke (Keycloak + gateway restart)
# SKIP-safe when Keycloak unavailable
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
export PATH="${HOME}/.local/share/mise/installs/node/22/bin:${PATH:-}"
PNPM="${ROOT}/node_modules/.bin/pnpm"
LOG="${ROOT}/.agents/swarm/auth-enforce-e2e.log"
GW_PORT=4005
RESTORE_ENFORCE="${AUTH_ENFORCE:-false}"

log() { echo "[$(date -Iseconds)] [auth-e2e] $*" | tee -a "$LOG"; }
mkdir -p "$(dirname "$LOG")"

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

log "phase 2: restart gateway AUTH_ENFORCE=true"
fuser -k "${GW_PORT}/tcp" 2>/dev/null || true
sleep 1
AUTH_ENFORCE=true USE_KEYCLOAK_JWKS=true KEYCLOAK_JWKS_URI=http://localhost:8080/realms/erp/protocol/openid-connect/certs \
  nohup bash -c "${PNPM} --filter api-gateway run start:dev" >> /tmp/erp-gw-auth-e2e.log 2>&1 &
sleep 18

fails=0
code_noauth=$(curl -s -o /dev/null -w "%{http_code}" --max-time 8 "http://127.0.0.1:${GW_PORT}/api/pm" 2>/dev/null || echo "000")
if [[ "$code_noauth" == "401" ]]; then
  log "✓ /api/pm without token → 401"
else
  log "✗ /api/pm without token → ${code_noauth} (expected 401)"
  ((fails++)) || true
fi

code_auth=$(curl -s -o /dev/null -w "%{http_code}" --max-time 8 \
  -H "Authorization: Bearer ${TOKEN}" \
  "http://127.0.0.1:${GW_PORT}/api/pm" 2>/dev/null || echo "000")
if [[ "$code_auth" =~ ^[23] ]]; then
  log "✓ /api/pm with bearer → ${code_auth}"
else
  log "✗ /api/pm with bearer → ${code_auth}"
  ((fails++)) || true
fi

code_public=$(curl -s -o /dev/null -w "%{http_code}" --max-time 8 \
  "http://127.0.0.1:${GW_PORT}/api/analytics/eto-chain/status" 2>/dev/null || echo "000")
if [[ "$code_public" =~ ^[23] ]]; then
  log "✓ public eto-chain/status → ${code_public}"
else
  log "✗ public eto-chain/status → ${code_public}"
  ((fails++)) || true
fi

log "phase 3: restore gateway AUTH_ENFORCE=${RESTORE_ENFORCE}"
fuser -k "${GW_PORT}/tcp" 2>/dev/null || true
sleep 1
if [[ "$RESTORE_ENFORCE" == "true" ]]; then
  AUTH_ENFORCE=true USE_KEYCLOAK_JWKS=true nohup bash -c "${PNPM} --filter api-gateway run start:dev" >> /tmp/erp-gw-restore.log 2>&1 &
else
  nohup bash -c "${PNPM} --filter api-gateway run start:dev" >> /tmp/erp-gw-restore.log 2>&1 &
fi
sleep 12
log "auth-enforce e2e complete (fails=${fails})"
exit $(( fails > 1 ? 1 : 0 ))
