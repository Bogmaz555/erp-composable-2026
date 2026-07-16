#!/usr/bin/env bash
# W37 — Auth readiness (TD-001 → 🟡)
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT" && source scripts/erp-env.sh
LOG="${ROOT}/.agents/swarm/warstwa37-pipeline.log"
mkdir -p "$(dirname "$LOG")"
log() { echo "[$(date -Iseconds)] $*" | tee -a "$LOG"; }

service_health() {
  curl -s -o /dev/null -w "%{http_code}" --max-time 3 "http://127.0.0.1:$1${2:-/health}" 2>/dev/null || echo "000"
}

log "W37 START"
if [[ ! "$(service_health 4011 /health)" =~ ^[23] ]]; then
  fuser -k 4011/tcp 2>/dev/null || true; sleep 2
  nohup bash -c "${PNPM} --filter analytics-service run start:dev" >> /tmp/erp-w37-4011.log 2>&1 &
  sleep 18
fi
if [[ ! "$(service_health 4005 /api/health)" =~ ^[23] ]]; then
  fuser -k 4005/tcp 2>/dev/null || true; sleep 1
  nohup bash -c "${PNPM} --filter api-gateway run start:dev" >> /tmp/erp-w37-gw.log 2>&1 &
  sleep 14
fi
bash scripts/nest-build-all.sh 2>&1 | tail -3 | tee -a "$LOG" || true
pnpm run test:contracts 2>&1 | tail -5 | tee -a "$LOG" || true
npx tsx scripts/auth-readiness-smoke.ts 2>&1 | tee -a "$LOG" || true
npx tsx scripts/auth-enforce-smoke.ts 2>&1 | tee -a "$LOG" || true
npx tsx scripts/master-regression-report.ts 2>&1 | tail -8 | tee -a "$LOG" || true
log "W37 END"
