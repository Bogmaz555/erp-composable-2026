#!/usr/bin/env bash
# W94 FINAL — Faza 16 Grafana Provision + Playwright Matrix + Auth Enforce Prod (W91–W93) + Faza 15 aggregate
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT" && source scripts/erp-env.sh
LOG="${ROOT}/.agents/swarm/warstwa94-faza16-final.log"
mkdir -p "$(dirname "$LOG")"
log() { echo "[$(date -Iseconds)] $*" | tee -a "$LOG"; }

log "W94 FAZA16 FINAL START"
bash scripts/ensure-databases.sh analytics-service 2>&1 | tail -3 | tee -a "$LOG" || true
fuser -k 4011/tcp 4010/tcp 4007/tcp 2>/dev/null || true; sleep 2
nohup bash -c "${PNPM} --filter analytics-service run start:dev" >> /tmp/erp-w94-4011.log 2>&1 &
nohup bash -c "${PNPM} --filter plm-service run start:dev" >> /tmp/erp-w94-plm.log 2>&1 &
sleep 20
bash scripts/ensure-core-stack.sh 2>&1 | tail -4 | tee -a "$LOG" || true
bash scripts/ensure-finance-prod.sh restart 2>&1 | tail -3 | tee -a "$LOG" || true
for i in $(seq 1 25); do
  a=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4011/platform/grafana-provision/readiness 2>/dev/null || echo 0)
  p=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4007/health 2>/dev/null || echo 0)
  [[ "$a" =~ ^[23] && "$p" =~ ^[23] ]] && break
  sleep 2
done
pnpm run test:contracts 2>&1 | tail -6 | tee -a "$LOG" || true
npx tsx scripts/grafana-provision-readiness-smoke.ts 2>&1 | tee -a "$LOG" || true
npx tsx scripts/playwright-matrix-readiness-smoke.ts 2>&1 | tee -a "$LOG" || true
npx tsx scripts/ci-auth-enforce-prod-readiness-smoke.ts 2>&1 | tee -a "$LOG" || true
CI_GRAFANA_PROVISION=true npx tsx scripts/ci-grafana-provision-probe.ts 2>&1 | tee -a "$LOG" || true
CI_PLAYWRIGHT_MATRIX=true npx tsx scripts/ci-playwright-matrix-probe.ts 2>&1 | tee -a "$LOG" || true
CI_AUTH_ENFORCE_PROD=true npx tsx scripts/ci-auth-enforce-prod-probe.ts 2>&1 | tee -a "$LOG" || true
npx tsx scripts/faza16-observability-ci-prod-final-smoke.ts 2>&1 | tee -a "$LOG" || true
npx tsx scripts/master-regression-report.ts 2>&1 | tail -10 | tee -a "$LOG" || true
log "W94 FAZA16 FINAL END"
