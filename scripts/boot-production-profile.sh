#!/usr/bin/env bash
# ERP 2026 — Production auth profile: Keycloak + AUTH_ENFORCE gateway
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
export PATH="${HOME}/.local/share/mise/installs/node/22/bin:${PATH:-}"
PNPM="${ROOT}/node_modules/.bin/pnpm"
LOG="${ROOT}/.agents/swarm/boot-production-profile.log"
GW_PORT=4005

log() { echo "[$(date -Iseconds)] [prod-profile] $*" | tee -a "$LOG"; }
mkdir -p "$(dirname "$LOG")"

log "phase 1: full stack infra"
bash "${ROOT}/scripts/boot-full-stack.sh" 2>&1 | tail -10 | tee -a "$LOG"

log "phase 2: keycloak ready"
bash "${ROOT}/scripts/ensure-keycloak-ready.sh" 2>&1 | tee -a "$LOG"

log "phase 3: gateway AUTH_ENFORCE=true"
fuser -k "${GW_PORT}/tcp" 2>/dev/null || true
sleep 1
AUTH_ENFORCE=true USE_KEYCLOAK_JWKS=true \
  KEYCLOAK_JWKS_URI=http://localhost:8080/realms/erp/protocol/openid-connect/certs \
  nohup bash -c "${PNPM} --filter api-gateway run start:dev" >> /tmp/erp-gw-prod-profile.log 2>&1 &

for i in $(seq 1 25); do
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 "http://127.0.0.1:${GW_PORT}/api/health" 2>/dev/null || echo "000")
  if [[ "$code" =~ ^[23] ]]; then
    log "gateway ready (${code}) AUTH_ENFORCE=true"
    exit 0
  fi
  sleep 2
done

log "WARN: gateway slow start — check /tmp/erp-gw-prod-profile.log"
exit 0
