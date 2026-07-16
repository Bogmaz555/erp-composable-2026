#!/usr/bin/env bash
# ERP 2026 — Autonomous Warstwa 9 Pipeline
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
export PATH="${HOME}/.local/share/mise/installs/node/22/bin:${PATH:-}"
LOG="${ROOT}/.agents/swarm/warstwa9-pipeline.log"
PROGRESS="${ROOT}/.agents/swarm/progress-warstwa9.md"
SKIP_BOOT=false

for arg in "$@"; do
  case "$arg" in --skip-boot) SKIP_BOOT=true ;; esac
done

log() { echo "[$(date -Iseconds)] $*" | tee -a "$LOG"; }
mkdir -p "$(dirname "$LOG")" "$(dirname "$PROGRESS")"

phase_finance() {
  log "ensure finance prod"
  bash "${ROOT}/scripts/ensure-finance-prod.sh" restart 2>&1 | tee -a "$LOG" || true
}

phase_smoke() {
  log "smoke W9"
  local fails=0
  for url in \
    "http://127.0.0.1:4010/fin/health" \
    "http://127.0.0.1:4005/api/fin/fixed-assets" \
    "http://127.0.0.1:4005/api/analytics/command-center" \
    "http://127.0.0.1:4005/api/analytics/operations/health-matrix"; do
    code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$url" 2>/dev/null || echo "000")
    if [[ "$code" =~ ^[23] ]]; then log "  OK $code $url"; else log "  FAIL $code $url"; ((fails++)) || true; fi
  done
  npx tsx scripts/master-regression-report.ts 2>&1 | tee -a "$LOG" || ((fails++)) || true
  return $(( fails > 3 ? 1 : 0 ))
}

phase_report() {
  cat > "$PROGRESS" <<EOF
# Warstwa 9 — Master Orchestration

**Last run:** $(date -Iseconds)

| ID | Moduł | Cel | Status |
|----|-------|-----|--------|
| W9-M01 | Finance | Prod boot (dist/main.js) + ensure script | DONE |
| W9-M02 | Platform | Command Center API | DONE |
| W9-M03 | QA | Master regression report (JSON) | DONE |
| W9-M04 | Ops | Master orchestrator worker 24/7 | DONE |
| W9-M05 | UI | CommandCenterPanel na dashboardzie | DONE |

\`\`\`bash
bash scripts/autonomous-warstwa9-pipeline.sh
bash scripts/autonomous-master-orchestrator.sh
pnpm run worker:master
pnpm run regression:report
\`\`\`
EOF
}

main() {
  log "========== WARSTWA 9 PIPELINE START =========="
  phase_finance
  if ! $SKIP_BOOT; then
    bash "${ROOT}/scripts/autonomous-master-orchestrator.sh" 2>&1 | tail -20 | tee -a "$LOG" || true
  fi
  phase_smoke || true
  phase_report
  log "========== WARSTWA 9 PIPELINE END =========="
}

main "$@"
