#!/usr/bin/env bash
# Lightweight gate (no DB): core pilot services must ship a baseline migration folder.
# Usage: bash scripts/check-prisma-baselines.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CORE=(inv-service proc-service pm-service finance plm-service mes-service)
FAILED=()
for svc in "${CORE[@]}"; do
  mig="$ROOT/apps/${svc}/prisma/migrations"
  if [ ! -d "$mig" ]; then
    echo "FAIL ${svc}: no prisma/migrations"
    FAILED+=("$svc")
    continue
  fi
  if [ ! -f "$mig/migration_lock.toml" ]; then
    echo "FAIL ${svc}: missing migration_lock.toml"
    FAILED+=("$svc")
  fi
  found=false
  for d in "$mig"/*/; do
    [ -d "$d" ] || continue
    name="$(basename "$d")"
    case "$name" in
      *baseline*|*_init*|*init_*|0_init*|00000000000000*)
        if [ -f "${d}migration.sql" ] && [ -s "${d}migration.sql" ]; then
          found=true
          echo "OK   ${svc}: ${name} ($(wc -l < "${d}migration.sql") lines)"
        fi
        ;;
    esac
  done
  if [ "$found" = false ]; then
    echo "FAIL ${svc}: no non-empty baseline/init migration"
    FAILED+=("$svc")
  fi
done
if [ ${#FAILED[@]} -gt 0 ]; then
  echo "check-prisma-baselines FAILED: ${FAILED[*]}"
  exit 1
fi
echo "=== All core services have baseline migrations ==="
