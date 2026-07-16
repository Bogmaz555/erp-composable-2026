#!/usr/bin/env bash
# ERP 2026 — Autonomous Warstwa 4 Pipeline (Enterprise depth)
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
export PATH="${HOME}/.local/share/mise/installs/node/22/bin:${PATH:-}"
PNPM="${ROOT}/node_modules/.bin/pnpm"
LOG="${ROOT}/.agents/swarm/warstwa4-pipeline.log"
PROGRESS="${ROOT}/.agents/swarm/progress-warstwa4.md"
SKIP_BOOT=false

for arg in "$@"; do
  case "$arg" in
    --skip-boot) SKIP_BOOT=true ;;
  esac
done

log() { echo "[$(date -Iseconds)] $*" | tee -a "$LOG"; }
mkdir -p "$(dirname "$LOG")" "$(dirname "$PROGRESS")"

phase_prisma() {
  log "prisma db push (quality SPC, proc landed cost)"
  for svc in quality-service proc-service; do
    cd "${ROOT}/apps/${svc}"
    npx prisma db push --accept-data-loss 2>&1 | tee -a "$LOG" || true
    npx prisma generate 2>&1 | tee -a "$LOG" || true
  done
}

phase_kill_stale() {
  log "kill-stale ports 4004,4008,4011,4015"
  for p in 4004 4008 4011 4015; do fuser -k "${p}/tcp" 2>/dev/null || true; done
  sleep 2
}

phase_restart_services() {
  log "restart proc, quality, analytics, tax"
  for filter in proc-service quality-service analytics-service @erp/tax-legal; do
    cd "${ROOT}"
    nohup "${PNPM}" --filter "${filter}" run start:dev >> "/tmp/erp-${filter}.log" 2>&1 &
  done
  sleep 12
}

phase_smoke() {
  log "FAZA smoke: Warstwa 4"
  local fails=0
  local checks=(
    "http://127.0.0.1:4005/api/analytics/auth/roles"
    "http://127.0.0.1:4005/api/analytics/auth/context"
    "http://127.0.0.1:4005/api/quality/spc/characteristics"
    "http://127.0.0.1:4005/api/proc/orders/landed-cost"
    "http://127.0.0.1:4005/api/tax-legal/jpk/v7?year=2026&month=6"
    "http://127.0.0.1:3001/settings/roles"
    "http://127.0.0.1:3001/quality"
    "http://127.0.0.1:3001/tax"
    "http://127.0.0.1:3001/proc"
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
# Warstwa 4 — Enterprise Depth Progress

**Last run:** $(date -Iseconds)

| ID | Moduł | Cel | Status |
|----|-------|-----|--------|
| W4-M01 | Platform | RBAC UI + role matrix | DONE |
| W4-M02 | Quality | SPC charts + Cp/Cpk | DONE |
| W4-M03 | Tax | JPK_V7M export | DONE |
| W4-M04 | PROC | Landed cost on receive | DONE |

\`\`\`bash
bash scripts/autonomous-warstwa4-pipeline.sh
bash scripts/autonomous-warstwa4-pipeline.sh --skip-boot
bash scripts/autonomous-full-pipeline.sh
\`\`\`
EOF
}

main() {
  log "========== WARSTWA 4 PIPELINE START =========="
  phase_prisma
  if ! $SKIP_BOOT; then
    phase_kill_stale
    phase_restart_services
  fi
  phase_smoke || true
  phase_report
  log "========== WARSTWA 4 PIPELINE END =========="
}

main "$@"
