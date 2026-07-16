#!/usr/bin/env bash
# W114 FINAL — Faza 21 SLO Burn Rate + Playwright Cross Chain + TLS Rotation (W111–W113) + Faza 20 aggregate
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT" && source scripts/erp-env.sh
LOG="${ROOT}/.agents/swarm/warstwa114-faza21-final.log"
mkdir -p "$(dirname "$LOG")"
log() { echo "[$(date -Iseconds)] $*" | tee -a "$LOG"; }

log "W114 FAZA21 FINAL START"
bash scripts/ensure-databases.sh analytics-service 2>&1 | tail -3 | tee -a "$LOG" || true
fuser -k 4011/tcp 4010/tcp 4007/tcp 2>/dev/null || true; sleep 2
nohup bash -c "${PNPM} --filter analytics-service run start:dev" >> /tmp/erp-w114-4011.log 2>&1 &
nohup bash -c "${PNPM} --filter plm-service run start:dev" >> /tmp/erp-w114-plm.log 2>&1 &
sleep 20
bash scripts/ensure-core-stack.sh 2>&1 | tail -4 | tee -a "$LOG" || true
bash scripts/ensure-finance-prod.sh restart 2>&1 | tail -3 | tee -a "$LOG" || true
bash scripts/ensure-tls-rotation-ready.sh 2>&1 | tail -3 | tee -a "$LOG" || true
for i in $(seq 1 25); do
  a=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4011/platform/slo-burn-rate/readiness 2>/dev/null || echo 0)
  p=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4007/health 2>/dev/null || echo 0)
  [[ "$a" =~ ^[23] && "$p" =~ ^[23] ]] && break
  sleep 2
done
pnpm run test:contracts 2>&1 | tail -6 | tee -a "$LOG" || true
npx tsx scripts/slo-burn-rate-readiness-smoke.ts 2>&1 | tee -a "$LOG" || true
npx tsx scripts/playwright-cross-chain-readiness-smoke.ts 2>&1 | tee -a "$LOG" || true
npx tsx scripts/tls-rotation-readiness-smoke.ts 2>&1 | tee -a "$LOG" || true
CI_SLO_BURN_RATE=true npx tsx scripts/ci-slo-burn-rate-probe.ts 2>&1 | tee -a "$LOG" || true
CI_PLAYWRIGHT_CROSS_CHAIN=true npx tsx scripts/ci-playwright-cross-chain-probe.ts 2>&1 | tee -a "$LOG" || true
CI_TLS_ROTATION=true npx tsx scripts/ci-tls-rotation-probe.ts 2>&1 | tee -a "$LOG" || true
npx tsx scripts/faza21-slo-chain-tls-final-smoke.ts 2>&1 | tee -a "$LOG" || true
npx tsx scripts/master-regression-report.ts 2>&1 | tail -10 | tee -a "$LOG" || true
log "W114 FAZA21 FINAL END"
