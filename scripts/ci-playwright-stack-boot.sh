#!/usr/bin/env bash
# Minimal stack boot for Playwright / Auth Enforce Live CI.
# Boots: NATS + DBs + gateway + pm + analytics + frontend(3001).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
# shellcheck source=/dev/null
source scripts/erp-env.sh 2>/dev/null || true
export PATH="${HOME}/.local/share/mise/installs/node/22/bin:${PATH:-}"

echo "[ci-playwright-stack] boot minimal stack for PM BI e2e"

if ! command -v docker >/dev/null 2>&1; then
  echo "SKIP: docker unavailable"
  exit 0
fi

# Explicit DB URLs (CI runners often lack a full .env)
export CRM_DATABASE_URL="${CRM_DATABASE_URL:-postgresql://erp_user:erp_password@localhost:5433/crm_db?schema=public}"
export PM_DATABASE_URL="${PM_DATABASE_URL:-postgresql://erp_user:erp_password@localhost:5434/pm_db?schema=public}"
export INVENTORY_DATABASE_URL="${INVENTORY_DATABASE_URL:-postgresql://erp_user:erp_password@localhost:5436/inv_db?schema=public}"
export INV_DATABASE_URL="${INV_DATABASE_URL:-$INVENTORY_DATABASE_URL}"
export ANALYTICS_DATABASE_URL="${ANALYTICS_DATABASE_URL:-postgresql://erp_user:erp_password@localhost:5445/analytics_db?schema=public}"
export DATABASE_URL="${DATABASE_URL:-$PM_DATABASE_URL}"
export NATS_URL="${NATS_URL:-nats://127.0.0.1:4222}"
export HOST="${HOST:-0.0.0.0}"
export DEFAULT_TENANT_ID="${DEFAULT_TENANT_ID:-default}"
export MEILI_MASTER_KEY="${MEILI_MASTER_KEY:-pilot-dev-meili-key-not-for-prod}"

docker compose up -d nats pm-db analytics-db crm-db inv-db 2>/dev/null || true
sleep 8
bash scripts/ensure-databases.sh pm-service analytics-service crm-service inv-service 2>/dev/null || true
npm run seed 2>/dev/null || pnpm run seed 2>/dev/null || echo "WARN: Seed failed but continuing"

fuser -k 4005/tcp 4002/tcp 4011/tcp 3001/tcp 2>/dev/null || true
sleep 2

# CI job may export AUTH_ENFORCE=true — force false for initial boot (auth-e2e restarts with true)
BOOT_AUTH=false
nohup bash -c "cd apps/api-gateway && export AUTH_ENFORCE=${BOOT_AUTH} USE_KEYCLOAK_JWKS=false HOST=0.0.0.0 NATS_URL=${NATS_URL} MEILI_MASTER_KEY=${MEILI_MASTER_KEY}; npm run start:dev" \
  >>/tmp/ci-pw-gw.log 2>&1 &
nohup bash -c "cd apps/pm-service && export AUTH_ENFORCE=${BOOT_AUTH} HOST=0.0.0.0 PM_DATABASE_URL='${PM_DATABASE_URL}' NATS_URL=${NATS_URL}; npm run start:dev" \
  >>/tmp/ci-pw-pm.log 2>&1 &
nohup bash -c "cd apps/analytics-service && export AUTH_ENFORCE=${BOOT_AUTH} HOST=0.0.0.0 ANALYTICS_DATABASE_URL='${ANALYTICS_DATABASE_URL}' DATABASE_URL='${ANALYTICS_DATABASE_URL}' NATS_URL=${NATS_URL} ANALYTICS_NATS_DISABLE=true; npm run start:dev" \
  >>/tmp/ci-pw-analytics.log 2>&1 &
nohup bash -c "cd apps/frontend && export PORT=3001 GATEWAY_INTERNAL_URL=http://127.0.0.1:4005; npm run dev -- -p 3001 -H 0.0.0.0" \
  >>/tmp/ci-pw-fe.log 2>&1 &

wait_http() {
  local url="$1" expect_re="${2:-^[23]}" tries="${3:-40}"
  local code
  for _ in $(seq 1 "$tries"); do
    code=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 3 "$url" 2>/dev/null || echo 000)
    if [[ "$code" =~ $expect_re ]]; then
      echo "$code"
      return 0
    fi
    sleep 3
  done
  echo "${code:-000}"
  return 1
}

gw=$(wait_http "http://127.0.0.1:4005/api/health" '200' 40 || true)
pm=$(wait_http "http://127.0.0.1:4002/health" '^[23]' 20 || wait_http "http://127.0.0.1:4002/" '^[234]' 5 || true)
analytics=$(wait_http "http://127.0.0.1:4011/health" '^[23]' 20 || wait_http "http://127.0.0.1:4011/" '^[234]' 5 || true)
fe=$(wait_http "http://127.0.0.1:3001/" '^[23]' 40 || true)

echo "[ci-playwright-stack] gateway=${gw:-0} frontend=${fe:-0} pm=${pm:-0} analytics=${analytics:-0}"

# Soft-ok: gateway is required for auth-e2e; others best-effort
if [[ ! "${gw:-0}" =~ ^200 ]]; then
  echo "[ci-playwright-stack] WARN: gateway not healthy — last log:"
  tail -40 /tmp/ci-pw-gw.log 2>/dev/null || true
  # Do not hard-fail here; auth-e2e will restart gateway and report clearly
fi

exit 0
