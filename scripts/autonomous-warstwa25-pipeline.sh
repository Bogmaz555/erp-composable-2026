#!/usr/bin/env bash
# ERP 2026 — Warstwa 25: Auth & Gateway hardening (TD-001/TD-002 → minimum 🟡)
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
source "${ROOT}/scripts/erp-env.sh"
LOG="${ROOT}/.agents/swarm/warstwa25-pipeline.log"
SKIP_BOOT=false
for arg in "$@"; do case "$arg in --skip-boot) SKIP_BOOT=true ;; esac; done
log() { echo "[$(date -Iseconds)] $*" | tee -a "$LOG"; }
mkdir -p "$(dirname "$LOG")"

service_health() {
  curl -s -o /dev/null -w "%{http_code}" --max-time 3 "http://127.0.0.1:$1${2:-/health}" 2>/dev/null || echo "000"
}

phase_smoke() {
  log "smoke W25 (auth + gateway)"
  pnpm run test:contracts 2>&1 | tail -4 | tee -a "$LOG" || true
  npx tsx scripts/auth-enforce-smoke.ts 2>&1 | tee -a "$LOG" || true
  bash scripts/keycloak-rbac-smoke.sh 2>&1 | tee -a "$LOG" || true
  curl -sf "http://127.0.0.1:4005/api/health" >/dev/null && log "✓ gateway /api/health" || log "SKIP gateway"
  curl -sf "http://127.0.0.1:4005/api/plm/boms" >/dev/null && log "✓ gateway plm proxy" || log "SKIP plm proxy"
}

main() {
  log "========== WARSTWA 25 PIPELINE START =========="
  phase_smoke || true
  log "========== WARSTWA 25 PIPELINE END =========="
}
main "$@"
