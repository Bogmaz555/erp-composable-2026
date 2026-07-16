#!/usr/bin/env bash
# W44 — Ensure core ERP microservices for regression / stack readiness (TD-011)
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
# shellcheck source=erp-env.sh
source "${ROOT}/scripts/erp-env.sh"

service_health() {
  curl -s -o /dev/null -w "%{http_code}" --max-time 3 "$1" 2>/dev/null || echo "000"
}

ensure_service() {
  local url=$1 label=$2 filter=$3 port=$4
  local code
  code=$(service_health "$url")
  if [[ "$code" =~ ^[23] ]]; then
    return 0
  fi
  echo "[core-stack] Starting ${label} (:${port})..."
  fuser -k "${port}/tcp" 2>/dev/null || true
  sleep 1
  nohup bash -c "${PNPM} --filter ${filter} run start:dev" >> "/tmp/erp-core-${label}.log" 2>&1 &
  sleep 14
}

ensure_gateway() {
  local code
  code=$(service_health "http://127.0.0.1:4005/api/health")
  if [[ ! "$code" =~ ^[23] ]]; then
    echo "[core-stack] Starting gateway..."
    fuser -k 4005/tcp 2>/dev/null || true
    sleep 1
    nohup bash -c "${PNPM} --filter api-gateway run start:dev" >> /tmp/erp-core-gateway.log 2>&1 &
    sleep 12
  fi
}

ensure_frontend() {
  export FRONTEND_PORT="${FRONTEND_PORT:-$(bash "${ROOT}/scripts/resolve-frontend-port.sh")}"
  echo "$FRONTEND_PORT" > /tmp/erp-frontend.port
  local code
  code=$(service_health "http://127.0.0.1:${FRONTEND_PORT}/")
  if [[ "$code" =~ ^[23] ]]; then
    return 0
  fi
  echo "[core-stack] Starting frontend on :${FRONTEND_PORT}..."
  fuser -k "${FRONTEND_PORT}/tcp" 2>/dev/null || true
  sleep 1
  nohup bash -c "FRONTEND_PORT=${FRONTEND_PORT} ${PNPM} run start:frontend" >> /tmp/erp-core-frontend.log 2>&1 &
  sleep 18
}

ensure_gateway
ensure_service "http://127.0.0.1:4001/health" CRM crm-service 4001
ensure_service "http://127.0.0.1:4002/health" PM pm-service 4002
ensure_service "http://127.0.0.1:4003/health" INV inv-service 4003
ensure_service "http://127.0.0.1:4004/health" PROC proc-service 4004
if [[ ! "$(service_health "http://127.0.0.1:4006/health")" =~ ^[23] ]]; then
  echo "[core-stack] Starting MES (:4006)..."
  fuser -k 4006/tcp 2>/dev/null || true
  sleep 1
  (cd "${ROOT}/apps/mes-service" && npx nest build >/dev/null 2>&1 || true)
  nohup bash -c "cd ${ROOT}/apps/mes-service && node dist/mes-service/src/main" >> /tmp/erp-core-MES.log 2>&1 &
  sleep 14
fi
ensure_service "http://127.0.0.1:4007/health" PLM plm-service 4007
ensure_service "http://127.0.0.1:4008/health" QUALITY quality-service 4008
ensure_service "http://127.0.0.1:4009/health" EAM eam-service 4009
ensure_service "http://127.0.0.1:4011/health" ANALYTICS analytics-service 4011
ensure_service "http://127.0.0.1:4012/hr/health" HR @erp/hr 4012
ensure_service "http://127.0.0.1:4015/tax-legal/health" TAX tax-legal 4015
bash "${ROOT}/scripts/ensure-finance-prod.sh" start 2>/dev/null || true
ensure_frontend

echo "[core-stack] done"
