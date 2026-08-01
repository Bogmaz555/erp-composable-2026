#!/usr/bin/env bash
# Production DB migration runner. Applies committed Prisma migrations per service
# (database-per-service).
#
# Paths:
#   • baseline present → `prisma migrate deploy` only
#   • thin/outbox-only migrations (no baseline/init) →
#       1) `db push` (full schema from schema.prisma; empty-DB safe)
#       2) `migrate deploy` (record additive outbox SQL)
#   • no migrations dir → `db push` only (dev/non-pilot)
#
# PILOT=1 (pilot / prod-like):
#   • FORBIDS pure push-only success (no migrations dir)
#   • FORBIDS thin push+deploy fallback — core services must have a baseline
#   • After migrate deploy, verifies schema has no drift vs schema.prisma
#   • Prefer empty DB bootstrap via migrate deploy (baselines from migrate diff)
#
# Existing DBs created via historical `db push`:
#   See docs/PRISMA-MIGRATIONS.md — backup, parity check, then
#   `prisma migrate resolve --applied <migration_name>` for each folder.
#
# Usage:
#   bash scripts/prisma-migrate-deploy.sh            # all services
#   bash scripts/prisma-migrate-deploy.sh inv-service proc-service
#   PILOT=1 bash scripts/prisma-migrate-deploy.sh inv-service proc-service pm-service finance plm-service mes-service
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PRISMA_VERSION="${PRISMA_VERSION:-5.22.0}"
PRISMA=(npx --yes "prisma@${PRISMA_VERSION}")
PILOT="${PILOT:-0}"

ALL_SERVICES=(
  inv-service proc-service quality-service finance hr tax-legal
  pm-service mes-service plm-service analytics-service eam-service crm-service
)

# Core pilot set with full baseline migrations (PR 10)
CORE_BASELINE_SERVICES=(
  inv-service proc-service pm-service finance plm-service mes-service
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

# True when a baseline/init-style migration directory exists.
has_baseline_migration() {
  local mig_root="$1"
  local d name
  for d in "$mig_root"/*/; do
    [ -d "$d" ] || continue
    name="$(basename "$d")"
    case "$name" in
      *baseline*|*_init*|*init_*|0_init*|00000000000000*)
        return 0
        ;;
    esac
  done
  return 1
}

# After deploy: fail if live DB drifts from schema.prisma (requires DATABASE_URL env for service).
verify_schema_in_sync() {
  local svc="$1"
  local schema="$2"
  local rc
  echo "[${svc}] PILOT schema verify (migrate diff datamodel ↔ datasource)"
  # prisma migrate diff --exit-code: 0 = in sync, 2 = drift, 1 = error
  "${PRISMA[@]}" migrate diff \
    --from-schema-datamodel "$schema" \
    --to-schema-datasource "$schema" \
    --exit-code \
    --script >/dev/null 2>&1
  rc=$?
  if [ "$rc" -eq 0 ]; then
    echo "[${svc}] schema in sync"
    return 0
  fi
  if [ "$rc" -eq 2 ]; then
    echo "[${svc}] ERROR: schema drift after migrate (PILOT=1 requires parity with schema.prisma)"
    echo "  Run: npx prisma@${PRISMA_VERSION} migrate diff --from-schema-datamodel ${schema} --to-schema-datasource ${schema} --script"
    return 1
  fi
  echo "[${svc}] WARN: schema verify could not run (rc=${rc}; missing DB URL or connectivity). Treating as failure under PILOT=1."
  return 1
}

if [ "$PILOT" = "1" ]; then
  echo "=== PILOT=1: migrate deploy only (no silent push-only; baselines required for empty DBs) ==="
fi

for svc in "${TARGETS[@]}"; do
  SCHEMA="apps/${svc}/prisma/schema.prisma"
  if [ ! -f "$SCHEMA" ]; then
    echo "SKIP ${svc}: no schema at ${SCHEMA}"
    continue
  fi

  echo "=== ${svc} ==="
  MIG_DIR="apps/${svc}/prisma/migrations"
  if [ -d "$MIG_DIR" ]; then
    if has_baseline_migration "$MIG_DIR"; then
      echo "[${svc}] prisma migrate deploy (baseline present)"
      if ! "${PRISMA[@]}" migrate deploy --schema "$SCHEMA"; then
        FAILED+=("$svc")
        continue
      fi
      if [ "$PILOT" = "1" ]; then
        if ! verify_schema_in_sync "$svc" "$SCHEMA"; then
          FAILED+=("$svc")
        fi
      fi
    elif is_thin_only_migrations "$MIG_DIR"; then
      if [ "$PILOT" = "1" ]; then
        echo "[${svc}] ERROR: PILOT=1 forbids thin/outbox-only push fallback."
        echo "  Add a baseline migration (prisma migrate diff --from-empty) or run without PILOT=1."
        echo "  Core baselines exist for: ${CORE_BASELINE_SERVICES[*]}"
        echo "  Existing DBs: docs/PRISMA-MIGRATIONS.md (migrate resolve --applied)."
        FAILED+=("$svc")
        continue
      fi
      echo "[${svc}] thin/outbox-only migrations — prisma db push (full schema) then migrate deploy"
      if ! "${PRISMA[@]}" db push --schema "$SCHEMA"; then
        FAILED+=("$svc")
        continue
      fi
      "${PRISMA[@]}" generate --schema "$SCHEMA" || true
      if ! "${PRISMA[@]}" migrate deploy --schema "$SCHEMA"; then
        FAILED+=("$svc")
      fi
    else
      # migrations dir exists but empty / unrecognized — treat like thin for non-pilot
      if [ "$PILOT" = "1" ]; then
        echo "[${svc}] ERROR: PILOT=1 requires a baseline or non-empty migration history"
        FAILED+=("$svc")
        continue
      fi
      echo "[${svc}] empty migrations dir — prisma db push (pilot schema)"
      if ! "${PRISMA[@]}" db push --schema "$SCHEMA"; then
        FAILED+=("$svc")
      else
        "${PRISMA[@]}" generate --schema "$SCHEMA" || true
      fi
    fi
  else
    if [ "$PILOT" = "1" ]; then
      echo "[${svc}] ERROR: PILOT=1 forbids pure db push (no prisma/migrations)."
      echo "  Create migrations (baseline via migrate diff) before pilot deploy."
      echo "  See docs/PRISMA-MIGRATIONS.md"
      FAILED+=("$svc")
      continue
    fi
    echo "[${svc}] no migrations dir — prisma db push (dev schema)"
    if ! "${PRISMA[@]}" db push --schema "$SCHEMA"; then
      FAILED+=("$svc")
    else
      "${PRISMA[@]}" generate --schema "$SCHEMA" || true
    fi
  fi
done

if [ ${#FAILED[@]} -gt 0 ]; then
  echo "MIGRATE FAILED for: ${FAILED[*]}"
  exit 1
fi

echo "=== Prisma migrate/deploy complete ==="
if [ "$PILOT" = "1" ]; then
  echo "=== PILOT=1: all targeted services used migrate deploy (no push-only) ==="
fi
