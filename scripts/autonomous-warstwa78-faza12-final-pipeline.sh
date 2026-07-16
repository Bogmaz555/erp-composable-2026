#!/usr/bin/env bash
# W78 FINAL — Faza 12 BI Scheduler + PM E2E + CI Auth Enforce (W75–W77) + Faza 11 aggregate
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT" && source scripts/erp-env.sh
LOG="${ROOT}/.agents/swarm/warstwa78-faza12-final.log"
mkdir -p "$(dirname "$LOG")"
log() { echo "[$(date -Iseconds)] $*" | tee -a "$LOG"; }

log "W78 FAZA12 FINAL START"
bash scripts/ensure-databases.sh analytics-service 2>&1 | tail -3 | tee -a "$LOG" || true
cd apps/analytics-service && npx prisma@5.22.0 db push --schema=prisma/schema.prisma 2>&1 | tail -4 | tee -a "$LOG" || true
cd "$ROOT" && npx prisma@5.22.0 generate --schema=apps/analytics-service/prisma/schema.prisma 2>&1 | tail -3 | tee -a "$LOG" || true
fuser -k 4011/tcp 4010/tcp 4007/tcp 2>/dev/null || true; sleep 2
nohup bash -c "${PNPM} --filter analytics-service run start:dev" >> /tmp/erp-w78-4011.log 2>&1 &
nohup bash -c "${PNPM} --filter plm-service run start:dev" >> /tmp/erp-w78-plm.log 2>&1 &
sleep 20
bash scripts/ensure-core-stack.sh 2>&1 | tail -4 | tee -a "$LOG" || true
bash scripts/ensure-finance-prod.sh restart 2>&1 | tail -3 | tee -a "$LOG" || true
for i in $(seq 1 25); do
  a=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4011/platform/bi-scheduler/readiness 2>/dev/null || echo 0)
  p=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4007/health 2>/dev/null || echo 0)
  [[ "$a" =~ ^[23] && "$p" =~ ^[23] ]] && break
  sleep 2
done
pnpm run test:contracts 2>&1 | tail -6 | tee -a "$LOG" || true
npx tsx scripts/bi-scheduler-readiness-smoke.ts 2>&1 | tee -a "$LOG" || true
npx tsx scripts/pm-e2e-readiness-smoke.ts 2>&1 | tee -a "$LOG" || true
npx tsx scripts/ci-auth-enforce-readiness-smoke.ts 2>&1 | tee -a "$LOG" || true
CI_AUTH_ENFORCE=true npx tsx scripts/ci-auth-enforce-probe.ts 2>&1 | tee -a "$LOG" || true
npx tsx scripts/faza12-scheduler-ci-final-smoke.ts 2>&1 | tee -a "$LOG" || true
npx tsx scripts/master-regression-report.ts 2>&1 | tail -10 | tee -a "$LOG" || true
log "W78 FAZA12 FINAL END"
