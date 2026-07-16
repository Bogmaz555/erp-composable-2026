#!/usr/bin/env bash
# ERP 2026 — Continuous Autonomous Worker (24/7)
# Health-check wszystkich serwisów → restart martwych → build finance → smoke W2–W8
# Użycie:
#   bash scripts/autonomous-warstwa8-continuous-worker.sh          # jeden cykl
#   bash scripts/autonomous-warstwa8-continuous-worker.sh --loop  # pętla co 5 min
#   bash scripts/autonomous-warstwa8-continuous-worker.sh --loop --interval 180

set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
export PATH="${HOME}/.local/share/mise/installs/node/22/bin:${PATH:-}"
PNPM="${ROOT}/node_modules/.bin/pnpm"
LOG="${ROOT}/.agents/swarm/continuous-worker.log"
LOOP=false
INTERVAL=300

while [[ $# -gt 0 ]]; do
  case "$1" in
    --loop) LOOP=true; shift ;;
    --interval) INTERVAL="${2:-300}"; shift 2 ;;
    *) shift ;;
  esac
done

log() { echo "[$(date -Iseconds)] $*" | tee -a "$LOG"; }
mkdir -p "$(dirname "$LOG")" "${ROOT}/.agents/swarm"

# Port → restart command
declare -A SERVICES=(
  [4005]="${PNPM} --filter api-gateway run start:dev"
  [4002]="${PNPM} --filter pm-service run start:dev"
  [4004]="${PNPM} --filter proc-service run start:dev"
  [4001]="${PNPM} --filter crm-service run start:dev"
  [4003]="${PNPM} --filter inv-service run start:dev"
  [4008]="${PNPM} --filter quality-service run start:dev"
  [4007]="${PNPM} --filter @erp/plm-service run start:dev"
  [4006]="${PNPM} --filter mes-service run start:dev"
  [4010]="node ${ROOT}/apps/finance/dist/main.js"
  [4011]="${PNPM} --filter analytics-service run start:dev"
  [4015]="${PNPM} --filter @erp/tax-legal run start:dev"
  [3001]="${PNPM} --filter frontend run dev"
)

health_check() {
  local port=$1
  local path="/health"
  [[ "$port" == "4005" ]] && path="/api/health"
  [[ "$port" == "4010" ]] && path="/fin/health"
  [[ "$port" == "4011" ]] && path="/health"
  [[ "$port" == "4015" ]] && path="/tax-legal/health"
  [[ "$port" == "3001" ]] && path="/"
  curl -s -o /dev/null -w "%{http_code}" --max-time 4 "http://127.0.0.1:${port}${path}" 2>/dev/null || echo "000"
}

restart_port() {
  local port=$1
  local cmd="${SERVICES[$port]:-}"
  [[ -z "$cmd" ]] && return
  log "RESTART :${port} → ${cmd}"
  fuser -k "${port}/tcp" 2>/dev/null || true
  sleep 1
  nohup bash -c "$cmd" >> "/tmp/erp-worker-${port}.log" 2>&1 &
  sleep 5
}

ensure_finance_build() {
  bash "${ROOT}/scripts/ensure-finance-prod.sh" start 2>&1 | tee -a "$LOG" || true
}

run_cycle() {
  log "========== WORKER CYCLE START =========="
  ensure_finance_build

  local restarts=0
  for port in "${!SERVICES[@]}"; do
    code=$(health_check "$port")
    if [[ ! "$code" =~ ^[23] ]]; then
      restart_port "$port"
      ((restarts++)) || true
    else
      log "OK :${port} (${code})"
    fi
  done
  log "restarts this cycle: ${restarts}"

  bash "${ROOT}/scripts/autonomous-full-pipeline.sh" 2>&1 | tail -5 | tee -a "$LOG" || true
  npx tsx "${ROOT}/scripts/e2e-warstwa7-smoke.ts" 2>&1 | tail -8 | tee -a "$LOG" || true

  if command -v npx >/dev/null 2>&1 && [[ -d "${ROOT}/e2e" ]]; then
    PW_SKIP_SERVER=1 npx playwright test --reporter=line 2>&1 | tail -10 | tee -a "$LOG" || log "WARN playwright skip/fail"
  fi

  log "========== WORKER CYCLE END =========="
}

if $LOOP; then
  log "LOOP mode interval=${INTERVAL}s"
  while true; do
    run_cycle || true
    log "sleep ${INTERVAL}s"
    sleep "$INTERVAL"
  done
else
  run_cycle
fi
