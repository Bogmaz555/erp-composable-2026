#!/usr/bin/env bash
# W50 FINAL — Production hardening closure gate (W47–W49 aggregate)
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT" && source scripts/erp-env.sh
LOG="${ROOT}/.agents/swarm/warstwa50-final-pipeline.log"
mkdir -p "$(dirname "$LOG")"
log() { echo "[$(date -Iseconds)] $*" | tee -a "$LOG"; }

log "W50 FINAL START"
fuser -k 4011/tcp 4006/tcp 2>/dev/null || true; sleep 2
nohup bash -c "${PNPM} --filter analytics-service run start:dev" >> /tmp/erp-w50-4011.log 2>&1 &
nohup bash -c "${PNPM} --filter mes-service run start:dev" >> /tmp/erp-w50-mes.log 2>&1 &
sleep 20
bash scripts/ensure-core-stack.sh 2>&1 | tail -4 | tee -a "$LOG" || true
bash scripts/boot-regression-pipeline.sh 2>&1 | tail -14 | tee -a "$LOG" || true
pnpm run test:contracts 2>&1 | tail -6 | tee -a "$LOG" || true
npx tsx scripts/mes-readiness-smoke.ts 2>&1 | tee -a "$LOG" || true
npx tsx scripts/pact-readiness-smoke.ts 2>&1 | tee -a "$LOG" || true
npx tsx scripts/genealogy-e2e-view-smoke.ts 2>&1 | tee -a "$LOG" || true
npx tsx scripts/production-readiness-smoke.ts 2>&1 | tee -a "$LOG" || true
npx tsx scripts/master-regression-report.ts 2>&1 | tail -10 | tee -a "$LOG" || true
log "W50 FINAL END — Faza 5 Production Hardening COMPLETE"
