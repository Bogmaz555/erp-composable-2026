#!/usr/bin/env bash
# W130 FINAL — Faza 25 Prod Observability + Chain Matrix + Vault HA (W127–W129) + Faza 24 aggregate
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT" && source scripts/erp-env.sh
LOG="${ROOT}/.agents/swarm/warstwa130-faza25-final.log"
mkdir -p "$(dirname "$LOG")"
log() { echo "[$(date -Iseconds)] $*" | tee -a "$LOG"; }

log "W130 FAZA25 FINAL START"
bash scripts/ensure-databases.sh analytics-service 2>&1 | tail -3 | tee -a "$LOG" || true
fuser -k 4011/tcp 4010/tcp 4007/tcp 2>/dev/null || true; sleep 2
nohup bash -c "${PNPM} --filter analytics-service run start:dev" >> /tmp/erp-w130-4011.log 2>&1 &
nohup bash -c "${PNPM} --filter plm-service run start:dev" >> /tmp/erp-w130-plm.log 2>&1 &
sleep 20
bash scripts/ensure-core-stack.sh 2>&1 | tail -4 | tee -a "$LOG" || true
bash scripts/ensure-finance-prod.sh restart 2>&1 | tail -3 | tee -a "$LOG" || true
bash scripts/ensure-prod-observability-ready.sh 2>&1 | tail -3 | tee -a "$LOG" || true
bash scripts/ensure-vault-ha-ready.sh 2>&1 | tail -3 | tee -a "$LOG" || true
for i in $(seq 1 25); do
  a=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4011/platform/prod-observability/readiness 2>/dev/null || echo 0)
  p=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4007/health 2>/dev/null || echo 0)
  [[ "$a" =~ ^[23] && "$p" =~ ^[23] ]] && break
  sleep 2
done
pnpm run test:contracts 2>&1 | tail -6 | tee -a "$LOG" || true
npx tsx scripts/prod-observability-readiness-smoke.ts 2>&1 | tee -a "$LOG" || true
npx tsx scripts/playwright-chain-matrix-readiness-smoke.ts 2>&1 | tee -a "$LOG" || true
npx tsx scripts/vault-ha-readiness-smoke.ts 2>&1 | tee -a "$LOG" || true
CI_PROD_OBSERVABILITY=true npx tsx scripts/ci-prod-observability-probe.ts 2>&1 | tee -a "$LOG" || true
CI_PLAYWRIGHT_CHAIN_MATRIX=true npx tsx scripts/ci-playwright-chain-matrix-probe.ts 2>&1 | tee -a "$LOG" || true
CI_VAULT_HA=true npx tsx scripts/ci-vault-ha-probe.ts 2>&1 | tee -a "$LOG" || true
npx tsx scripts/faza25-prod-matrix-vaultha-final-smoke.ts 2>&1 | tee -a "$LOG" || true
npx tsx scripts/master-regression-report.ts 2>&1 | tail -10 | tee -a "$LOG" || true
log "W130 FAZA25 FINAL END"
