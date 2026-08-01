#!/usr/bin/env bash
# Production DB migration runner. Applies committed Prisma migrations per service
# (database-per-service). Falls back to `db push` when a service has no migrations
# directory yet (dev/pilot schemas). Idempotent and safe to run in CI/CD before rollout.
#
# Thin/outbox-only migration trees (no baseline/init migration) are not a full schema
# history. For those services we:
#   1) `db push` — materialize full schema from schema.prisma (empty DB safe)
#   2) `migrate deploy` — apply additive outbox SQL + record migration history
# Once a true baseline/*init* migration exists, deploy uses migrate deploy only.
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

# True when migrations/ has only thin history (no baseline/init migration dir).
# Thin trees must not skip db push on empty DBs — ALTER-only SQL would fail.
is_thin_only_migrations() {
  local mig_root="$1"
  local d name
  local any=false
  for d in "$mig_root"/*/; do
    [ -d "$d" ] || continue
    any=true
    name="$(basename "$d")"
    case "$name" in
      *baseline*|*_init*|*init_*|0_init*|00000000000000*)
        return 1
        ;;
    esac
  done
  # empty migrations dir → treat as no real history
  [ "$any" = true ]
}

for svc in "${TARGETS[@]}"; do
  SCHEMA="apps/${svc}/prisma/schema.prisma"
  if [ ! -f "$SCHEMA" ]; then
    echo "SKIP ${svc}: no schema at ${SCHEMA}"
    continue
  fi

  echo "=== ${svc} ==="
  MIG_DIR="apps/${svc}/prisma/migrations"
  if [ -d "$MIG_DIR" ]; then
    if is_thin_only_migrations "$MIG_DIR"; then
      echo "[${svc}] thin/outbox-only migrations — prisma db push (full schema) then migrate deploy"
      npx --yes prisma@5.22.0 db push --schema "$SCHEMA" || FAILED+=("$svc")
      npx --yes prisma@5.22.0 generate --schema "$SCHEMA" || true
      npx --yes prisma migrate deploy --schema "$SCHEMA" || FAILED+=("$svc")
    else
      echo "[${svc}] prisma migrate deploy (baseline present)"
      npx --yes prisma migrate deploy --schema "$SCHEMA" || FAILED+=("$svc")
    fi
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
