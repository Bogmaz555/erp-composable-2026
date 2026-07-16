#!/usr/bin/env bash
# ERP 2026 — Master Orchestrator (Warstwa 9)
# Finance prod → health matrix → restart → full pipeline → regression report → Playwright
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
export PATH="${HOME}/.local/share/mise/installs/node/22/bin:${PATH:-}"
PNPM="${ROOT}/node_modules/.bin/pnpm"
LOG="${ROOT}/.agents/swarm/master-orchestrator.log"
LOOP=false
INTERVAL=300
QUICK=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --loop) LOOP=true; shift ;;
    --interval) INTERVAL="${2:-300}"; shift 2 ;;
    --quick) QUICK=true; shift ;;
    *) shift ;;
  esac
done

log() { echo "[$(date -Iseconds)] [master] $*" | tee -a "$LOG"; }
mkdir -p "$(dirname "$LOG")" "${ROOT}/.agents/swarm"

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
  local port=$1 path="/health"
  [[ "$port" == "4005" ]] && path="/api/health"
  [[ "$port" == "4010" ]] && path="/fin/health"
  [[ "$port" == "4011" ]] && path="/health"
  [[ "$port" == "4015" ]] && path="/tax-legal/health"
  [[ "$port" == "3001" ]] && path="/"
  curl -s -o /dev/null -w "%{http_code}" --max-time 4 "http://127.0.0.1:${port}${path}" 2>/dev/null || echo "000"
}

restart_port() {
  local port=$1 cmd="${SERVICES[$port]:-}"
  [[ -z "$cmd" ]] && return
  log "RESTART :${port}"
  fuser -k "${port}/tcp" 2>/dev/null || true
  sleep 1
  nohup bash -c "$cmd" >> "/tmp/erp-master-${port}.log" 2>&1 &
  sleep 5
}

run_cycle() {
  log "========== MASTER CYCLE START =========="

  bash "${ROOT}/scripts/ensure-databases.sh" proc-service pm-service finance 2>&1 | tail -5 | tee -a "$LOG" || true
  bash "${ROOT}/scripts/ensure-finance-prod.sh" start 2>&1 | tee -a "$LOG" || true

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
  log "restarts: ${restarts}"

  if ! $QUICK; then
    bash "${ROOT}/scripts/autonomous-full-pipeline.sh" 2>&1 | tail -8 | tee -a "$LOG" || true
  fi
  npx tsx "${ROOT}/scripts/master-regression-report.ts" 2>&1 | tail -15 | tee -a "$LOG" || true

  if command -v npx >/dev/null 2>&1 && [[ -d "${ROOT}/e2e" ]]; then
    PW_SKIP_SERVER=1 npx playwright test --reporter=line 2>&1 | tail -8 | tee -a "$LOG" || log "WARN playwright"
  fi

  log "========== MASTER CYCLE END =========="
}

if $LOOP; then
  log "LOOP interval=${INTERVAL}s"
  while true; do
    run_cycle || true
    sleep "$INTERVAL"
  done
else
  run_cycle
fi
