#!/usr/bin/env bash
# W126 FINAL — Faza 24 SLO Routing + Playwright HR PLM PM + Vault Audit (W123–W125) + Faza 23 aggregate
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT" && source scripts/erp-env.sh
LOG="${ROOT}/.agents/swarm/warstwa126-faza24-final.log"
mkdir -p "$(dirname "$LOG")"
log() { echo "[$(date -Iseconds)] $*" | tee -a "$LOG"; }

log "W126 FAZA24 FINAL START"
bash scripts/ensure-databases.sh analytics-service 2>&1 | tail -3 | tee -a "$LOG" || true
fuser -k 4011/tcp 4010/tcp 4007/tcp 2>/dev/null || true; sleep 2
nohup bash -c "${PNPM} --filter analytics-service run start:dev" >> /tmp/erp-w126-4011.log 2>&1 &
nohup bash -c "${PNPM} --filter plm-service run start:dev" >> /tmp/erp-w126-plm.log 2>&1 &
sleep 20
bash scripts/ensure-core-stack.sh 2>&1 | tail -4 | tee -a "$LOG" || true
bash scripts/ensure-finance-prod.sh restart 2>&1 | tail -3 | tee -a "$LOG" || true
bash scripts/ensure-vault-audit-ready.sh 2>&1 | tail -3 | tee -a "$LOG" || true
for i in $(seq 1 25); do
  a=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4011/platform/slo-routing/readiness 2>/dev/null || echo 0)
  p=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4007/health 2>/dev/null || echo 0)
  [[ "$a" =~ ^[23] && "$p" =~ ^[23] ]] && break
  sleep 2
done
pnpm run test:contracts 2>&1 | tail -6 | tee -a "$LOG" || true
npx tsx scripts/slo-routing-readiness-smoke.ts 2>&1 | tee -a "$LOG" || true
npx tsx scripts/playwright-hr-plm-pm-readiness-smoke.ts 2>&1 | tee -a "$LOG" || true
npx tsx scripts/vault-audit-readiness-smoke.ts 2>&1 | tee -a "$LOG" || true
CI_SLO_ROUTING=true npx tsx scripts/ci-slo-routing-probe.ts 2>&1 | tee -a "$LOG" || true
CI_PLAYWRIGHT_HR_PLM_PM=true npx tsx scripts/ci-playwright-hr-plm-pm-probe.ts 2>&1 | tee -a "$LOG" || true
CI_VAULT_AUDIT=true npx tsx scripts/ci-vault-audit-probe.ts 2>&1 | tee -a "$LOG" || true
npx tsx scripts/faza24-routing-hr-vault-final-smoke.ts 2>&1 | tee -a "$LOG" || true
npx tsx scripts/master-regression-report.ts 2>&1 | tail -10 | tee -a "$LOG" || true
log "W126 FAZA24 FINAL END"
