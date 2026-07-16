#!/usr/bin/env bash
# W38 — Boot dev UX (TD-011 → 🟡)
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT" && source scripts/erp-env.sh
LOG="${ROOT}/.agents/swarm/warstwa38-pipeline.log"
mkdir -p "$(dirname "$LOG")"
log() { echo "[$(date -Iseconds)] $*" | tee -a "$LOG"; }

service_health() {
  curl -s -o /dev/null -w "%{http_code}" --max-time 3 "http://127.0.0.1:$1${2:-/health}" 2>/dev/null || echo "000"
}

log "W38 START"
chmod +x scripts/resolve-frontend-port.sh scripts/boot-all-smart.sh
PORT=$(bash scripts/resolve-frontend-port.sh)
echo "$PORT" > /tmp/erp-frontend.port
log "FRONTEND_PORT=$PORT"
if [[ ! "$(service_health 4011 /health)" =~ ^[23] ]]; then
  fuser -k 4011/tcp 2>/dev/null || true; sleep 2
  nohup bash -c "${PNPM} --filter analytics-service run start:dev" >> /tmp/erp-w38-4011.log 2>&1 &
  sleep 18
fi
bash scripts/boot-regression-pipeline.sh 2>&1 | tail -10 | tee -a "$LOG" || true
pnpm run test:contracts 2>&1 | tail -5 | tee -a "$LOG" || true
npx tsx scripts/boot-readiness-smoke.ts 2>&1 | tee -a "$LOG" || true
npx tsx scripts/master-regression-report.ts 2>&1 | tail -8 | tee -a "$LOG" || true
log "W38 END"
