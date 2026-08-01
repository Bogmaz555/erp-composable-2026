#!/usr/bin/env bash
# Lightweight gate (no DB): core pilot services must ship a baseline migration folder.
#
# Usage:
#   bash scripts/check-prisma-baselines.sh
#   pnpm run db:check:baselines
#
# Scope: ONLY the core six (inv, proc, pm, finance, plm, mes).
# Non-core services (quality, hr, tax-legal, crm, eam, analytics, …) are intentionally
# NOT checked — they may still be thin/outbox-only or push-only.
#
# Related: PILOT=1 on prisma-migrate-deploy.sh with no args fails non-core BY DESIGN
# (pilot purity). For pilot deploy use the scoped package script:
#   pnpm run db:migrate:deploy:pilot
# See docs/PRISMA-MIGRATIONS.md ("Unscoped PILOT=1 fails non-core by design").
#
# CI: wired in .github/workflows/erp-ci.yml (contracts job).
set -euo pipefail

if [ "${1:-}" = "-h" ] || [ "${1:-}" = "--help" ]; then
  sed -n '2,18p' "$0" | sed 's/^# \{0,1\}//'
  exit 0
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CORE=(inv-service proc-service pm-service finance plm-service mes-service)
echo "check-prisma-baselines: core only (${CORE[*]})"
echo "  (non-core not required; unscoped PILOT=1 fails them by design — use db:migrate:deploy:pilot)"
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
