#!/usr/bin/env bash
# W62 FINAL — Faza 8 Data Trust (W59–W60)
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT" && source scripts/erp-env.sh
LOG="${ROOT}/.agents/swarm/warstwa62-faza8-final.log"
mkdir -p "$(dirname "$LOG")"
log() { echo "[$(date -Iseconds)] $*" | tee -a "$LOG"; }

log "W62 FAZA8 FINAL START"
fuser -k 4011/tcp 4010/tcp 2>/dev/null || true; sleep 2
nohup bash -c "${PNPM} --filter analytics-service run start:dev" >> /tmp/erp-w62-4011.log 2>&1 &
sleep 18
bash scripts/ensure-core-stack.sh 2>&1 | tail -4 | tee -a "$LOG" || true
bash scripts/ensure-finance-prod.sh restart 2>&1 | tail -3 | tee -a "$LOG" || true
for i in $(seq 1 20); do
  code=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4011/platform/data-integrity/readiness 2>/dev/null || echo 0)
  [[ "$code" =~ ^[23] ]] && break
  sleep 2
done
pnpm run test:contracts 2>&1 | tail -6 | tee -a "$LOG" || true
npx tsx scripts/data-integrity-readiness-smoke.ts 2>&1 | tee -a "$LOG" || true
npx tsx scripts/import-readiness-smoke.ts 2>&1 | tee -a "$LOG" || true
npx tsx scripts/faza8-data-trust-final-smoke.ts 2>&1 | tee -a "$LOG" || true
npx tsx scripts/master-regression-report.ts 2>&1 | tail -10 | tee -a "$LOG" || true
log "W62 FAZA8 FINAL END"
