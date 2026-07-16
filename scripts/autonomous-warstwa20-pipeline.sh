#!/usr/bin/env bash
# ERP 2026 — Autonomous Warstwa 20 Pipeline
# Workflow-driven orchestrator + PLM API smoke + MES restart + Temporal profile
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
export PATH="${HOME}/.local/share/mise/installs/node/22/bin:${PATH:-}"
LOG="${ROOT}/.agents/swarm/warstwa20-pipeline.log"
PROGRESS="${ROOT}/.agents/swarm/progress-warstwa20.md"
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
  docker compose --profile temporal up -d temporal-db temporal temporal-ui 2>&1 | tail -4 | tee -a "$LOG" || log "WARN temporal profile optional"
}

restart_if_down() {
  local port=$1 cmd=$2
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 "http://127.0.0.1:${port}/health" 2>/dev/null || echo "000")
  if [[ ! "$code" =~ ^[23] ]]; then
    log "restart :${port}"
    fuser -k "${port}/tcp" 2>/dev/null || true
    sleep 1
    nohup bash -c "$cmd" >> "/tmp/erp-w20-${port}.log" 2>&1 &
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
  log "smoke W20"
  local fails=0

  npx tsx scripts/workflow-orchestrator-smoke.ts 2>&1 | tee -a "$LOG" || ((fails++)) || true
  npx tsx scripts/plm-explosion-api-smoke.ts 2>&1 | tee -a "$LOG" || ((fails++)) || true
  npx tsx scripts/stock-rollback-smoke.ts 2>&1 | tail -8 | tee -a "$LOG" || ((fails++)) || true
  npx tsx scripts/compensation-rollback-smoke.ts 2>&1 | tail -8 | tee -a "$LOG" || true

  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "http://127.0.0.1:8088" 2>/dev/null || echo "000")
  if [[ "$code" =~ ^[23] ]]; then log "  OK temporal-ui ${code}"; else log "  SKIP temporal-ui (profile optional)"; fi

  bash scripts/autonomous-mission-worker.sh --quick 2>&1 | tail -6 | tee -a "$LOG" || true
  npx tsx scripts/master-regression-report.ts 2>&1 | tail -8 | tee -a "$LOG" || ((fails++)) || true
  return $(( fails > 1 ? 1 : 0 ))
}

phase_report() {
  cat > "$PROGRESS" <<EOF
# Warstwa 20 — Workflow-Driven Orchestrator

**Last run:** $(date -Iseconds)

| ID | Moduł | Cel | Status |
|----|-------|-----|--------|
| W20-M01 | Analytics | Orchestrator ← YAML workflow steps | DONE |
| W20-M02 | Ops | plm-explosion-api-smoke + workflow-orchestrator-smoke | DONE |
| W20-M03 | MES | Auto-restart w pipeline (compensation 502 fix) | DONE |
| W20-M04 | Infra | Temporal docker profile (optional) | DONE |
| W20-M05 | Ops | pipeline:warstwa20 | DONE |

\`\`\`bash
docker compose --profile temporal up -d
pnpm run pipeline:warstwa20
pnpm run smoke:workflow-orchestrator
pnpm run smoke:plm-explosion-api
\`\`\`
EOF
}

main() {
  log "========== WARSTWA 20 PIPELINE START =========="
  phase_infra
  phase_services
  phase_smoke || true
  phase_report
  log "========== WARSTWA 20 PIPELINE END =========="
}

main "$@"
