#!/usr/bin/env bash
# W118 FINAL — Faza 22 Grafana SLO Dashboard + Playwright PROC INV Quality + Vault Secrets (W115–W117) + Faza 21 aggregate
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT" && source scripts/erp-env.sh
LOG="${ROOT}/.agents/swarm/warstwa118-faza22-final.log"
mkdir -p "$(dirname "$LOG")"
log() { echo "[$(date -Iseconds)] $*" | tee -a "$LOG"; }

log "W118 FAZA22 FINAL START"
bash scripts/ensure-databases.sh analytics-service 2>&1 | tail -3 | tee -a "$LOG" || true
fuser -k 4011/tcp 4010/tcp 4007/tcp 2>/dev/null || true; sleep 2
nohup bash -c "${PNPM} --filter analytics-service run start:dev" >> /tmp/erp-w118-4011.log 2>&1 &
nohup bash -c "${PNPM} --filter plm-service run start:dev" >> /tmp/erp-w118-plm.log 2>&1 &
sleep 20
bash scripts/ensure-core-stack.sh 2>&1 | tail -4 | tee -a "$LOG" || true
bash scripts/ensure-finance-prod.sh restart 2>&1 | tail -3 | tee -a "$LOG" || true
bash scripts/ensure-vault-secrets-ready.sh 2>&1 | tail -3 | tee -a "$LOG" || true
for i in $(seq 1 25); do
  a=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4011/platform/grafana-slo-dashboard/readiness 2>/dev/null || echo 0)
  p=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4007/health 2>/dev/null || echo 0)
  [[ "$a" =~ ^[23] && "$p" =~ ^[23] ]] && break
  sleep 2
done
pnpm run test:contracts 2>&1 | tail -6 | tee -a "$LOG" || true
npx tsx scripts/grafana-slo-dashboard-readiness-smoke.ts 2>&1 | tee -a "$LOG" || true
npx tsx scripts/playwright-proc-inv-quality-readiness-smoke.ts 2>&1 | tee -a "$LOG" || true
npx tsx scripts/vault-secrets-rotation-readiness-smoke.ts 2>&1 | tee -a "$LOG" || true
CI_GRAFANA_SLO_DASHBOARD=true npx tsx scripts/ci-grafana-slo-dashboard-probe.ts 2>&1 | tee -a "$LOG" || true
CI_PLAYWRIGHT_PROC_INV_QUALITY=true npx tsx scripts/ci-playwright-proc-inv-quality-probe.ts 2>&1 | tee -a "$LOG" || true
CI_VAULT_SECRETS_ROTATION=true npx tsx scripts/ci-vault-secrets-rotation-probe.ts 2>&1 | tee -a "$LOG" || true
npx tsx scripts/faza22-slo-proc-vault-final-smoke.ts 2>&1 | tee -a "$LOG" || true
npx tsx scripts/master-regression-report.ts 2>&1 | tail -10 | tee -a "$LOG" || true
log "W118 FAZA22 FINAL END"
