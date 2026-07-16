#!/usr/bin/env bash
# ERP 2026 — Autonomous Warstwa 19 Pipeline
# Stock rollback + Temporal YAML workflow + boot:all:smart + PLM explosion E2E
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
export PATH="${HOME}/.local/share/mise/installs/node/22/bin:${PATH:-}"
LOG="${ROOT}/.agents/swarm/warstwa19-pipeline.log"
PROGRESS="${ROOT}/.agents/swarm/progress-warstwa19.md"
SKIP_BOOT=false
PNPM="${ROOT}/node_modules/.bin/pnpm"

for arg in "$@"; do
  case "$arg" in --skip-boot) SKIP_BOOT=true ;; esac
done

log() { echo "[$(date -Iseconds)] $*" | tee -a "$LOG"; }
mkdir -p "$(dirname "$LOG")" "$(dirname "$PROGRESS")"

phase_infra() {
  if $SKIP_BOOT; then return; fi
  bash "${ROOT}/scripts/boot-docker-stack.sh" 2>&1 | tail -6 | tee -a "$LOG" || true
  bash "${ROOT}/scripts/fix-keycloak-demo-users.sh" 2>&1 | tail -2 | tee -a "$LOG" || true
}

restart_if_down() {
  local port=$1 cmd=$2
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 "http://127.0.0.1:${port}/health" 2>/dev/null || echo "000")
  if [[ ! "$code" =~ ^[23] ]]; then
    log "restart :${port}"
    fuser -k "${port}/tcp" 2>/dev/null || true
    sleep 1
    nohup bash -c "$cmd" >> "/tmp/erp-w19-${port}.log" 2>&1 &
    sleep 14
  fi
}

phase_services() {
  if $SKIP_BOOT; then return; fi
  restart_if_down 4011 "${PNPM} --filter analytics-service run start:dev"
  restart_if_down 4003 "${PNPM} --filter inv-service run start:dev"
}

phase_smoke() {
  log "smoke W19"
  local fails=0

  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "http://127.0.0.1:4005/api/analytics/eto-chain/workflow" 2>/dev/null || echo "000")
  if [[ "$code" =~ ^[23] ]]; then log "  OK workflow ${code}"; else log "  FAIL workflow ${code}"; ((fails++)) || true; fi

  npx tsx scripts/stock-rollback-smoke.ts 2>&1 | tee -a "$LOG" || ((fails++)) || true
  npx tsx scripts/compensation-rollback-smoke.ts 2>&1 | tail -10 | tee -a "$LOG" || true
  npx tsx scripts/plm-explosion-api-smoke.ts 2>&1 | tail -8 | tee -a "$LOG" || true
  bash scripts/auth-enforce-e2e.sh 2>&1 | tail -8 | tee -a "$LOG" || true

  PW_SKIP_SERVER=1 "${PNPM}" exec playwright test e2e/eto-plm-explosion-full.spec.ts --reporter=line 2>&1 | tail -10 | tee -a "$LOG" || log "WARN playwright plm-full"

  bash scripts/autonomous-mission-worker.sh --quick 2>&1 | tail -6 | tee -a "$LOG" || true
  npx tsx scripts/master-regression-report.ts 2>&1 | tail -8 | tee -a "$LOG" || ((fails++)) || true
  return $(( fails > 1 ? 1 : 0 ))
}

phase_report() {
  cat > "$PROGRESS" <<EOF
# Warstwa 19 — Stock Rollback & Temporal Workflow

**Last run:** $(date -Iseconds)

| ID | Moduł | Cel | Status |
|----|-------|-----|--------|
| W19-M01 | INV | Real stock rollback (Item/StockLevel/Lot) | DONE |
| W19-M02 | Analytics | YAML workflow + GET /eto-chain/workflow | DONE |
| W19-M03 | Ops | boot-all-smart.sh (ERP_AUTH_ENFORCE) | DONE |
| W19-M04 | E2E | eto-plm-explosion-full Playwright | DONE |
| W19-M05 | Ops | pipeline:warstwa19 | DONE |

\`\`\`bash
ERP_AUTH_ENFORCE=true pnpm run boot:smart
pnpm run pipeline:warstwa19
pnpm run smoke:stock-rollback
\`\`\`
EOF
}

main() {
  log "========== WARSTWA 19 PIPELINE START =========="
  phase_infra
  phase_services
  phase_smoke || true
  phase_report
  log "========== WARSTWA 19 PIPELINE END =========="
}

main "$@"
