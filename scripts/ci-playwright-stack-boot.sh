#!/usr/bin/env bash
# W84 — minimal stack boot for Playwright PM BI in CI (SKIP-safe)
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT" && source scripts/erp-env.sh

echo "[ci-playwright-stack] boot minimal stack for PM BI e2e"

if ! command -v docker >/dev/null 2>&1; then
  echo "SKIP: docker unavailable"
  exit 0
fi

docker compose up -d pm-db analytics-db crm-db inv-db 2>/dev/null || true
sleep 8
bash scripts/ensure-databases.sh pm-service analytics-service crm-service inv-service 2>/dev/null || true
npm run seed || echo "WARN: Seed failed but continuing"

fuser -k 4005/tcp 4002/tcp 4011/tcp 3001/tcp 2>/dev/null || true
sleep 2

nohup bash -c "cd apps/api-gateway && npm run start:dev" >> /tmp/ci-pw-gw.log 2>&1 &
nohup bash -c "cd apps/pm-service && npm run start:dev" >> /tmp/ci-pw-pm.log 2>&1 &
nohup bash -c "cd apps/analytics-service && npm run start:dev" >> /tmp/ci-pw-analytics.log 2>&1 &
nohup bash -c "cd apps/frontend && PORT=3001 npm run dev" >> /tmp/ci-pw-fe.log 2>&1 &

for i in $(seq 1 60); do
  gw=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4005/api/health 2>/dev/null || true)
  fe=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/pm 2>/dev/null || true)
  pm=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4002/ 2>/dev/null || true)
  analytics=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4011/ 2>/dev/null || true)
  
  if [[ "$gw" =~ ^200 ]] && [[ "$fe" =~ ^200 ]] && [[ "$pm" =~ ^(200|404) ]] && [[ "$analytics" =~ ^(200|404) ]]; then
    break
  fi
  sleep 3
done

echo "[ci-playwright-stack] gateway=${gw:-0} frontend=${fe:-0} pm=${pm:-0} analytics=${analytics:-0}"
