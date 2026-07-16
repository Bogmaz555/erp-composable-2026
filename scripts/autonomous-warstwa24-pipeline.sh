#!/usr/bin/env bash
# ERP 2026 — Warstwa 24: Double BOM + payload hardening + Long-Lead UI
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
# shellcheck source=erp-env.sh
source "${ROOT}/scripts/erp-env.sh"
LOG="${ROOT}/.agents/swarm/warstwa24-pipeline.log"
SKIP_BOOT=false

for arg in "$@"; do
  case "$arg" in --skip-boot) SKIP_BOOT=true ;; esac
done

log() { echo "[$(date -Iseconds)] $*" | tee -a "$LOG"; }
mkdir -p "$(dirname "$LOG")"

service_health() {
  local port=$1 path=${2:-/health}
  curl -s -o /dev/null -w "%{http_code}" --max-time 3 "http://127.0.0.1:${port}${path}" 2>/dev/null || echo "000"
}

restart_if_down() {
  local port=$1 cmd=$2 health_path=${3:-/health}
  if [[ ! "$(service_health "$port" "$health_path")" =~ ^[23] ]]; then
    log "restart :${port}"
    fuser -k "${port}/tcp" 2>/dev/null || true
    sleep 1
    nohup bash -c "$cmd" >> "/tmp/erp-w24-${port}.log" 2>&1 &
    sleep 14
  fi
}

phase_prisma() {
  for svc in plm-service proc-service finance pm-service inv-service; do
    [[ -f "${ROOT}/apps/${svc}/prisma/schema.prisma" ]] || continue
    (cd "${ROOT}/apps/${svc}" && "${PNPM}" exec prisma db push --skip-generate 2>&1 | tail -1) | tee -a "$LOG" || true
    (cd "${ROOT}/apps/${svc}" && "${PNPM}" exec prisma generate --schema=prisma/schema.prisma 2>&1 | tail -1) | tee -a "$LOG" || true
  done
}

phase_build() {
  log "nest-build-all"
  bash "${ROOT}/scripts/nest-build-all.sh" 2>&1 | tail -6 | tee -a "$LOG" || true
}

phase_services() {
  if $SKIP_BOOT; then return; fi
  restart_if_down 4005 "${PNPM} --filter api-gateway run start:dev" /api/health
  restart_if_down 4007 "${PNPM} --filter plm-service run start:dev"
  restart_if_down 4004 "${PNPM} --filter proc-service run start:dev"
  restart_if_down 4002 "${PNPM} --filter pm-service run start:dev"
  restart_if_down 4003 "${PNPM} --filter inv-service run start:dev"
  restart_if_down 4010 "cd ${ROOT}/apps/finance && ${PNPM} run start:prod"
  restart_if_down 4011 "${PNPM} --filter analytics-service run start:dev"
  restart_if_down 3000 "${PNPM} --filter frontend run dev"
}

phase_smoke() {
  log "smoke W24"
  pnpm run test:contracts 2>&1 | tail -6 | tee -a "$LOG" || true
  npx tsx scripts/double-bom-smoke.ts 2>&1 | tee -a "$LOG" || true
  npx tsx scripts/long-lead-smoke.ts 2>&1 | tee -a "$LOG" || true
  npx tsx scripts/master-regression-report.ts 2>&1 | tail -10 | tee -a "$LOG" || true
}

main() {
  log "========== WARSTWA 24 PIPELINE START =========="
  phase_prisma
  phase_build
  phase_services
  phase_smoke || true
  log "========== WARSTWA 24 PIPELINE END =========="
}

main "$@"
