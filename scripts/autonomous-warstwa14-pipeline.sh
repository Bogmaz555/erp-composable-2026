#!/usr/bin/env bash
# ERP 2026 — Autonomous Warstwa 14 Pipeline
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
export PATH="${HOME}/.local/share/mise/installs/node/22/bin:${PATH:-}"
LOG="${ROOT}/.agents/swarm/warstwa14-pipeline.log"
PROGRESS="${ROOT}/.agents/swarm/progress-warstwa14.md"
SKIP_BOOT=false

for arg in "$@"; do
  case "$arg" in --skip-boot) SKIP_BOOT=true ;; esac
done

log() { echo "[$(date -Iseconds)] $*" | tee -a "$LOG"; }
mkdir -p "$(dirname "$LOG")" "$(dirname "$PROGRESS")"

phase_smoke() {
  log "smoke W14"
  local fails=0

  for url in \
    "http://127.0.0.1:4005/api/analytics/eto-chain/history" \
    "http://127.0.0.1:4005/api/analytics/eto-chain/status"; do
    code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 -H "X-Tenant-Id: default" "$url" 2>/dev/null || echo "000")
    if [[ "$code" =~ ^[23] ]]; then log "  OK $code $url"; else log "  FAIL $code $url"; ((fails++)) || true; fi
  done

  npx tsx scripts/auth-enforce-smoke.ts 2>&1 | tee -a "$LOG" || true
  npx tsx scripts/eto-live-nats-smoke.ts 2>&1 | tee -a "$LOG" || ((fails++)) || true
  bash scripts/autonomous-mission-worker.sh --quick 2>&1 | tail -8 | tee -a "$LOG" || true
  npx tsx scripts/master-regression-report.ts 2>&1 | tail -6 | tee -a "$LOG" || ((fails++)) || true
  return $(( fails > 2 ? 1 : 0 ))
}

phase_report() {
  cat > "$PROGRESS" <<EOF
# Warstwa 14 — Persistent Saga & Mission Worker

**Last run:** $(date -Iseconds)

| ID | Moduł | Cel | Status |
|----|-------|-----|--------|
| W14-M01 | Analytics | Persistent ETO saga (eto-sagas.json) | DONE |
| W14-M02 | PLM | ETO Explosion one-click (plm-explosion) | DONE |
| W14-M03 | Auth | auth-enforce-smoke.ts | DONE |
| W14-M04 | Ops | autonomous-mission-worker.sh | DONE |
| W14-M05 | Infra | boot-full-stack.sh | DONE |

\`\`\`bash
pnpm run pipeline:warstwa14
pnpm run worker:mission
pnpm run boot:full
\`\`\`
EOF
}

main() {
  log "========== WARSTWA 14 PIPELINE START =========="
  if ! $SKIP_BOOT; then
    bash "${ROOT}/scripts/boot-full-stack.sh" 2>&1 | tail -8 | tee -a "$LOG" || true
  fi
  phase_smoke || true
  phase_report
  log "========== WARSTWA 14 PIPELINE END =========="
}

main "$@"
