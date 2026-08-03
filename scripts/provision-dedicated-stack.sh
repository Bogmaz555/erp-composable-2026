#!/usr/bin/env bash
# Provision a dedicated-stack tenant clone (namespaced compose project).
# Usage: TENANT=acme bash scripts/provision-dedicated-stack.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
TENANT="${TENANT:-pilot}"
PROJECT="erp-${TENANT}"
echo "[provision] project=$PROJECT (DEDICATED_STACK clone)"

if ! command -v docker >/dev/null; then
  echo "FAIL: docker required"
  exit 1
fi

export COMPOSE_PROJECT_NAME="$PROJECT"
docker compose up -d nats redis keycloak \
  crm-db pm-db inv-db proc-db fin-db quality-db eam-db plm-db tax-db hr-db analytics-db \
  2>&1 | tail -15

echo "[provision] DBs starting. Next:"
echo "  COMPOSE_PROJECT_NAME=$PROJECT bash scripts/ensure-databases.sh"
echo "  Set service DATABASE_URL hosts to ${PROJECT} network / published ports."
echo "  AUTH_ENFORCE=true USE_KEYCLOAK_JWKS=true MEILI_MASTER_KEY=... pnpm run boot:enterprise"
echo "[provision] Done scaffold for tenant=$TENANT"
