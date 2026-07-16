#!/usr/bin/env bash
# W58 FINAL — Faza 7 Extended Domain Depth (W55–W57 + W51–W53 aggregate)
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT" && source scripts/erp-env.sh
LOG="${ROOT}/.agents/swarm/warstwa58-extended-domain-final.log"
mkdir -p "$(dirname "$LOG")"
log() { echo "[$(date -Iseconds)] $*" | tee -a "$LOG"; }

log "W58 EXTENDED DOMAIN FINAL START"
fuser -k 4011/tcp 4004/tcp 4006/tcp 4007/tcp 4008/tcp 4009/tcp 2>/dev/null || true; sleep 2
nohup bash -c "${PNPM} --filter plm-service run start:dev" >> /tmp/erp-w58-plm.log 2>&1 &
nohup bash -c "${PNPM} --filter mes-service run start:dev" >> /tmp/erp-w58-mes.log 2>&1 &
nohup bash -c "${PNPM} --filter quality-service run start:dev" >> /tmp/erp-w58-quality.log 2>&1 &
nohup bash -c "${PNPM} --filter proc-service run start:dev" >> /tmp/erp-w58-proc.log 2>&1 &
nohup bash -c "${PNPM} --filter eam-service run start:dev" >> /tmp/erp-w58-eam.log 2>&1 &
nohup bash -c "${PNPM} --filter analytics-service run start:dev" >> /tmp/erp-w58-4011.log 2>&1 &
sleep 25
bash scripts/ensure-core-stack.sh 2>&1 | tail -4 | tee -a "$LOG" || true
bash scripts/ensure-finance-prod.sh restart 2>&1 | tail -3 | tee -a "$LOG" || true
for i in $(seq 1 30); do
  q=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4008/capa/aggregate 2>/dev/null || echo 0)
  p=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4004/mrp/aggregate 2>/dev/null || echo 0)
  e=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4009/eam/maintenance/aggregate 2>/dev/null || echo 0)
  [[ "$q" =~ ^[23] && "$p" =~ ^[23] && "$e" =~ ^[23] ]] && break
  sleep 2
done
pnpm run test:contracts 2>&1 | tail -6 | tee -a "$LOG" || true
npx tsx scripts/quality-domain-readiness-smoke.ts 2>&1 | tee -a "$LOG" || true
npx tsx scripts/proc-domain-readiness-smoke.ts 2>&1 | tee -a "$LOG" || true
npx tsx scripts/eam-domain-readiness-smoke.ts 2>&1 | tee -a "$LOG" || true
npx tsx scripts/extended-domain-final-smoke.ts 2>&1 | tee -a "$LOG" || true
npx tsx scripts/master-regression-report.ts 2>&1 | tail -10 | tee -a "$LOG" || true
log "W58 EXTENDED DOMAIN FINAL END — Faza 7 COMPLETE"
