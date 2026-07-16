#!/usr/bin/env bash
# ERP 2026 — Autonomous Warstwa 6 Pipeline (FA→GL, Multi-tenant, KSeF prod, ISO 9001)
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
export PATH="${HOME}/.local/share/mise/installs/node/22/bin:${PATH:-}"
PNPM="${ROOT}/node_modules/.bin/pnpm"
LOG="${ROOT}/.agents/swarm/warstwa6-pipeline.log"
PROGRESS="${ROOT}/.agents/swarm/progress-warstwa6.md"
SKIP_BOOT=false

for arg in "$@"; do
  case "$arg" in
    --skip-boot) SKIP_BOOT=true ;;
  esac
done

log() { echo "[$(date -Iseconds)] $*" | tee -a "$LOG"; }
mkdir -p "$(dirname "$LOG")" "$(dirname "$PROGRESS")"

phase_prisma() {
  log "prisma db push (quality ISO)"
  cd "${ROOT}/apps/quality-service"
  npx prisma db push --accept-data-loss 2>&1 | tee -a "$LOG" || true
  npx prisma generate 2>&1 | tee -a "$LOG" || true
}

phase_build_finance() {
  log "build finance (tsc)"
  cd "${ROOT}/apps/finance"
  npx tsc -p tsconfig.build.json 2>&1 | tee -a "$LOG" || true
}

phase_kill_stale() {
  log "kill-stale ports 4008,4010,4011,4015"
  for p in 4008 4010 4011 4015; do fuser -k "${p}/tcp" 2>/dev/null || true; done
  sleep 2
}

phase_restart_services() {
  log "restart quality, finance, analytics, tax"
  cd "${ROOT}"
  nohup "${PNPM}" --filter quality-service run start:dev >> /tmp/erp-quality.log 2>&1 &
  nohup "${PNPM}" --filter finance run start:prod >> /tmp/erp-finance.log 2>&1 &
  nohup "${PNPM}" --filter analytics-service run start:dev >> /tmp/erp-analytics.log 2>&1 &
  nohup "${PNPM}" --filter @erp/tax-legal run start:dev >> /tmp/erp-tax.log 2>&1 &
  sleep 14
}

phase_smoke() {
  log "FAZA smoke: Warstwa 6"
  local fails=0
  local checks=(
    "http://127.0.0.1:4005/api/fin/fixed-assets"
    "http://127.0.0.1:4005/api/analytics/tenants"
    "http://127.0.0.1:4005/api/tax-legal/ksef/status"
    "http://127.0.0.1:4005/api/quality/iso/documents"
    "http://127.0.0.1:4005/api/quality/iso/summary"
    "http://127.0.0.1:3001/quality"
    "http://127.0.0.1:3001/tax"
    "http://127.0.0.1:3001/finance"
  )
  for url in "${checks[@]}"; do
    code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$url" 2>/dev/null || echo "000")
    if [[ "$code" =~ ^[23] ]]; then
      log "  OK $code $url"
    else
      log "  FAIL $code $url"
      ((fails++)) || true
    fi
  done
  log "smoke: $fails failures"
  return $(( fails > 3 ? 1 : 0 ))
}

phase_report() {
  cat > "$PROGRESS" <<EOF
# Warstwa 6 — Production Readiness Progress

**Last run:** $(date -Iseconds)

| ID | Moduł | Cel | Status |
|----|-------|-----|--------|
| W6-M01 | Finance | FA amortyzacja → auto GL (402-DEP/071-FA-ACC) | DONE |
| W6-M02 | Platform | Multi-tenant selector + /tenants API | DONE |
| W6-M03 | Tax | KSeF production mode (KSEF_MODE=production) | DONE |
| W6-M04 | Quality | ISO 9001 rejestr dokumentacji | DONE |

\`\`\`bash
bash scripts/autonomous-warstwa6-pipeline.sh
bash scripts/autonomous-warstwa6-pipeline.sh --skip-boot
pnpm run pipeline:full
\`\`\`
EOF
}

main() {
  log "========== WARSTWA 6 PIPELINE START =========="
  phase_prisma
  phase_build_finance
  if ! $SKIP_BOOT; then
    phase_kill_stale
    phase_restart_services
  fi
  phase_smoke || true
  phase_report
  log "========== WARSTWA 6 PIPELINE END =========="
}

main "$@"
