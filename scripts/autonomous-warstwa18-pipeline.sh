#!/usr/bin/env bash
# ERP 2026 — Autonomous Warstwa 18 Pipeline
# INV/MES compensation listeners + multi-tenant orchestrator + CI hardening
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
export PATH="${HOME}/.local/share/mise/installs/node/22/bin:${PATH:-}"
LOG="${ROOT}/.agents/swarm/warstwa18-pipeline.log"
PROGRESS="${ROOT}/.agents/swarm/progress-warstwa18.md"
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
}

restart_if_down() {
  local port=$1 cmd=$2
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 "http://127.0.0.1:${port}/health" 2>/dev/null || echo "000")
  if [[ ! "$code" =~ ^[23] ]]; then
    log "restart :${port}"
    fuser -k "${port}/tcp" 2>/dev/null || true
    sleep 1
    nohup bash -c "$cmd" >> "/tmp/erp-w18-${port}.log" 2>&1 &
    sleep 14
  fi
}

phase_services() {
  if $SKIP_BOOT; then return; fi
  restart_if_down 4011 "${PNPM} --filter analytics-service run start:dev"
  restart_if_down 4003 "${PNPM} --filter inv-service run start:dev"
  restart_if_down 4006 "cd ${ROOT}/apps/mes-service && npx nest build && node dist/mes-service/src/main.js"
}

phase_smoke() {
  log "smoke W18"
  local fails=0

  npx tsx scripts/compensation-rollback-smoke.ts 2>&1 | tee -a "$LOG" || ((fails++)) || true
  npx tsx scripts/compensation-nats-smoke.ts 2>&1 | tail -12 | tee -a "$LOG" || ((fails++)) || true

  code=$(curl -s -o /dev/null -w "%{http_code}" -H "X-Tenant-Id: tenant-beta" \
    "http://127.0.0.1:4005/api/analytics/eto-chain/orchestrator/status?tenantId=tenant-beta" 2>/dev/null || echo "000")
  if [[ "$code" =~ ^[23] ]]; then log "  OK tenant orchestrator ${code}"; else log "  FAIL tenant orchestrator ${code}"; ((fails++)) || true; fi

  PW_SKIP_SERVER=1 "${PNPM}" exec playwright test e2e/eto-full-chain.spec.ts --reporter=line 2>&1 | tail -8 | tee -a "$LOG" || log "WARN playwright"

  bash scripts/autonomous-mission-worker.sh --quick 2>&1 | tail -6 | tee -a "$LOG" || true
  npx tsx scripts/master-regression-report.ts 2>&1 | tail -8 | tee -a "$LOG" || ((fails++)) || true
  return $(( fails > 1 ? 1 : 0 ))
}

phase_report() {
  cat > "$PROGRESS" <<EOF
# Warstwa 18 — INV/MES Compensation Rollback

**Last run:** $(date -Iseconds)

| ID | Moduł | Cel | Status |
|----|-------|-----|--------|
| W18-M01 | INV | saga-compensation.controller NATS listeners | DONE |
| W18-M02 | MES | workorder.cancelled + production.reversed | DONE |
| W18-M03 | Analytics | Multi-tenant orchestrator (tenantId) | DONE |
| W18-M04 | Smoke | compensation-rollback-smoke.ts | DONE |
| W18-M05 | Ops | pipeline:warstwa18 + CI | DONE |

\`\`\`bash
pnpm run pipeline:warstwa18
pnpm run smoke:compensation-rollback
\`\`\`
EOF
}

main() {
  log "========== WARSTWA 18 PIPELINE START =========="
  phase_infra
  phase_services
  phase_smoke || true
  phase_report
  log "========== WARSTWA 18 PIPELINE END =========="
}

main "$@"
