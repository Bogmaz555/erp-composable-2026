#!/usr/bin/env bash
# Production DB migration runner. Applies committed Prisma migrations per service
# (database-per-service). Falls back to `db push` when a service has no migrations
# directory yet (dev/pilot schemas). Idempotent and safe to run in CI/CD before rollout.
#
# Usage:
#   bash scripts/prisma-migrate-deploy.sh            # all services
#   bash scripts/prisma-migrate-deploy.sh inv-service proc-service
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ALL_SERVICES=(
  inv-service proc-service quality-service finance hr tax-legal
  pm-service mes-service plm-service analytics-service eam-service crm-service
)

TARGETS=("$@")
if [ ${#TARGETS[@]} -eq 0 ]; then
  TARGETS=("${ALL_SERVICES[@]}")
fi

FAILED=()

for svc in "${TARGETS[@]}"; do
  SCHEMA="apps/${svc}/prisma/schema.prisma"
  if [ ! -f "$SCHEMA" ]; then
    echo "SKIP ${svc}: no schema at ${SCHEMA}"
    continue
  fi

  echo "=== ${svc} ==="
  if [ -d "apps/${svc}/prisma/migrations" ]; then
    echo "[${svc}] prisma migrate deploy"
    npx --yes prisma migrate deploy --schema "$SCHEMA" || FAILED+=("$svc")
  else
    echo "[${svc}] no migrations dir — prisma db push (pilot schema)"
    npx --yes prisma@5.22.0 db push --schema "$SCHEMA" || FAILED+=("$svc")
    npx --yes prisma@5.22.0 generate --schema "$SCHEMA" || true
  fi
done

if [ ${#FAILED[@]} -gt 0 ]; then
  echo "MIGRATE FAILED for: ${FAILED[*]}"
  exit 1
fi

echo "=== Prisma migrate/deploy complete ==="
