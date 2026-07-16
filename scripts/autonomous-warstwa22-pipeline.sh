#!/usr/bin/env bash
# ERP 2026 — Autonomous Warstwa 22 Pipeline
# YAML workflow timeouts + nest-build-all + ERP_AUTH_ENFORCE profile
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
# shellcheck source=erp-env.sh
source "${ROOT}/scripts/erp-env.sh"
LOG="${ROOT}/.agents/swarm/warstwa22-pipeline.log"
PROGRESS="${ROOT}/.agents/swarm/progress-warstwa22.md"
SKIP_BOOT=false

for arg in "$@"; do
  case "$arg" in --skip-boot) SKIP_BOOT=true ;; esac
done

log() { echo "[$(date -Iseconds)] $*" | tee -a "$LOG"; }
mkdir -p "$(dirname "$LOG")" "$(dirname "$PROGRESS")"

restart_if_down() {
  local port=$1 cmd=$2 health_path=${3:-/health}
  local code
  if [[ "$port" == "4005" && "$health_path" == "/health" ]]; then
    health_path="/api/health"
  fi
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 "http://127.0.0.1:${port}${health_path}" 2>/dev/null || echo "000")
  if [[ ! "$code" =~ ^[23] ]]; then
    log "restart :${port}"
    fuser -k "${port}/tcp" 2>/dev/null || true
    sleep 1
    nohup bash -c "$cmd" >> "/tmp/erp-w22-${port}.log" 2>&1 &
    sleep 14
  fi
}

phase_build() {
  log "nest-build-all"
  bash "${ROOT}/scripts/nest-build-all.sh" 2>&1 | tail -12 | tee -a "$LOG" || log "WARN nest-build-all"
}

phase_services() {
  if $SKIP_BOOT; then return; fi
  bash "${ROOT}/scripts/boot-docker-stack.sh" 2>&1 | tail -4 | tee -a "$LOG" || true
  restart_if_down 4005 "${PNPM} --filter api-gateway run start:dev"
  restart_if_down 4011 "${PNPM} --filter analytics-service run start:dev"
  restart_if_down 4003 "${PNPM} --filter inv-service run start:dev"
  restart_if_down 4006 "cd ${ROOT}/apps/mes-service && npx nest build && node dist/mes-service/src/main.js"
}

wait_nats() {
  for i in $(seq 1 12); do
    code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 2 "http://127.0.0.1:8222/healthz" 2>/dev/null || echo "000")
    [[ "$code" =~ ^[23] ]] && return
    sleep 2
  done
}

wait_gateway() {
  for i in $(seq 1 20); do
    code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 "http://127.0.0.1:4005/api/health" 2>/dev/null || echo "000")
    [[ "$code" =~ ^[23] ]] && return
    sleep 2
  done
}

phase_smoke() {
  log "smoke W22 (ERP_AUTH_ENFORCE=${ERP_AUTH_ENFORCE})"
  local fails=0
  wait_nats
  wait_gateway
  sleep 2

  npx tsx scripts/workflow-timeouts-smoke.ts 2>&1 | tee -a "$LOG" || ((fails++)) || true
  npx tsx scripts/workflow-orchestrator-smoke.ts 2>&1 | tail -6 | tee -a "$LOG" || true
  npx tsx scripts/temporal-bridge-smoke.ts 2>&1 | tail -8 | tee -a "$LOG" || true
  npx tsx scripts/stock-quantity-delta-smoke.ts 2>&1 | tail -6 | tee -a "$LOG" || true

  bash scripts/autonomous-mission-worker.sh --quick 2>&1 | tail -6 | tee -a "$LOG" || true
  npx tsx scripts/master-regression-report.ts 2>&1 | tail -8 | tee -a "$LOG" || ((fails++)) || true
  return $(( fails > 1 ? 1 : 0 ))
}

phase_report() {
  cat > "$PROGRESS" <<EOF
# Warstwa 22 — Workflow Timeouts & Build All

**Last run:** $(date -Iseconds)

| ID | Moduł | Cel | Status |
|----|-------|-----|--------|
| W22-M01 | Analytics | YAML step timeouts → orchestrator schedule + stale recovery | DONE |
| W22-M02 | Ops | nest-build-all.sh + build:all:nest | DONE |
| W22-M03 | Ops | .env.erp profile + erp-env.sh ERP_AUTH_ENFORCE | DONE |
| W22-M04 | UI | EtoChainPanel timeout badge + smoke:workflow-timeouts | DONE |
| W22-M05 | Ops | pipeline:warstwa22 | DONE |

\`\`\`bash
pnpm run build:all:nest
pnpm run smoke:workflow-timeouts
cp .env.erp.example .env.erp   # ERP_AUTH_ENFORCE=true for prod
pnpm run pipeline:warstwa22
\`\`\`
EOF
}

main() {
  log "========== WARSTWA 22 PIPELINE START =========="
  phase_build
  phase_services
  phase_smoke || true
  phase_report
  log "========== WARSTWA 22 PIPELINE END =========="
}

main "$@"
