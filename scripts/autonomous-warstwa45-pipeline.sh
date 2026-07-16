#!/usr/bin/env bash
# W45 — Tax-Legal readiness (KSeF / JPK aggregate, TD-005)
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT" && source scripts/erp-env.sh
LOG="${ROOT}/.agents/swarm/warstwa45-pipeline.log"
mkdir -p "$(dirname "$LOG")"
log() { echo "[$(date -Iseconds)] $*" | tee -a "$LOG"; }

log "W45 START"
fuser -k 4011/tcp 2>/dev/null || true; sleep 2
nohup bash -c "${PNPM} --filter analytics-service run start:dev" >> /tmp/erp-w45-4011.log 2>&1 &
sleep 18
bash scripts/boot-regression-pipeline.sh 2>&1 | tail -12 | tee -a "$LOG" || true
pnpm run test:contracts 2>&1 | tail -5 | tee -a "$LOG" || true
npx tsx scripts/tax-readiness-smoke.ts 2>&1 | tee -a "$LOG" || true
npx tsx scripts/production-readiness-smoke.ts 2>&1 | tee -a "$LOG" || true
npx tsx scripts/master-regression-report.ts 2>&1 | tail -8 | tee -a "$LOG" || true
log "W45 END"
