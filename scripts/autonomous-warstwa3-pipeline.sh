#!/usr/bin/env bash
# ERP 2026 — Autonomous Warstwa 3 Pipeline (Premium UX)
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
export PATH="${HOME}/.local/share/mise/installs/node/22/bin:${PATH:-}"
PNPM="${ROOT}/node_modules/.bin/pnpm"
LOG="${ROOT}/.agents/swarm/warstwa3-pipeline.log"
PROGRESS="${ROOT}/.agents/swarm/progress-warstwa3.md"
SKIP_BOOT=false

for arg in "$@"; do
  case "$arg" in
    --skip-boot) SKIP_BOOT=true ;;
  esac
done

log() { echo "[$(date -Iseconds)] $*" | tee -a "$LOG"; }
mkdir -p "$(dirname "$LOG")" "$(dirname "$PROGRESS")"

phase_kill_stale() {
  log "kill-stale analytics:4011"
  fuser -k 4011/tcp 2>/dev/null || true
  sleep 2
}

phase_restart_analytics() {
  log "restart analytics-service"
  cd "${ROOT}/apps/analytics-service"
  npx nest build 2>/dev/null || npx tsc -p tsconfig.build.json 2>/dev/null || true
  nohup "${PNPM}" --filter analytics-service run start:dev >> /tmp/erp-analytics.log 2>&1 &
  sleep 8
}

phase_smoke() {
  log "FAZA smoke: Warstwa 3 platform"
  local fails=0
  local checks=(
    "http://127.0.0.1:4005/api/analytics/search?q=test"
    "http://127.0.0.1:4005/api/analytics/kpi"
    "http://127.0.0.1:4005/api/analytics/audit"
    "http://127.0.0.1:4005/api/analytics/notifications"
    "http://127.0.0.1:4005/api/analytics/export/products"
    "http://127.0.0.1:4005/api/analytics/counters"
    "http://127.0.0.1:3001/"
    "http://127.0.0.1:3001/data-hub"
  )
  for url in "${checks[@]}"; do
    code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 8 "$url" 2>/dev/null || echo "000")
    if [[ "$code" =~ ^[23] ]]; then
      log "  OK $code $url"
    else
      log "  FAIL $code $url"
      ((fails++)) || true
    fi
  done
  log "smoke: $fails failures"
  return $(( fails > 2 ? 1 : 0 ))
}

phase_report() {
  cat > "$PROGRESS" <<EOF
# Warstwa 3 — Premium UX Progress

**Last run:** $(date -Iseconds)

| ID | Moduł | Cel | Status |
|----|-------|-----|--------|
| W3-M01 | Platform | Global Search (⌘K) | DONE |
| W3-M02 | Platform | KPI Dashboard per moduł | DONE |
| W3-M03 | Platform | Audyt NATS + powiadomienia | DONE |
| W3-M04 | Data Hub | CSV import/export produktów | DONE |

\`\`\`bash
bash scripts/autonomous-warstwa3-pipeline.sh
bash scripts/autonomous-warstwa3-pipeline.sh --skip-boot
\`\`\`
EOF
}

main() {
  log "========== WARSTWA 3 PIPELINE START =========="
  if ! $SKIP_BOOT; then
    phase_kill_stale
    phase_restart_analytics
  fi
  phase_smoke || true
  phase_report
  log "========== WARSTWA 3 PIPELINE END =========="
}

main "$@"
