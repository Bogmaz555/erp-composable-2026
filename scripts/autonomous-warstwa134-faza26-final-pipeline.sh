#!/usr/bin/env bash
# W134 FINAL — Faza 26 K8s Deploy + Playwright Visual + Vault Raft (W131–W133) + Faza 25 aggregate
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT" && source scripts/erp-env.sh
LOG="${ROOT}/.agents/swarm/warstwa134-faza26-final.log"
mkdir -p "$(dirname "$LOG")"
log() { echo "[$(date -Iseconds)] $*" | tee -a "$LOG"; }

log "W134 FAZA26 FINAL START"
bash scripts/ensure-databases.sh analytics-service 2>&1 | tail -3 | tee -a "$LOG" || true
fuser -k 4011/tcp 4010/tcp 4007/tcp 2>/dev/null || true; sleep 2
nohup bash -c "${PNPM} --filter analytics-service run start:dev" >> /tmp/erp-w134-4011.log 2>&1 &
nohup bash -c "${PNPM} --filter plm-service run start:dev" >> /tmp/erp-w134-plm.log 2>&1 &
sleep 20
bash scripts/ensure-core-stack.sh 2>&1 | tail -4 | tee -a "$LOG" || true
bash scripts/ensure-finance-prod.sh restart 2>&1 | tail -3 | tee -a "$LOG" || true
bash scripts/ensure-k8s-deploy-ready.sh 2>&1 | tail -3 | tee -a "$LOG" || true
bash scripts/ensure-vault-raft-ready.sh 2>&1 | tail -3 | tee -a "$LOG" || true
for i in $(seq 1 25); do
  a=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4011/platform/k8s-deploy/readiness 2>/dev/null || echo 0)
  p=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4007/health 2>/dev/null || echo 0)
  [[ "$a" =~ ^[23] && "$p" =~ ^[23] ]] && break
  sleep 2
done
pnpm run test:contracts 2>&1 | tail -6 | tee -a "$LOG" || true
npx tsx scripts/k8s-deploy-readiness-smoke.ts 2>&1 | tee -a "$LOG" || true
npx tsx scripts/playwright-visual-readiness-smoke.ts 2>&1 | tee -a "$LOG" || true
npx tsx scripts/vault-raft-readiness-smoke.ts 2>&1 | tee -a "$LOG" || true
CI_K8S_DEPLOY=true npx tsx scripts/ci-k8s-deploy-probe.ts 2>&1 | tee -a "$LOG" || true
CI_PLAYWRIGHT_VISUAL=true npx tsx scripts/ci-playwright-visual-probe.ts 2>&1 | tee -a "$LOG" || true
CI_VAULT_RAFT=true npx tsx scripts/ci-vault-raft-probe.ts 2>&1 | tee -a "$LOG" || true
npx tsx scripts/faza26-k8s-visual-raft-final-smoke.ts 2>&1 | tee -a "$LOG" || true
npx tsx scripts/master-regression-report.ts 2>&1 | tail -10 | tee -a "$LOG" || true
log "W134 FAZA26 FINAL END"
