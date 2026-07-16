#!/usr/bin/env bash
# W43 — ETO payload guard coverage (TD-004)
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT" && source scripts/erp-env.sh
LOG="${ROOT}/.agents/swarm/warstwa43-pipeline.log"
mkdir -p "$(dirname "$LOG")"
log() { echo "[$(date -Iseconds)] $*" | tee -a "$LOG"; }

log "W43 START"
bash scripts/nest-build-all.sh 2>&1 | tail -4 | tee -a "$LOG" || true
fuser -k 4011/tcp 2>/dev/null || true; sleep 2
nohup bash -c "${PNPM} --filter analytics-service run start:dev" >> /tmp/erp-w43-4011.log 2>&1 &
sleep 18
bash scripts/boot-regression-pipeline.sh 2>&1 | tail -8 | tee -a "$LOG" || true
pnpm run test:contracts 2>&1 | tail -5 | tee -a "$LOG" || true
npx tsx scripts/eto-payload-smoke.ts 2>&1 | tee -a "$LOG" || true
npx tsx scripts/production-readiness-smoke.ts 2>&1 | tee -a "$LOG" || true
npx tsx scripts/master-regression-report.ts 2>&1 | tail -8 | tee -a "$LOG" || true
log "W43 END"
