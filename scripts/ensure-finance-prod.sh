#!/usr/bin/env bash
# ERP 2026 — Ensure Finance runs in production mode (dist/main.js on :4010)
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
FIN_DIR="${ROOT}/apps/finance"
DIST="${FIN_DIR}/dist/main.js"
LOG="/tmp/erp-finance-prod.log"

log() { echo "[$(date -Iseconds)] [finance-prod] $*"; }

build_if_needed() {
  if [[ ! -f "$DIST" ]] || [[ "${FORCE_BUILD:-}" == "1" ]]; then
    log "building finance (tsc)..."
    if [[ ! -f "$DIST" ]]; then
      rm -f "${FIN_DIR}/tsconfig.build.tsbuildinfo"
    fi
    (cd "$FIN_DIR" && npx tsc -p tsconfig.build.json)
  fi
}

wait_health() {
  local tries="${1:-20}"
  for ((i=1; i<=tries; i++)); do
    code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 "http://127.0.0.1:4010/fin/health" 2>/dev/null || echo "000")
    if [[ "$code" =~ ^[23] ]]; then
      log "health OK (${code}) after ${i} attempt(s)"
      return 0
    fi
    sleep 1
  done
  log "WARN health not ready after ${tries}s (last=${code})"
  return 1
}

start_prod() {
  build_if_needed
  if [[ ! -f "$DIST" ]]; then
    log "ERROR dist missing after build"
    return 1
  fi
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 2 "http://127.0.0.1:4010/fin/health" 2>/dev/null || echo "000")
  if [[ "${FORCE_RESTART:-}" != "1" && "$code" =~ ^[23] ]]; then
    log "already running (${code})"
    return 0
  fi
  log "starting node dist/main.js on :4010"
  fuser -k 4010/tcp 2>/dev/null || true
  sleep 1
  nohup node "$DIST" >> "$LOG" 2>&1 &
  wait_health 25 || true
}

case "${1:-start}" in
  build) build_if_needed ;;
  health) wait_health "${2:-15}" ;;
  start) start_prod ;;
  restart) FORCE_BUILD=1 FORCE_RESTART=1 start_prod ;;
  *) echo "usage: $0 [start|build|health|restart]"; exit 1 ;;
esac
