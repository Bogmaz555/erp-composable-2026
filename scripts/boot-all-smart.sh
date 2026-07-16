#!/usr/bin/env bash
# ERP 2026 — Smart boot (TD-011): ulimit, FRONTEND_PORT auto, skip if stack up
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
# shellcheck source=erp-env.sh
source "${ROOT}/scripts/erp-env.sh"

ulimit -n 65536 2>/dev/null || ulimit -n 8192 2>/dev/null || true

export FRONTEND_PORT="${FRONTEND_PORT:-$(bash "${ROOT}/scripts/resolve-frontend-port.sh")}"
echo "$FRONTEND_PORT" > /tmp/erp-frontend.port
export FRONTEND_URL="http://127.0.0.1:${FRONTEND_PORT}"

if curl -sf --max-time 3 "http://127.0.0.1:4005/api/health" >/dev/null 2>&1; then
  echo "[boot-smart] stack already running (gateway OK) — frontend port ${FRONTEND_PORT}"
  echo "[boot-smart] FRONTEND_URL=${FRONTEND_URL}"
  exit 0
fi

echo "[boot-smart] ERP_AUTH_ENFORCE=${ERP_AUTH_ENFORCE:-false} FRONTEND_PORT=${FRONTEND_PORT}"

bash "${ROOT}/scripts/ensure-databases.sh" proc-service pm-service finance inv-service hr eam-service 2>&1 | tail -4 || true

if [[ "${ERP_AUTH_ENFORCE:-false}" == "true" ]]; then
  bash "${ROOT}/scripts/ensure-keycloak-ready.sh" 2>&1 | tail -4 || true
  bash "${ROOT}/scripts/fix-keycloak-demo-users.sh" 2>&1 | tail -2 || true
  bash "${ROOT}/scripts/ensure-finance-prod.sh" build 2>&1 | tail -2 || true
  echo "[boot-smart] starting boot:all:auth"
  exec env FRONTEND_PORT="${FRONTEND_PORT}" "${PNPM}" run boot:all:auth
fi

bash "${ROOT}/scripts/ensure-finance-prod.sh" build 2>&1 | tail -2 || true
echo "[boot-smart] starting boot:all (open dev mode) FRONTEND_PORT=${FRONTEND_PORT}"
exec env FRONTEND_PORT="${FRONTEND_PORT}" "${PNPM}" run boot:all
