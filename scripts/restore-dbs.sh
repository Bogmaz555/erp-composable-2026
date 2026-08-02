#!/usr/bin/env bash
# Restore all ERP Compose databases from pg_dump custom-format dumps.
#
# Usage:
#   ./scripts/restore-dbs.sh <path_to_backup_directory>
#   Example: ./scripts/restore-dbs.sh ./backups/20260718_120000
#
# Exit codes:
#   0 — at least one DB restored, zero hard failures
#   1 — usage / missing dir / restore failure / container down for present dump
#
# Name parity: container_name values match docker-compose.yml (erp-*-db).
# pg_restore exit 1 (warnings, common with --clean) is treated as success;
# exit >= 2 is a hard failure.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

BACKUP_DIR="${1:-}"

if [[ -z "$BACKUP_DIR" ]]; then
  echo "Usage: $0 <path_to_backup_directory>" >&2
  echo "Example: $0 ./backups/20260718_120000" >&2
  exit 1
fi

if [[ ! -d "$BACKUP_DIR" ]]; then
  echo "ERROR: directory $BACKUP_DIR does not exist." >&2
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "ERROR: docker is required" >&2
  exit 1
fi

# compose_service|container_name|volume_key|dbname|dbuser
DB_ROWS=(
  "crm-db|erp-crm-db|crm_pgdata|crm_db|erp_user"
  "pm-db|erp-pm-db|pm_pgdata|pm_db|erp_user"
  "mfg-db|erp-mfg-db|mfg_pgdata|mfg_db|erp_user"
  "inv-db|erp-inv-db|inv_pgdata|inv_db|erp_user"
  "proc-db|erp-proc-db|proc_pgdata|proc_db|erp_user"
  "fin-db|erp-fin-db|fin_pgdata|fin_db|erp_user"
  "quality-db|erp-quality-db|quality_pgdata|quality_db|postgres"
  "eam-db|erp-eam-db|eam_pgdata|eam_db|postgres"
  "tax-db|erp-tax-db|tax_pgdata|tax_legal_db|erp_user"
  "hr-db|erp-hr-db|hr_pgdata|hr_db|erp_user"
  "plm-db|erp-plm-db|plm_pgdata|plm_db|postgres"
  "analytics-db|erp-analytics-db|analytics_pgdata|analytics_db|erp_user"
)

ok=0
failed=0
skipped_missing=0
dumps_present=0

echo "Starting restore of ERP databases from $BACKUP_DIR..."

for row in "${DB_ROWS[@]}"; do
  IFS='|' read -r _service container _volume dbname dbuser <<<"$row"
  dump_file="$BACKUP_DIR/${dbname}.dump"

  if [[ ! -f "$dump_file" ]]; then
    echo "Info: no dump for $dbname ($dump_file) — skip"
    skipped_missing=$((skipped_missing + 1))
    continue
  fi

  dumps_present=$((dumps_present + 1))

  if [[ -z "$(docker ps -q -f "name=^/${container}$")" ]]; then
    echo "ERROR: container $container is not running — cannot restore $dbname" >&2
    failed=$((failed + 1))
    continue
  fi

  if [[ ! -s "$dump_file" ]]; then
    echo "ERROR: empty dump file $dump_file" >&2
    failed=$((failed + 1))
    continue
  fi

  echo "Restoring $dbname into $container (user=$dbuser)..."
  set +e
  docker exec -i "$container" pg_restore -U "$dbuser" -d "$dbname" \
    --clean --if-exists --no-owner --no-acl <"$dump_file"
  rc=$?
  set -e

  # pg_restore: 0=ok, 1=warnings (often benign with --clean), >=2=fatal
  if [[ "$rc" -eq 0 || "$rc" -eq 1 ]]; then
    echo " -> Restored $dbname (pg_restore exit=$rc)"
    ok=$((ok + 1))
  else
    echo "ERROR: pg_restore failed for $dbname (exit=$rc)" >&2
    failed=$((failed + 1))
  fi
done

echo "----"
echo "Restore summary: ok=$ok failed=$failed missing_dumps=$skipped_missing dumps_present=$dumps_present"

if [[ "$dumps_present" -eq 0 ]]; then
  echo "ERROR: no dump files found under $BACKUP_DIR" >&2
  exit 1
fi
if [[ "$failed" -gt 0 ]]; then
  echo "ERROR: one or more restores failed" >&2
  exit 1
fi
if [[ "$ok" -eq 0 ]]; then
  echo "ERROR: nothing was restored" >&2
  exit 1
fi

echo "Restore completed!"
exit 0
