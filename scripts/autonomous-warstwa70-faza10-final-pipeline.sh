#!/usr/bin/env bash
# W70 FINAL — Faza 10 BI Read Models + CI Auth + Persistent Import (W67–W69) + Faza 9 aggregate
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT" && source scripts/erp-env.sh
LOG="${ROOT}/.agents/swarm/warstwa70-faza10-final.log"
mkdir -p "$(dirname "$LOG")"
log() { echo "[$(date -Iseconds)] $*" | tee -a "$LOG"; }

log "W70 FAZA10 FINAL START"
bash scripts/ensure-databases.sh analytics-service 2>&1 | tail -3 | tee -a "$LOG" || true
cd apps/analytics-service && npx prisma@5.22.0 db push --schema=prisma/schema.prisma 2>&1 | tail -4 | tee -a "$LOG" || true
cd "$ROOT" && npx prisma@5.22.0 generate --schema=apps/analytics-service/prisma/schema.prisma 2>&1 | tail -3 | tee -a "$LOG" || true
fuser -k 4011/tcp 4010/tcp 4007/tcp 2>/dev/null || true; sleep 2
nohup bash -c "${PNPM} --filter analytics-service run start:dev" >> /tmp/erp-w70-4011.log 2>&1 &
nohup bash -c "${PNPM} --filter plm-service run start:dev" >> /tmp/erp-w70-plm.log 2>&1 &
sleep 20
bash scripts/ensure-core-stack.sh 2>&1 | tail -4 | tee -a "$LOG" || true
bash scripts/ensure-finance-prod.sh restart 2>&1 | tail -3 | tee -a "$LOG" || true
for i in $(seq 1 25); do
  a=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4011/platform/bi-readiness/readiness 2>/dev/null || echo 0)
  p=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4007/health 2>/dev/null || echo 0)
  [[ "$a" =~ ^[23] && "$p" =~ ^[23] ]] && break
  sleep 2
done
pnpm run test:contracts 2>&1 | tail -6 | tee -a "$LOG" || true
npx tsx scripts/bi-readiness-smoke.ts 2>&1 | tee -a "$LOG" || true
npx tsx scripts/ci-auth-readiness-smoke.ts 2>&1 | tee -a "$LOG" || true
npx tsx scripts/import-staging-persistence-smoke.ts 2>&1 | tee -a "$LOG" || true
npx tsx scripts/faza10-bi-final-smoke.ts 2>&1 | tee -a "$LOG" || true
npx tsx scripts/master-regression-report.ts 2>&1 | tail -10 | tee -a "$LOG" || true
log "W70 FAZA10 FINAL END"
