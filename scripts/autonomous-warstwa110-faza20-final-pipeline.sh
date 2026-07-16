#!/usr/bin/env bash
# W110 FINAL — Faza 20 Alert Oncall + Playwright HR/PLM + mTLS Client Verify (W107–W109) + Faza 19 aggregate
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT" && source scripts/erp-env.sh
LOG="${ROOT}/.agents/swarm/warstwa110-faza20-final.log"
mkdir -p "$(dirname "$LOG")"
log() { echo "[$(date -Iseconds)] $*" | tee -a "$LOG"; }

log "W110 FAZA20 FINAL START"
bash scripts/ensure-databases.sh analytics-service 2>&1 | tail -3 | tee -a "$LOG" || true
fuser -k 4011/tcp 4010/tcp 4007/tcp 2>/dev/null || true; sleep 2
nohup bash -c "${PNPM} --filter analytics-service run start:dev" >> /tmp/erp-w110-4011.log 2>&1 &
nohup bash -c "${PNPM} --filter plm-service run start:dev" >> /tmp/erp-w110-plm.log 2>&1 &
sleep 20
bash scripts/ensure-core-stack.sh 2>&1 | tail -4 | tee -a "$LOG" || true
bash scripts/ensure-finance-prod.sh restart 2>&1 | tail -3 | tee -a "$LOG" || true
bash scripts/ensure-mtls-gateway-ready.sh 2>&1 | tail -3 | tee -a "$LOG" || true
for i in $(seq 1 25); do
  a=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4011/platform/alert-oncall/readiness 2>/dev/null || echo 0)
  p=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4007/health 2>/dev/null || echo 0)
  [[ "$a" =~ ^[23] && "$p" =~ ^[23] ]] && break
  sleep 2
done
pnpm run test:contracts 2>&1 | tail -6 | tee -a "$LOG" || true
npx tsx scripts/alert-oncall-readiness-smoke.ts 2>&1 | tee -a "$LOG" || true
npx tsx scripts/playwright-matrix-readiness-smoke.ts 2>&1 | tee -a "$LOG" || true
npx tsx scripts/mtls-client-verify-readiness-smoke.ts 2>&1 | tee -a "$LOG" || true
CI_ALERT_ONCALL=true npx tsx scripts/ci-alert-oncall-probe.ts 2>&1 | tee -a "$LOG" || true
CI_PLAYWRIGHT_MATRIX=true npx tsx scripts/ci-playwright-matrix-probe.ts 2>&1 | tee -a "$LOG" || true
CI_MTLS_CLIENT_VERIFY=true npx tsx scripts/ci-mtls-client-verify-probe.ts 2>&1 | tee -a "$LOG" || true
npx tsx scripts/faza20-oncall-matrix-clientverify-final-smoke.ts 2>&1 | tee -a "$LOG" || true
npx tsx scripts/master-regression-report.ts 2>&1 | tail -10 | tee -a "$LOG" || true
log "W110 FAZA20 FINAL END"
