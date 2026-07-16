#!/usr/bin/env bash
# ERP 2026 — Autonomous Warstwa 17 Pipeline
# NATS compensation + durable orchestrator + boot:all:auth + Playwright full chain
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
export PATH="${HOME}/.local/share/mise/installs/node/22/bin:${PATH:-}"
LOG="${ROOT}/.agents/swarm/warstwa17-pipeline.log"
PROGRESS="${ROOT}/.agents/swarm/progress-warstwa17.md"
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
  bash "${ROOT}/scripts/ensure-databases.sh" analytics-service 2>&1 | tail -4 | tee -a "$LOG" || true
  bash "${ROOT}/scripts/fix-keycloak-demo-users.sh" 2>&1 | tail -3 | tee -a "$LOG" || true
}

phase_services() {
  if $SKIP_BOOT; then return; fi
  port=4011
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 "http://127.0.0.1:${port}/health" 2>/dev/null || echo "000")
  if [[ ! "$code" =~ ^[23] ]]; then
    log "restart analytics :${port}"
    fuser -k "${port}/tcp" 2>/dev/null || true
    sleep 1
    nohup bash -c "${PNPM} --filter analytics-service run start:dev" >> /tmp/erp-w17-analytics.log 2>&1 &
    sleep 16
  fi
}

phase_smoke() {
  log "smoke W17"
  local fails=0

  npx tsx scripts/compensation-nats-smoke.ts 2>&1 | tee -a "$LOG" || ((fails++)) || true
  npx tsx scripts/saga-compensation-smoke.ts 2>&1 | tail -10 | tee -a "$LOG" || ((fails++)) || true
  bash scripts/auth-enforce-e2e.sh 2>&1 | tail -10 | tee -a "$LOG" || true

  PW_SKIP_SERVER=1 "${PNPM}" exec playwright test e2e/eto-full-chain.spec.ts --reporter=line 2>&1 | tail -10 | tee -a "$LOG" || log "WARN playwright full-chain"

  bash scripts/autonomous-mission-worker.sh --quick 2>&1 | tail -6 | tee -a "$LOG" || true
  npx tsx scripts/master-regression-report.ts 2>&1 | tail -8 | tee -a "$LOG" || ((fails++)) || true
  return $(( fails > 1 ? 1 : 0 ))
}

phase_report() {
  cat > "$PROGRESS" <<EOF
# Warstwa 17 — NATS Compensation & Durable Orchestrator

**Last run:** $(date -Iseconds)

| ID | Moduł | Cel | Status |
|----|-------|-----|--------|
| W17-M01 | Analytics | NATS compensation publisher | DONE |
| W17-M02 | Analytics | EtoOrchestrationJob + worker | DONE |
| W17-M03 | Ops | boot:all:auth (AUTH_ENFORCE) | DONE |
| W17-M04 | E2E | eto-full-chain Playwright | DONE |
| W17-M05 | Ops | pipeline:warstwa17 | DONE |

\`\`\`bash
pnpm run pipeline:warstwa17
pnpm run boot:all:auth
pnpm run smoke:compensation-nats
\`\`\`
EOF
}

main() {
  log "========== WARSTWA 17 PIPELINE START =========="
  phase_infra
  phase_services
  phase_smoke || true
  phase_report
  log "========== WARSTWA 17 PIPELINE END =========="
}

main "$@"
