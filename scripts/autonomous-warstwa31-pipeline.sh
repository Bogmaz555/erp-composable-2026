#!/usr/bin/env bash
# W31 — EAM IoT lite (BreakdownEvent persist + status API + UI strip)
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT" && source scripts/erp-env.sh
LOG="${ROOT}/.agents/swarm/warstwa31-pipeline.log"
mkdir -p "$(dirname "$LOG")"
log() { echo "[$(date -Iseconds)] $*" | tee -a "$LOG"; }

service_health() {
  curl -s -o /dev/null -w "%{http_code}" --max-time 3 "http://127.0.0.1:$1${2:-/health}" 2>/dev/null || echo "000"
}

restart_if_down() {
  local port=$1 cmd=$2 hp=${3:-/health}
  if [[ ! "$(service_health "$port" "$hp")" =~ ^[23] ]]; then
    log "restart :${port}"
    fuser -k "${port}/tcp" 2>/dev/null || true
    sleep 1
    nohup bash -c "$cmd" >> "/tmp/erp-w31-${port}.log" 2>&1 &
    sleep 14
  fi
}

log "W31 START"
(cd apps/eam-service && ${PNPM} exec prisma db push 2>&1 | tail -2) | tee -a "$LOG" || true
(cd apps/eam-service && ${PNPM} exec prisma generate --schema=prisma/schema.prisma 2>&1 | tail -1) | tee -a "$LOG" || true
bash scripts/nest-build-all.sh 2>&1 | tail -4 | tee -a "$LOG" || true
log "force restart eam :4009"
fuser -k 4009/tcp 2>/dev/null || true
sleep 2
nohup bash -c "${PNPM} --filter eam-service run start:dev" >> "/tmp/erp-w31-4009.log" 2>&1 &
sleep 18
restart_if_down 4005 "${PNPM} --filter api-gateway run start:dev" /api/health
pnpm run test:contracts 2>&1 | tail -4 | tee -a "$LOG" || true
npx tsx scripts/eam-iot-smoke.ts 2>&1 | tee -a "$LOG" || true
npx tsx scripts/master-regression-report.ts 2>&1 | tail -8 | tee -a "$LOG" || true
log "W31 END"
