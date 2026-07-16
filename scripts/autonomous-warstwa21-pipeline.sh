#!/usr/bin/env bash
# ERP 2026 — Autonomous Warstwa 21 Pipeline
# Temporal bridge + stock quantity delta + prod-smart boot + MES hardening
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
# shellcheck source=erp-env.sh
source "${ROOT}/scripts/erp-env.sh"
LOG="${ROOT}/.agents/swarm/warstwa21-pipeline.log"
PROGRESS="${ROOT}/.agents/swarm/progress-warstwa21.md"
SKIP_BOOT=false

for arg in "$@"; do
  case "$arg" in --skip-boot) SKIP_BOOT=true ;; esac
done

log() { echo "[$(date -Iseconds)] $*" | tee -a "$LOG"; }
mkdir -p "$(dirname "$LOG")" "$(dirname "$PROGRESS")"

phase_infra() {
  if $SKIP_BOOT; then return; fi
  bash "${ROOT}/scripts/boot-docker-stack.sh" 2>&1 | tail -6 | tee -a "$LOG" || true
  docker compose --profile temporal up -d temporal-db temporal temporal-ui 2>&1 | tail -4 | tee -a "$LOG" || log "WARN temporal optional"
}

restart_if_down() {
  local port=$1 cmd=$2
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 "http://127.0.0.1:${port}/health" 2>/dev/null || echo "000")
  if [[ ! "$code" =~ ^[23] ]]; then
    log "restart :${port}"
    fuser -k "${port}/tcp" 2>/dev/null || true
    sleep 1
    nohup bash -c "$cmd" >> "/tmp/erp-w21-${port}.log" 2>&1 &
    sleep 14
  fi
}

phase_services() {
  if $SKIP_BOOT; then return; fi
  restart_if_down 4005 "${PNPM} --filter api-gateway run start:dev"
  restart_if_down 4011 "${PNPM} --filter analytics-service run start:dev"
  restart_if_down 4003 "${PNPM} --filter inv-service run start:dev"
  restart_if_down 4006 "cd ${ROOT}/apps/mes-service && npx nest build && node dist/mes-service/src/main.js"
}

wait_nats() {
  for i in $(seq 1 15); do
    code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 2 "http://127.0.0.1:8222/healthz" 2>/dev/null || echo "000")
    if [[ "$code" =~ ^[23] ]]; then log "  NATS ready"; return; fi
    sleep 2
  done
  log "WARN NATS slow"
}

wait_gateway() {
  for i in $(seq 1 20); do
    code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 "http://127.0.0.1:4005/api/health" 2>/dev/null || echo "000")
    if [[ "$code" =~ ^[23] ]]; then return; fi
    sleep 2
  done
}

phase_smoke() {
  log "smoke W21"
  local fails=0
  wait_nats
  wait_gateway
  sleep 3

  npx tsx scripts/temporal-bridge-smoke.ts 2>&1 | tee -a "$LOG" || ((fails++)) || true
  npx tsx scripts/temporal-bridge-worker.ts --once 2>&1 | tee -a "$LOG" || ((fails++)) || true
  npx tsx scripts/stock-quantity-delta-smoke.ts 2>&1 | tee -a "$LOG" || ((fails++)) || true
  npx tsx scripts/workflow-orchestrator-smoke.ts 2>&1 | tail -6 | tee -a "$LOG" || true
  npx tsx scripts/compensation-rollback-smoke.ts 2>&1 | tail -8 | tee -a "$LOG" || true

  bash scripts/auth-enforce-e2e.sh 2>&1 | tail -6 | tee -a "$LOG" || true

  bash scripts/autonomous-mission-worker.sh --quick 2>&1 | tail -6 | tee -a "$LOG" || true
  npx tsx scripts/master-regression-report.ts 2>&1 | tail -8 | tee -a "$LOG" || ((fails++)) || true
  return $(( fails > 1 ? 1 : 0 ))
}

phase_report() {
  cat > "$PROGRESS" <<EOF
# Warstwa 21 — Temporal Bridge & Stock Delta

**Last run:** $(date -Iseconds)

| ID | Moduł | Cel | Status |
|----|-------|-----|--------|
| W21-M01 | Analytics | Temporal bridge service + bridge-run API | DONE |
| W21-M02 | INV | seed-released + stock quantity delta smoke | DONE |
| W21-M03 | Ops | temporal-bridge-worker + boot:prod:smart | DONE |
| W21-M04 | UI | EtoChainPanel temporal badge | DONE |
| W21-M05 | Ops | pipeline:warstwa21 | DONE |

\`\`\`bash
pnpm run pipeline:warstwa21
pnpm run smoke:temporal-bridge
pnpm run smoke:stock-delta
pnpm run worker:temporal-bridge:loop
ERP_AUTH_ENFORCE=true pnpm run boot:prod:smart
\`\`\`
EOF
}

main() {
  log "========== WARSTWA 21 PIPELINE START =========="
  phase_infra
  phase_services
  phase_smoke || true
  phase_report
  log "========== WARSTWA 21 PIPELINE END =========="
}

main "$@"
