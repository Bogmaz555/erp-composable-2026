#!/usr/bin/env bash
# ERP 2026 — Warstwa 23: inkrementalna wartość APEX (bez rewolucji strukturalnej)
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
# shellcheck source=erp-env.sh
source "${ROOT}/scripts/erp-env.sh"
LOG="${ROOT}/.agents/swarm/warstwa23-pipeline.log"
PROGRESS="${ROOT}/.agents/swarm/progress-warstwa23.md"
SKIP_BOOT=false

for arg in "$@"; do
  case "$arg" in --skip-boot) SKIP_BOOT=true ;; esac
done

log() { echo "[$(date -Iseconds)] $*" | tee -a "$LOG"; }
mkdir -p "$(dirname "$LOG")" "$(dirname "$PROGRESS")"

phase_prisma() {
  for svc in proc-service finance; do
    [[ -f "${ROOT}/apps/${svc}/prisma/schema.prisma" ]] || continue
    (cd "${ROOT}/apps/${svc}" && "${PNPM}" exec prisma db push --skip-generate 2>&1 | tail -2) | tee -a "$LOG" || true
    (cd "${ROOT}/apps/${svc}" && "${PNPM}" exec prisma generate --schema=prisma/schema.prisma 2>&1 | tail -1) | tee -a "$LOG" || true
  done
}

service_health() {
  local port=$1 path=${2:-/health}
  curl -s -o /dev/null -w "%{http_code}" --max-time 3 "http://127.0.0.1:${port}${path}" 2>/dev/null || echo "000"
}

restart_if_down() {
  local port=$1 cmd=$2 health_path=${3:-/health}
  local code
  code=$(service_health "$port" "$health_path")
  if [[ ! "$code" =~ ^[23] ]]; then
    log "restart :${port}"
    fuser -k "${port}/tcp" 2>/dev/null || true
    sleep 1
    nohup bash -c "$cmd" >> "/tmp/erp-w23-${port}.log" 2>&1 &
    sleep 14
  fi
}

wait_gateway() {
  for _ in $(seq 1 20); do
    [[ "$(service_health 4005 /api/health)" =~ ^[23] ]] && return
    sleep 2
  done
}

phase_build() {
  log "nest-build-all (finance dist for :4010)"
  bash "${ROOT}/scripts/nest-build-all.sh" 2>&1 | tail -8 | tee -a "$LOG" || log "WARN nest-build-all"
}

phase_services() {
  if $SKIP_BOOT; then return; fi
  restart_if_down 4005 "${PNPM} --filter api-gateway run start:dev" /api/health
  wait_gateway
  restart_if_down 4004 "${PNPM} --filter proc-service run start:dev"
  restart_if_down 4010 "cd ${ROOT}/apps/finance && ${PNPM} run start:prod"
}

phase_smoke() {
  log "smoke W23"
  local fails=0
  pnpm run test:contracts 2>&1 | tail -6 | tee -a "$LOG" || ((fails++)) || true
  npx tsx scripts/long-lead-smoke.ts 2>&1 | tee -a "$LOG" || true
  npx tsx scripts/universal-journal-smoke.ts 2>&1 | tee -a "$LOG" || true
  npx tsx scripts/master-regression-report.ts 2>&1 | tail -8 | tee -a "$LOG" || ((fails++)) || true
  return $(( fails > 1 ? 1 : 0 ))
}

phase_report() {
  cat > "$PROGRESS" <<EOF
# Warstwa 23 — Inkrementalna wartość APEX

**Last run:** $(date -Iseconds)

| ID | Cel | Status |
|----|-----|--------|
| W23-M01 | Long-Lead Radar (PROC, bez nowego serwisu) | DONE |
| W23-M02 | Universal Journal lite (finance) | DONE |
| W23-M03 | assertEtoOperationalPayload + contract test | DONE |
| W23-M04 | .cursor/rules/erp-eto-incremental | DONE |
| W23-M05 | pipeline:warstwa23 | DONE |
EOF
}

main() {
  log "========== WARSTWA 23 PIPELINE START =========="
  phase_prisma
  phase_build
  phase_services
  phase_smoke || true
  phase_report
  log "========== WARSTWA 23 PIPELINE END =========="
}

main "$@"
