#!/usr/bin/env bash
# ERP 2026 — Ensure Keycloak + auth smoke (SKIP-safe)
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
LOG="${ROOT}/.agents/swarm/ensure-auth.log"
mkdir -p "$(dirname "$LOG")"

log() { echo "[$(date -Iseconds)] [auth] $*" | tee -a "$LOG"; }

TOKEN=""
if [[ -f "${ROOT}/scripts/ensure-keycloak-ready.sh" ]]; then
  bash "${ROOT}/scripts/ensure-keycloak-ready.sh" 2>&1 | tail -6 | tee -a "$LOG" || true
  TOKEN=$(cat "${ROOT}/.agents/swarm/last-keycloak-token.txt" 2>/dev/null || echo "")
fi

if [[ -z "$TOKEN" ]] && [[ -f "${ROOT}/scripts/get-keycloak-token.sh" ]]; then
  TOKEN=$(bash "${ROOT}/scripts/get-keycloak-token.sh" 2>/dev/null || echo "")
fi

if [[ -n "$TOKEN" ]]; then
  echo "$TOKEN" > "${ROOT}/.agents/swarm/last-keycloak-token.txt"
  log "Keycloak token OK (${#TOKEN} chars)"
  code=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer ${TOKEN}" \
    "http://127.0.0.1:4005/api/pm" 2>/dev/null || echo "000")
  log "GW /api/pm with bearer → ${code} (AUTH_ENFORCE=${AUTH_ENFORCE:-false})"
else
  log "SKIP Keycloak token (service down)"
fi

log "auth stack check complete"
