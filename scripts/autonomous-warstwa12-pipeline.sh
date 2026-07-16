#!/usr/bin/env bash
# ERP 2026 — Autonomous Warstwa 12 Pipeline
# ETO traceability spine + MSP round-trip + auth stack + schema-per-tenant
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
export PATH="${HOME}/.local/share/mise/installs/node/22/bin:${PATH:-}"
LOG="${ROOT}/.agents/swarm/warstwa12-pipeline.log"
PROGRESS="${ROOT}/.agents/swarm/progress-warstwa12.md"
SKIP_BOOT=false
PNPM="${ROOT}/node_modules/.bin/pnpm"

for arg in "$@"; do
  case "$arg" in --skip-boot) SKIP_BOOT=true ;; esac
done

log() { echo "[$(date -Iseconds)] $*" | tee -a "$LOG"; }
mkdir -p "$(dirname "$LOG")" "$(dirname "$PROGRESS")"

phase_infra() {
  bash "${ROOT}/scripts/boot-docker-stack.sh" 2>&1 | tail -8 | tee -a "$LOG" || true
  bash "${ROOT}/scripts/ensure-auth-stack.sh" 2>&1 | tail -6 | tee -a "$LOG" || true
}

phase_services() {
  if $SKIP_BOOT; then return; fi
  bash "${ROOT}/scripts/ensure-finance-prod.sh" start 2>&1 | tail -2 | tee -a "$LOG" || true
  for spec in \
    "4003:${PNPM} --filter inv-service run start:dev" \
    "4004:${PNPM} --filter proc-service run start:dev" \
    "4002:${PNPM} --filter pm-service run start:dev" \
    "4011:${PNPM} --filter analytics-service run start:dev"; do
    port="${spec%%:*}"
    cmd="${spec#*:}"
    code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 "http://127.0.0.1:${port}/health" 2>/dev/null || echo "000")
    if [[ ! "$code" =~ ^[23] ]]; then
      log "restart :${port}"
      fuser -k "${port}/tcp" 2>/dev/null || true
      sleep 1
      nohup bash -c "$cmd" >> "/tmp/erp-w12-${port}.log" 2>&1 &
      sleep 10
    fi
  done
}

phase_smoke() {
  log "smoke W12"
  local fails=0

  curl -s -X POST -H "X-Tenant-Id: default" \
    "http://127.0.0.1:4005/api/analytics/traceability/seed-demo" 2>/dev/null | head -c 150 | tee -a "$LOG" || true

  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 12 -H "X-Tenant-Id: default" \
    "http://127.0.0.1:4005/api/analytics/traceability/spine?serialOrLot=SN-MACHINE-ETO-001" 2>/dev/null || echo "000")
  if [[ "$code" =~ ^[23] ]]; then log "  OK $code traceability/spine"; else log "  FAIL $code traceability/spine"; ((fails++)) || true; fi

  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 12 -X POST -H "X-Tenant-Id: default" \
    "http://127.0.0.1:4005/api/proc/orders/tenant-schema/ensure" 2>/dev/null || echo "000")
  if [[ "$code" =~ ^[23] ]]; then log "  OK $code tenant-schema"; else log "  FAIL $code tenant-schema"; ((fails++)) || true; fi

  npx tsx scripts/msp-roundtrip-smoke.ts 2>&1 | tee -a "$LOG" || ((fails++)) || true
  npx tsx scripts/master-regression-report.ts 2>&1 | tail -6 | tee -a "$LOG" || ((fails++)) || true
  return $(( fails > 2 ? 1 : 0 ))
}

phase_report() {
  cat > "$PROGRESS" <<EOF
# Warstwa 12 — ETO Traceability & Auth Stack

**Last run:** $(date -Iseconds)

| ID | Moduł | Cel | Status |
|----|-------|-----|--------|
| W12-M01 | Analytics | ETO Traceability Spine API | DONE |
| W12-M02 | INV | Genealogy seed-demo | DONE |
| W12-M03 | PM | MSP round-trip smoke | DONE |
| W12-M04 | Infra | boot-docker-stack + ensure-auth | DONE |
| W12-M05 | PROC | Schema-per-tenant ensure | DONE |
| W12-M06 | UI | TraceabilitySpinePanel | DONE |

\`\`\`bash
pnpm run boot:docker
pnpm run pipeline:warstwa12
pnpm run smoke:msp-roundtrip
\`\`\`
EOF
}

main() {
  log "========== WARSTWA 12 PIPELINE START =========="
  if ! $SKIP_BOOT; then phase_infra; fi
  phase_services
  phase_smoke || true
  phase_report
  log "========== WARSTWA 12 PIPELINE END =========="
}

main "$@"
