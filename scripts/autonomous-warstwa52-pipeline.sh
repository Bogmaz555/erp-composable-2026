#!/usr/bin/env bash
# W52 — MES domain depth (routing aggregate, Faza 6)
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT" && source scripts/erp-env.sh
LOG="${ROOT}/.agents/swarm/warstwa52-pipeline.log"
mkdir -p "$(dirname "$LOG")"
log() { echo "[$(date -Iseconds)] $*" | tee -a "$LOG"; }

log "W52 START"
fuser -k 4011/tcp 4006/tcp 2>/dev/null || true; sleep 2
nohup bash -c "${PNPM} --filter mes-service run start:dev" >> /tmp/erp-w52-mes.log 2>&1 &
nohup bash -c "${PNPM} --filter analytics-service run start:dev" >> /tmp/erp-w52-4011.log 2>&1 &
sleep 20
bash scripts/ensure-core-stack.sh 2>&1 | tail -4 | tee -a "$LOG" || true
for i in $(seq 1 20); do
  code=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4006/routing/aggregate 2>/dev/null || echo 0)
  [[ "$code" =~ ^[23] ]] && break
  sleep 2
done
pnpm run test:contracts 2>&1 | tail -6 | tee -a "$LOG" || true
npx tsx scripts/mes-domain-readiness-smoke.ts 2>&1 | tee -a "$LOG" || true
npx tsx scripts/master-regression-report.ts 2>&1 | tail -8 | tee -a "$LOG" || true
log "W52 END"
