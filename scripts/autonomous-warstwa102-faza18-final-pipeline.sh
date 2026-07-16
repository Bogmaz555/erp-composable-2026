#!/usr/bin/env bash
# W102 FINAL — Faza 18 Alert Notify + Playwright MES/EAM + mTLS Gateway (W99–W101) + Faza 17 aggregate
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT" && source scripts/erp-env.sh
LOG="${ROOT}/.agents/swarm/warstwa102-faza18-final.log"
mkdir -p "$(dirname "$LOG")"
log() { echo "[$(date -Iseconds)] $*" | tee -a "$LOG"; }

log "W102 FAZA18 FINAL START"
bash scripts/ensure-databases.sh analytics-service 2>&1 | tail -3 | tee -a "$LOG" || true
fuser -k 4011/tcp 4010/tcp 4007/tcp 2>/dev/null || true; sleep 2
nohup bash -c "${PNPM} --filter analytics-service run start:dev" >> /tmp/erp-w102-4011.log 2>&1 &
nohup bash -c "${PNPM} --filter plm-service run start:dev" >> /tmp/erp-w102-plm.log 2>&1 &
sleep 20
bash scripts/ensure-core-stack.sh 2>&1 | tail -4 | tee -a "$LOG" || true
bash scripts/ensure-finance-prod.sh restart 2>&1 | tail -3 | tee -a "$LOG" || true
bash scripts/ensure-mtls-gateway-ready.sh 2>&1 | tail -3 | tee -a "$LOG" || true
for i in $(seq 1 25); do
  a=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4011/platform/alert-notify/readiness 2>/dev/null || echo 0)
  p=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4007/health 2>/dev/null || echo 0)
  [[ "$a" =~ ^[23] && "$p" =~ ^[23] ]] && break
  sleep 2
done
pnpm run test:contracts 2>&1 | tail -6 | tee -a "$LOG" || true
npx tsx scripts/alert-notify-readiness-smoke.ts 2>&1 | tee -a "$LOG" || true
npx tsx scripts/playwright-matrix-readiness-smoke.ts 2>&1 | tee -a "$LOG" || true
npx tsx scripts/mtls-gateway-readiness-smoke.ts 2>&1 | tee -a "$LOG" || true
CI_ALERT_NOTIFY=true npx tsx scripts/ci-alert-notify-probe.ts 2>&1 | tee -a "$LOG" || true
CI_PLAYWRIGHT_MATRIX=true npx tsx scripts/ci-playwright-matrix-probe.ts 2>&1 | tee -a "$LOG" || true
CI_MTLS_GATEWAY=true npx tsx scripts/ci-mtls-gateway-probe.ts 2>&1 | tee -a "$LOG" || true
npx tsx scripts/faza18-notify-matrix-mtls-final-smoke.ts 2>&1 | tee -a "$LOG" || true
npx tsx scripts/master-regression-report.ts 2>&1 | tail -10 | tee -a "$LOG" || true
log "W102 FAZA18 FINAL END"
