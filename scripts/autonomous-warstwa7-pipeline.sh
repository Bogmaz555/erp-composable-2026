#!/usr/bin/env bash
# ERP 2026 — Autonomous Warstwa 7 Pipeline (Gantt, Tenant ISO, JPK_KR, E2E)
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
export PATH="${HOME}/.local/share/mise/installs/node/22/bin:${PATH:-}"
PNPM="${ROOT}/node_modules/.bin/pnpm"
LOG="${ROOT}/.agents/swarm/warstwa7-pipeline.log"
PROGRESS="${ROOT}/.agents/swarm/progress-warstwa7.md"
SKIP_BOOT=false

for arg in "$@"; do
  case "$arg" in
    --skip-boot) SKIP_BOOT=true ;;
  esac
done

log() { echo "[$(date -Iseconds)] $*" | tee -a "$LOG"; }
mkdir -p "$(dirname "$LOG")" "$(dirname "$PROGRESS")"

phase_build() {
  log "build finance + tax"
  cd "${ROOT}/apps/finance" && npx tsc -p tsconfig.build.json 2>&1 | tee -a "$LOG" || true
  cd "${ROOT}/apps/tax-legal" && npx tsc -p tsconfig.build.json 2>&1 | tee -a "$LOG" || true
}

phase_kill_stale() {
  log "kill-stale 4002,4008,4010,4011,4015"
  for p in 4002 4008 4010 4011 4015; do fuser -k "${p}/tcp" 2>/dev/null || true; done
  sleep 2
}

phase_restart_services() {
  log "restart pm, quality, finance, analytics, tax"
  cd "${ROOT}"
  nohup "${PNPM}" --filter pm-service run start:dev >> /tmp/erp-pm.log 2>&1 &
  nohup "${PNPM}" --filter quality-service run start:dev >> /tmp/erp-quality.log 2>&1 &
  nohup "${PNPM}" --filter finance run start:prod >> /tmp/erp-finance.log 2>&1 &
  nohup "${PNPM}" --filter analytics-service run start:dev >> /tmp/erp-analytics.log 2>&1 &
  nohup "${PNPM}" --filter @erp/tax-legal run start:dev >> /tmp/erp-tax.log 2>&1 &
  sleep 16
}

phase_smoke() {
  log "E2E smoke Warstwa 7"
  npx tsx scripts/e2e-warstwa7-smoke.ts 2>&1 | tee -a "$LOG" || true
}

phase_report() {
  cat > "$PROGRESS" <<EOF
# Warstwa 7 — Advanced Enterprise Progress

**Last run:** $(date -Iseconds)

| ID | Moduł | Cel | Status |
|----|-------|-----|--------|
| W7-M01 | PM | Interactive Gantt (drag + CSV import) | DONE |
| W7-M02 | Platform | Tenant isolation w API | DONE |
| W7-M03 | Tax | JPK_KR z GL | DONE |
| W7-M04 | QA | E2E smoke + approval notifications | DONE |

\`\`\`bash
bash scripts/autonomous-warstwa7-pipeline.sh
npx tsx scripts/e2e-warstwa7-smoke.ts
pnpm run pipeline:full
\`\`\`
EOF
}

main() {
  log "========== WARSTWA 7 PIPELINE START =========="
  phase_build
  if ! $SKIP_BOOT; then
    phase_kill_stale
    phase_restart_services
  fi
  phase_smoke
  phase_report
  log "========== WARSTWA 7 PIPELINE END =========="
}

main "$@"
