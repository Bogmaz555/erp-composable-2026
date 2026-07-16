#!/usr/bin/env bash
# W138 FINAL — Faza 27 Helm + Visual Diff + Quality/EAM Prod (W135–W137) + Faza 26 aggregate
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT" && source scripts/erp-env.sh
LOG="${ROOT}/.agents/swarm/warstwa138-faza27-final.log"
mkdir -p "$(dirname "$LOG")"
log() { echo "[$(date -Iseconds)] $*" | tee -a "$LOG"; }

log "W138 FAZA27 FINAL START"
bash scripts/ensure-databases.sh analytics-service quality-service eam-service 2>&1 | tail -3 | tee -a "$LOG" || true
fuser -k 4011/tcp 4010/tcp 4007/tcp 4008/tcp 4009/tcp 2>/dev/null || true; sleep 2
nohup bash -c "${PNPM} --filter analytics-service run start:dev" >> /tmp/erp-w138-4011.log 2>&1 &
nohup bash -c "${PNPM} --filter plm-service run start:dev" >> /tmp/erp-w138-plm.log 2>&1 &
sleep 20
bash scripts/ensure-core-stack.sh 2>&1 | tail -4 | tee -a "$LOG" || true
bash scripts/ensure-finance-prod.sh restart 2>&1 | tail -3 | tee -a "$LOG" || true
bash scripts/ensure-helm-deploy-ready.sh 2>&1 | tail -3 | tee -a "$LOG" || true
bash scripts/ensure-quality-eam-prod-ready.sh 2>&1 | tail -3 | tee -a "$LOG" || true
for i in $(seq 1 25); do
  a=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4011/platform/helm-deploy/readiness 2>/dev/null || echo 0)
  p=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4007/health 2>/dev/null || echo 0)
  [[ "$a" =~ ^[23] && "$p" =~ ^[23] ]] && break
  sleep 2
done
pnpm run test:contracts 2>&1 | tail -6 | tee -a "$LOG" || true
npx tsx scripts/helm-deploy-readiness-smoke.ts 2>&1 | tee -a "$LOG" || true
npx tsx scripts/playwright-visual-diff-readiness-smoke.ts 2>&1 | tee -a "$LOG" || true
npx tsx scripts/quality-eam-prod-readiness-smoke.ts 2>&1 | tee -a "$LOG" || true
CI_HELM_DEPLOY=true npx tsx scripts/ci-helm-deploy-probe.ts 2>&1 | tee -a "$LOG" || true
CI_PLAYWRIGHT_VISUAL_DIFF=true npx tsx scripts/ci-playwright-visual-diff-probe.ts 2>&1 | tee -a "$LOG" || true
CI_QUALITY_EAM_PROD=true npx tsx scripts/ci-quality-eam-prod-probe.ts 2>&1 | tee -a "$LOG" || true
npx tsx scripts/faza27-helm-visualdiff-qualityeam-final-smoke.ts 2>&1 | tee -a "$LOG" || true
npx tsx scripts/master-regression-report.ts 2>&1 | tail -10 | tee -a "$LOG" || true
log "W138 FAZA27 FINAL END"
