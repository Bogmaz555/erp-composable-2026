#!/usr/bin/env bash
# W142 FINAL — Faza 28 K8s Extended + Tenant Hardening + KSeF Prod (W139–W141) + Faza 27 aggregate
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT" && source scripts/erp-env.sh
LOG="${ROOT}/.agents/swarm/warstwa142-faza28-final.log"
mkdir -p "$(dirname "$LOG")"
log() { echo "[$(date -Iseconds)] $*" | tee -a "$LOG"; }

log "W142 FAZA28 FINAL START"
bash scripts/ensure-databases.sh analytics-service 2>&1 | tail -3 | tee -a "$LOG" || true
fuser -k 4011/tcp 4010/tcp 4007/tcp 4015/tcp 2>/dev/null || true; sleep 2
nohup bash -c "${PNPM} --filter analytics-service run start:dev" >> /tmp/erp-w142-4011.log 2>&1 &
nohup bash -c "${PNPM} --filter plm-service run start:dev" >> /tmp/erp-w142-plm.log 2>&1 &
sleep 20
bash scripts/ensure-core-stack.sh 2>&1 | tail -4 | tee -a "$LOG" || true
bash scripts/ensure-finance-prod.sh restart 2>&1 | tail -3 | tee -a "$LOG" || true
bash scripts/ensure-k8s-extended-ready.sh 2>&1 | tail -3 | tee -a "$LOG" || true
bash scripts/ensure-tenant-hardening-ready.sh 2>&1 | tail -3 | tee -a "$LOG" || true
bash scripts/ensure-ksef-prod-ready.sh 2>&1 | tail -3 | tee -a "$LOG" || true
for i in $(seq 1 25); do
  a=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4011/platform/k8s-extended/readiness 2>/dev/null || echo 0)
  p=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4007/health 2>/dev/null || echo 0)
  [[ "$a" =~ ^[23] && "$p" =~ ^[23] ]] && break
  sleep 2
done
pnpm run test:contracts 2>&1 | tail -6 | tee -a "$LOG" || true
npx tsx scripts/k8s-extended-readiness-smoke.ts 2>&1 | tee -a "$LOG" || true
npx tsx scripts/tenant-hardening-readiness-smoke.ts 2>&1 | tee -a "$LOG" || true
npx tsx scripts/ksef-prod-readiness-smoke.ts 2>&1 | tee -a "$LOG" || true
CI_K8S_EXTENDED=true npx tsx scripts/ci-k8s-extended-probe.ts 2>&1 | tee -a "$LOG" || true
CI_TENANT_HARDENING=true npx tsx scripts/ci-tenant-hardening-probe.ts 2>&1 | tee -a "$LOG" || true
CI_KSEF_PROD=true npx tsx scripts/ci-ksef-prod-probe.ts 2>&1 | tee -a "$LOG" || true
npx tsx scripts/faza28-k8s-tenant-ksef-final-smoke.ts 2>&1 | tee -a "$LOG" || true
npx tsx scripts/master-regression-report.ts 2>&1 | tail -10 | tee -a "$LOG" || true
log "W142 FAZA28 FINAL END"
