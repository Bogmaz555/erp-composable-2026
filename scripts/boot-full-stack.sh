#!/usr/bin/env bash
# ERP 2026 — Boot pełny stack: Docker infra + DB sync + finance prod + health gate
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
PNPM="${ROOT}/node_modules/.bin/pnpm"
LOG="${ROOT}/.agents/swarm/boot-full-stack.log"
mkdir -p "$(dirname "$LOG")"

log() { echo "[$(date -Iseconds)] [full-stack] $*" | tee -a "$LOG"; }

log "phase 1: docker infrastructure"
bash "${ROOT}/scripts/boot-docker-stack.sh" 2>&1 | tee -a "$LOG"

log "phase 2: keycloak + auth stack"
bash "${ROOT}/scripts/ensure-keycloak-ready.sh" 2>&1 | tee -a "$LOG" || bash "${ROOT}/scripts/ensure-auth-stack.sh" 2>&1 | tee -a "$LOG" || true

log "phase 3: finance prod"
bash "${ROOT}/scripts/ensure-finance-prod.sh" start 2>&1 | tee -a "$LOG" || true

PORTS=(4005 4001 4002 4003 4004 4006 4007 4010 4011 4015)
NAMES=(gateway crm pm inv proc mes plm fin analytics tax)

log "phase 4: start services (background)"
for i in "${!PORTS[@]}"; do
  port="${PORTS[$i]}"
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 2 "http://127.0.0.1:${port}/" 2>/dev/null || echo "000")
  if [[ ! "$code" =~ ^[23] ]]; then
    log "hint: start ${NAMES[$i]} on :${port} via pnpm run boot:all"
  else
    log "OK :${port} (${NAMES[$i]})"
  fi
done

log "full-stack bootstrap complete — run: pnpm run boot:all"
