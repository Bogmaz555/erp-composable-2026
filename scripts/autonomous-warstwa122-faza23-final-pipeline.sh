#!/usr/bin/env bash
# W122 FINAL — Faza 23 SLO Alerting + Playwright MES EAM CRM + Vault KMS Unseal (W119–W121) + Faza 22 aggregate
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT" && source scripts/erp-env.sh
LOG="${ROOT}/.agents/swarm/warstwa122-faza23-final.log"
mkdir -p "$(dirname "$LOG")"
log() { echo "[$(date -Iseconds)] $*" | tee -a "$LOG"; }

log "W122 FAZA23 FINAL START"
bash scripts/ensure-databases.sh analytics-service 2>&1 | tail -3 | tee -a "$LOG" || true
fuser -k 4011/tcp 4010/tcp 4007/tcp 2>/dev/null || true; sleep 2
nohup bash -c "${PNPM} --filter analytics-service run start:dev" >> /tmp/erp-w122-4011.log 2>&1 &
nohup bash -c "${PNPM} --filter plm-service run start:dev" >> /tmp/erp-w122-plm.log 2>&1 &
sleep 20
bash scripts/ensure-core-stack.sh 2>&1 | tail -4 | tee -a "$LOG" || true
bash scripts/ensure-finance-prod.sh restart 2>&1 | tail -3 | tee -a "$LOG" || true
bash scripts/ensure-vault-kms-unseal-ready.sh 2>&1 | tail -3 | tee -a "$LOG" || true
for i in $(seq 1 25); do
  a=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4011/platform/slo-alerting/readiness 2>/dev/null || echo 0)
  p=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4007/health 2>/dev/null || echo 0)
  [[ "$a" =~ ^[23] && "$p" =~ ^[23] ]] && break
  sleep 2
done
pnpm run test:contracts 2>&1 | tail -6 | tee -a "$LOG" || true
npx tsx scripts/slo-alerting-readiness-smoke.ts 2>&1 | tee -a "$LOG" || true
npx tsx scripts/playwright-mes-eam-crm-readiness-smoke.ts 2>&1 | tee -a "$LOG" || true
npx tsx scripts/vault-kms-unseal-readiness-smoke.ts 2>&1 | tee -a "$LOG" || true
CI_SLO_ALERTING=true npx tsx scripts/ci-slo-alerting-probe.ts 2>&1 | tee -a "$LOG" || true
CI_PLAYWRIGHT_MES_EAM_CRM=true npx tsx scripts/ci-playwright-mes-eam-crm-probe.ts 2>&1 | tee -a "$LOG" || true
CI_VAULT_KMS_UNSEAL=true npx tsx scripts/ci-vault-kms-unseal-probe.ts 2>&1 | tee -a "$LOG" || true
npx tsx scripts/faza23-slo-mes-vault-final-smoke.ts 2>&1 | tee -a "$LOG" || true
npx tsx scripts/master-regression-report.ts 2>&1 | tail -10 | tee -a "$LOG" || true
log "W122 FAZA23 FINAL END"
