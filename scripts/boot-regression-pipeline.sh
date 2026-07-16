#!/usr/bin/env bash
# W30 — boot stack + full regression (FE port auto-detect in master-regression-report.ts)
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT" && source scripts/erp-env.sh

service_health() {
  curl -s -o /dev/null -w "%{http_code}" --max-time 3 "http://127.0.0.1:$1${2:-/health}" 2>/dev/null || echo "000"
}

ensure_frontend() {
  if [[ -f /tmp/erp-frontend.port ]]; then
    export FRONTEND_URL="http://127.0.0.1:$(cat /tmp/erp-frontend.port)"
    return
  fi
  for port in 3003 3000 3001; do
    if [[ "$(service_health "$port" /)" =~ ^[23] ]]; then
      export FRONTEND_URL="http://127.0.0.1:${port}"
      echo "Frontend detected on :${port}"
      return
    fi
  done
  echo "Frontend not running — UI checks will be optional"
}

ensure_gateway() {
  if [[ ! "$(service_health 4005 /api/health)" =~ ^[23] ]]; then
    echo "Starting gateway..."
    nohup bash -c "${PNPM} --filter api-gateway run start:dev" >> /tmp/erp-reg-gw.log 2>&1 &
    sleep 12
  fi
}

ensure_frontend
ensure_gateway
bash "${ROOT}/scripts/ensure-core-stack.sh" 2>&1 | tail -6 || true
docker compose --profile otel up -d jaeger 2>/dev/null || true
pnpm run test:contracts
npx tsx scripts/hr-smoke.ts 2>/dev/null || true
npx tsx scripts/master-regression-report.ts
