#!/usr/bin/env bash
# ERP 2026 — Autonomous Warstwa 15 Pipeline
# DB-backed ETO saga + 7-step NATS + AUTH_ENFORCE E2E
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
export PATH="${HOME}/.local/share/mise/installs/node/22/bin:${PATH:-}"
LOG="${ROOT}/.agents/swarm/warstwa15-pipeline.log"
PROGRESS="${ROOT}/.agents/swarm/progress-warstwa15.md"
SKIP_BOOT=false
PNPM="${ROOT}/node_modules/.bin/pnpm"

for arg in "$@"; do
  case "$arg" in --skip-boot) SKIP_BOOT=true ;; esac
done

log() { echo "[$(date -Iseconds)] $*" | tee -a "$LOG"; }
mkdir -p "$(dirname "$LOG")" "$(dirname "$PROGRESS")"

phase_infra() {
  if $SKIP_BOOT; then return; fi
  bash "${ROOT}/scripts/boot-docker-stack.sh" 2>&1 | tail -8 | tee -a "$LOG" || true
  bash "${ROOT}/scripts/ensure-databases.sh" analytics-service 2>&1 | tail -6 | tee -a "$LOG" || true
}

phase_services() {
  if $SKIP_BOOT; then return; fi
  for spec in \
    "4011:${PNPM} --filter analytics-service run start:dev"; do
    port="${spec%%:*}"
    cmd="${spec#*:}"
    code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 "http://127.0.0.1:${port}/health" 2>/dev/null || echo "000")
    if [[ ! "$code" =~ ^[23] ]]; then
      log "restart analytics :${port}"
      fuser -k "${port}/tcp" 2>/dev/null || true
      sleep 1
      nohup bash -c "$cmd" >> "/tmp/erp-w15-${port}.log" 2>&1 &
      sleep 14
    fi
  done
}

phase_smoke() {
  log "smoke W15"
  local fails=0

  hres=$(curl -s --max-time 10 -H "X-Tenant-Id: default" "http://127.0.0.1:4005/api/analytics/eto-chain/history" 2>/dev/null || echo "{}")
  store=$(echo "$hres" | python3 -c "import sys,json; print(json.load(sys.stdin).get('store','?'))" 2>/dev/null || echo "?")
  log "  eto-chain store → ${store}"

  npx tsx scripts/eto-live-nats-smoke.ts 2>&1 | tee -a "$LOG" || ((fails++)) || true
  bash scripts/auth-enforce-e2e.sh 2>&1 | tail -12 | tee -a "$LOG" || true
  bash scripts/autonomous-mission-worker.sh --quick 2>&1 | tail -6 | tee -a "$LOG" || true
  npx tsx scripts/master-regression-report.ts 2>&1 | tail -8 | tee -a "$LOG" || ((fails++)) || true
  return $(( fails > 1 ? 1 : 0 ))
}

phase_report() {
  cat > "$PROGRESS" <<EOF
# Warstwa 15 — DB Saga & Auth Enforce E2E

**Last run:** $(date -Iseconds)

| ID | Moduł | Cel | Status |
|----|-------|-----|--------|
| W15-M01 | Analytics | EtoSaga Prisma + analytics-db :5445 | DONE |
| W15-M02 | NATS | 7-step ETO live smoke | DONE |
| W15-M03 | Auth | auth-enforce-e2e.sh | DONE |
| W15-M04 | UI | EtoChainPanel history + store badge | DONE |
| W15-M05 | Ops | pipeline:warstwa15 | DONE |

\`\`\`bash
pnpm run pipeline:warstwa15
pnpm run smoke:auth-e2e
\`\`\`
EOF
}

main() {
  log "========== WARSTWA 15 PIPELINE START =========="
  phase_infra
  phase_services
  phase_smoke || true
  phase_report
  log "========== WARSTWA 15 PIPELINE END =========="
}

main "$@"
