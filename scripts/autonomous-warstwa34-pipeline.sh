#!/usr/bin/env bash
# W34 — Observability stack (OTel + Outbox DLQ routing fix + dynamic required)
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT" && source scripts/erp-env.sh
LOG="${ROOT}/.agents/swarm/warstwa34-pipeline.log"
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
    nohup bash -c "$cmd" >> "/tmp/erp-w34-${port}.log" 2>&1 &
    sleep 16
  fi
}

log "W34 START"
docker compose --profile otel up -d jaeger 2>&1 | tail -2 | tee -a "$LOG" || true
bash scripts/nest-build-all.sh 2>&1 | tail -4 | tee -a "$LOG" || true
log "force restart analytics :4011"
fuser -k 4011/tcp 2>/dev/null || true
sleep 2
nohup bash -c "${PNPM} --filter analytics-service run start:dev" >> "/tmp/erp-w34-4011.log" 2>&1 &
sleep 18
restart_if_down 4005 "${PNPM} --filter api-gateway run start:dev" /api/health
pnpm run test:contracts 2>&1 | tail -4 | tee -a "$LOG" || true
npx tsx scripts/otel-smoke.ts 2>&1 | tee -a "$LOG" || true
npx tsx scripts/outbox-dlq-smoke.ts 2>&1 | tee -a "$LOG" || true
npx tsx scripts/observability-readiness-smoke.ts 2>&1 | tee -a "$LOG" || true
npx tsx scripts/master-regression-report.ts 2>&1 | tail -8 | tee -a "$LOG" || true
log "W34 END"
