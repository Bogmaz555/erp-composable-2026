#!/usr/bin/env bash
# W90 FINAL — Faza 15 Grafana BI + Playwright Required + Auth Keycloak (W87–W89) + Faza 14 aggregate
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT" && source scripts/erp-env.sh
LOG="${ROOT}/.agents/swarm/warstwa90-faza15-final.log"
mkdir -p "$(dirname "$LOG")"
log() { echo "[$(date -Iseconds)] $*" | tee -a "$LOG"; }

log "W90 FAZA15 FINAL START"
bash scripts/ensure-databases.sh analytics-service 2>&1 | tail -3 | tee -a "$LOG" || true
fuser -k 4011/tcp 4010/tcp 4007/tcp 2>/dev/null || true; sleep 2
nohup bash -c "${PNPM} --filter analytics-service run start:dev" >> /tmp/erp-w90-4011.log 2>&1 &
nohup bash -c "${PNPM} --filter plm-service run start:dev" >> /tmp/erp-w90-plm.log 2>&1 &
sleep 20
bash scripts/ensure-core-stack.sh 2>&1 | tail -4 | tee -a "$LOG" || true
bash scripts/ensure-finance-prod.sh restart 2>&1 | tail -3 | tee -a "$LOG" || true
for i in $(seq 1 25); do
  a=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4011/platform/grafana-bi/readiness 2>/dev/null || echo 0)
  p=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4007/health 2>/dev/null || echo 0)
  [[ "$a" =~ ^[23] && "$p" =~ ^[23] ]] && break
  sleep 2
done
pnpm run test:contracts 2>&1 | tail -6 | tee -a "$LOG" || true
npx tsx scripts/grafana-bi-readiness-smoke.ts 2>&1 | tee -a "$LOG" || true
npx tsx scripts/playwright-required-readiness-smoke.ts 2>&1 | tee -a "$LOG" || true
npx tsx scripts/ci-auth-keycloak-readiness-smoke.ts 2>&1 | tee -a "$LOG" || true
CI_PLAYWRIGHT_REQUIRED=true npx tsx scripts/ci-playwright-required-probe.ts 2>&1 | tee -a "$LOG" || true
CI_AUTH_ENFORCE_KEYCLOAK=true npx tsx scripts/ci-auth-keycloak-regression-probe.ts 2>&1 | tee -a "$LOG" || true
npx tsx scripts/faza15-grafana-ci-hardening-final-smoke.ts 2>&1 | tee -a "$LOG" || true
npx tsx scripts/master-regression-report.ts 2>&1 | tail -10 | tee -a "$LOG" || true
log "W90 FAZA15 FINAL END"
