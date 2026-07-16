#!/usr/bin/env bash
# W54 FINAL — Faza 6 Domain Depth closure (W51–W53 aggregate)
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT" && source scripts/erp-env.sh
LOG="${ROOT}/.agents/swarm/warstwa54-domain-final-pipeline.log"
mkdir -p "$(dirname "$LOG")"
log() { echo "[$(date -Iseconds)] $*" | tee -a "$LOG"; }

log "W54 DOMAIN FINAL START"
fuser -k 4011/tcp 4006/tcp 4007/tcp 2>/dev/null || true; sleep 2
nohup bash -c "${PNPM} --filter plm-service run start:dev" >> /tmp/erp-w54-plm.log 2>&1 &
nohup bash -c "${PNPM} --filter mes-service run start:dev" >> /tmp/erp-w54-mes.log 2>&1 &
nohup bash -c "${PNPM} --filter analytics-service run start:dev" >> /tmp/erp-w54-4011.log 2>&1 &
sleep 22
bash scripts/ensure-core-stack.sh 2>&1 | tail -4 | tee -a "$LOG" || true
bash scripts/ensure-finance-prod.sh restart 2>&1 | tail -3 | tee -a "$LOG" || true
for i in $(seq 1 25); do
  plm=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4007/health 2>/dev/null || echo 0)
  mes=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4006/routing/aggregate 2>/dev/null || echo 0)
  fin=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4010/fin/health 2>/dev/null || echo 0)
  [[ "$plm" =~ ^[23] && "$mes" =~ ^[23] && "$fin" =~ ^[23] ]] && break
  sleep 2
done
pnpm run test:contracts 2>&1 | tail -6 | tee -a "$LOG" || true
npx tsx scripts/plm-domain-readiness-smoke.ts 2>&1 | tee -a "$LOG" || true
npx tsx scripts/mes-domain-readiness-smoke.ts 2>&1 | tee -a "$LOG" || true
npx tsx scripts/finance-domain-readiness-smoke.ts 2>&1 | tee -a "$LOG" || true
npx tsx scripts/domain-depth-final-smoke.ts 2>&1 | tee -a "$LOG" || true
npx tsx scripts/master-regression-report.ts 2>&1 | tail -10 | tee -a "$LOG" || true
log "W54 DOMAIN FINAL END — Faza 6 Domain Depth COMPLETE"
