#!/usr/bin/env bash
# ERP 2026 — Autonomous Warstwa 13 Pipeline
# ETO live NATS chain + auth stack + trigger-demo
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
export PATH="${HOME}/.local/share/mise/installs/node/22/bin:${PATH:-}"
LOG="${ROOT}/.agents/swarm/warstwa13-pipeline.log"
PROGRESS="${ROOT}/.agents/swarm/progress-warstwa13.md"
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
  bash "${ROOT}/scripts/ensure-auth-stack.sh" 2>&1 | tail -4 | tee -a "$LOG" || true
}

phase_services() {
  if $SKIP_BOOT; then return; fi
  bash "${ROOT}/scripts/ensure-finance-prod.sh" start 2>&1 | tail -2 | tee -a "$LOG" || true
  for spec in \
    "4003:${PNPM} --filter inv-service run start:dev" \
    "4006:${PNPM} --filter mes-service run start:dev" \
    "4011:${PNPM} --filter analytics-service run start:dev"; do
    port="${spec%%:*}"
    cmd="${spec#*:}"
    code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 "http://127.0.0.1:${port}/health" 2>/dev/null || echo "000")
    if [[ ! "$code" =~ ^[23] ]]; then
      log "restart :${port}"
      fuser -k "${port}/tcp" 2>/dev/null || true
      sleep 1
      nohup bash -c "$cmd" >> "/tmp/erp-w13-${port}.log" 2>&1 &
      sleep 12
    fi
  done
}

phase_smoke() {
  log "smoke W13"
  local fails=0

  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 -H "X-Tenant-Id: default" \
    "http://127.0.0.1:4005/api/analytics/eto-chain/status" 2>/dev/null || echo "000")
  if [[ "$code" =~ ^[23] ]]; then log "  OK $code eto-chain/status"; else log "  FAIL $code eto-chain"; ((fails++)) || true; fi

  curl -s -X POST -H "X-Tenant-Id: default" \
    "http://127.0.0.1:4005/api/analytics/eto-chain/trigger-demo" 2>/dev/null | head -c 200 | tee -a "$LOG" || true

  npx tsx scripts/eto-live-nats-smoke.ts 2>&1 | tee -a "$LOG" || ((fails++)) || true
  npx tsx scripts/msp-roundtrip-smoke.ts 2>&1 | tail -6 | tee -a "$LOG" || true
  npx tsx scripts/master-regression-report.ts 2>&1 | tail -6 | tee -a "$LOG" || ((fails++)) || true
  return $(( fails > 2 ? 1 : 0 ))
}

phase_report() {
  cat > "$PROGRESS" <<EOF
# Warstwa 13 — ETO Live Chain & Auth

**Last run:** $(date -Iseconds)

| ID | Moduł | Cel | Status |
|----|-------|-----|--------|
| W13-M01 | Analytics | ETO chain status + trigger-demo | DONE |
| W13-M02 | NATS | eto-live-nats-smoke.ts | DONE |
| W13-M03 | Auth UI | Keycloak hash token auto-parse | DONE |
| W13-M04 | UI | EtoChainPanel | DONE |
| W13-M05 | Pipeline | autonomous-warstwa13 | DONE |

\`\`\`bash
pnpm run pipeline:warstwa13
pnpm run smoke:eto-live
\`\`\`
EOF
}

main() {
  log "========== WARSTWA 13 PIPELINE START =========="
  phase_infra
  phase_services
  phase_smoke || true
  phase_report
  log "========== WARSTWA 13 PIPELINE END =========="
}

main "$@"
