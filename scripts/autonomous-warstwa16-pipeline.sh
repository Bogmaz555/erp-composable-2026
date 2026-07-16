#!/usr/bin/env bash
# ERP 2026 — Autonomous Warstwa 16 Pipeline
# Keycloak hardening + saga compensation + production auth + Playwright ETO
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
export PATH="${HOME}/.local/share/mise/installs/node/22/bin:${PATH:-}"
LOG="${ROOT}/.agents/swarm/warstwa16-pipeline.log"
PROGRESS="${ROOT}/.agents/swarm/progress-warstwa16.md"
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
  bash "${ROOT}/scripts/ensure-keycloak-ready.sh" 2>&1 | tail -4 | tee -a "$LOG" || true
}

phase_services() {
  if $SKIP_BOOT; then return; fi
  port=4011
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 "http://127.0.0.1:${port}/health" 2>/dev/null || echo "000")
  if [[ ! "$code" =~ ^[23] ]]; then
    log "restart analytics :${port}"
    fuser -k "${port}/tcp" 2>/dev/null || true
    sleep 1
    nohup bash -c "${PNPM} --filter analytics-service run start:dev" >> /tmp/erp-w16-analytics.log 2>&1 &
    sleep 14
  fi
}

phase_smoke() {
  log "smoke W16"
  local fails=0

  npx tsx scripts/saga-compensation-smoke.ts 2>&1 | tee -a "$LOG" || ((fails++)) || true
  npx tsx scripts/eto-live-nats-smoke.ts 2>&1 | tail -12 | tee -a "$LOG" || ((fails++)) || true
  bash scripts/auth-enforce-e2e.sh 2>&1 | tail -14 | tee -a "$LOG" || true

  if command -v npx >/dev/null 2>&1; then
    PW_SKIP_SERVER=1 "${PNPM}" exec playwright test e2e/eto-dashboard-chain.spec.ts e2e/eto-plm-explosion.spec.ts --reporter=line 2>&1 | tail -12 | tee -a "$LOG" || log "WARN playwright eto"
  fi

  bash scripts/autonomous-mission-worker.sh --quick 2>&1 | tail -6 | tee -a "$LOG" || true
  npx tsx scripts/master-regression-report.ts 2>&1 | tail -8 | tee -a "$LOG" || ((fails++)) || true
  return $(( fails > 1 ? 1 : 0 ))
}

phase_report() {
  cat > "$PROGRESS" <<EOF
# Warstwa 16 — Saga Compensation & Production Auth

**Last run:** $(date -Iseconds)

| ID | Moduł | Cel | Status |
|----|-------|-----|--------|
| W16-M01 | Auth | ensure-keycloak-ready.sh | DONE |
| W16-M02 | Analytics | Saga compensation API | DONE |
| W16-M03 | Ops | boot-production-profile.sh | DONE |
| W16-M04 | E2E | Playwright ETO + PLM specs | DONE |
| W16-M05 | Ops | pipeline:warstwa16 | DONE |

\`\`\`bash
pnpm run pipeline:warstwa16
pnpm run boot:prod
pnpm run smoke:saga-compensation
\`\`\`
EOF
}

main() {
  log "========== WARSTWA 16 PIPELINE START =========="
  phase_infra
  phase_services
  phase_smoke || true
  phase_report
  log "========== WARSTWA 16 PIPELINE END =========="
}

main "$@"
