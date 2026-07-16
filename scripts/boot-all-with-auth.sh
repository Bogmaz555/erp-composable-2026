#!/usr/bin/env bash
# ERP 2026 — boot:all z AUTH_ENFORCE=true na gateway (profil produkcyjny dev)
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
export PATH="${HOME}/.local/share/mise/installs/node/22/bin:${PATH:-}"
PNPM="${ROOT}/node_modules/.bin/pnpm"
LOG="${ROOT}/.agents/swarm/boot-all-auth.log"

log() { echo "[$(date -Iseconds)] [boot-auth] $*" | tee -a "$LOG"; }
mkdir -p "$(dirname "$LOG")"

log "preboot: docker + db + keycloak"
bash "${ROOT}/scripts/boot-docker-stack.sh" 2>&1 | tail -6 | tee -a "$LOG" || true
bash "${ROOT}/scripts/ensure-databases.sh" proc-service pm-service finance inv-service analytics-service 2>&1 | tail -4 | tee -a "$LOG" || true
bash "${ROOT}/scripts/ensure-keycloak-ready.sh" 2>&1 | tail -4 | tee -a "$LOG" || true
bash "${ROOT}/scripts/ensure-finance-prod.sh" build 2>&1 | tail -3 | tee -a "$LOG" || true

export AUTH_ENFORCE=true
export USE_KEYCLOAK_JWKS=true
export KEYCLOAK_JWKS_URI=http://localhost:8080/realms/erp/protocol/openid-connect/certs
export ERP_AUTH_ENFORCE=true

log "starting boot:all:auth (gateway z AUTH_ENFORCE=true)"
exec "${PNPM}" run boot:all:auth
