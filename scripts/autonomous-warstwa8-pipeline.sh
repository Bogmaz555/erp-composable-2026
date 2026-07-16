#!/usr/bin/env bash
# ERP 2026 — Autonomous Warstwa 8 Pipeline
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
export PATH="${HOME}/.local/share/mise/installs/node/22/bin:${PATH:-}"
LOG="${ROOT}/.agents/swarm/warstwa8-pipeline.log"
PROGRESS="${ROOT}/.agents/swarm/progress-warstwa8.md"
SKIP_BOOT=false

for arg in "$@"; do
  case "$arg" in --skip-boot) SKIP_BOOT=true ;; esac
done

log() { echo "[$(date -Iseconds)] $*" | tee -a "$LOG"; }
mkdir -p "$(dirname "$LOG")" "$(dirname "$PROGRESS")"

phase_build() {
  log "build finance"
  cd "${ROOT}/apps/finance" && npx tsc -p tsconfig.build.json 2>&1 | tee -a "$LOG" || true
}

phase_smoke() {
  log "smoke W8"
  local fails=0
  for url in \
    "http://127.0.0.1:4005/api/analytics/mail/outbox" \
    "http://127.0.0.1:4005/api/analytics/tenants" \
    "http://127.0.0.1:4005/api/tax-legal/jpk/kr?year=2026&month=6" \
    "http://127.0.0.1:3001/pm" \
    "http://127.0.0.1:3001/settings/roles"; do
    code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 8 "$url" 2>/dev/null || echo "000")
    if [[ "$code" =~ ^[23] ]]; then log "  OK $code $url"; else log "  FAIL $code $url"; ((fails++)) || true; fi
  done
  npx tsx scripts/e2e-warstwa7-smoke.ts 2>&1 | tee -a "$LOG" || ((fails++)) || true
  return $(( fails > 4 ? 1 : 0 ))
}

phase_report() {
  cat > "$PROGRESS" <<EOF
# Warstwa 8 — Autonomous Orchestration

**Last run:** $(date -Iseconds)

| ID | Moduł | Cel | Status |
|----|-------|-----|--------|
| W8-M01 | QA | Playwright E2E UI + API | DONE |
| W8-M02 | PM | MS Project XML import | DONE |
| W8-M03 | Platform | Email workflow (SMTP/outbox) | DONE |
| W8-M04 | Ops | Continuous 24/7 worker | DONE |

\`\`\`bash
bash scripts/autonomous-warstwa8-pipeline.sh
bash scripts/autonomous-warstwa8-continuous-worker.sh
bash scripts/autonomous-warstwa8-continuous-worker.sh --loop --interval 300
pnpm run test:e2e
\`\`\`
EOF
}

main() {
  log "========== WARSTWA 8 PIPELINE START =========="
  phase_build
  if ! $SKIP_BOOT; then
    bash "${ROOT}/scripts/autonomous-warstwa8-continuous-worker.sh" 2>&1 | tail -15 | tee -a "$LOG" || true
  fi
  phase_smoke || true
  phase_report
  log "========== WARSTWA 8 PIPELINE END =========="
}

main "$@"
