#!/usr/bin/env bash
# Backup all ERP Compose databases using pg_dump (custom format -Fc).
#
# Usage:
#   ./scripts/backup-dbs.sh [BACKUP_ROOT]
#   BACKUP_ROOT defaults to ./backups
#
# Exit codes:
#   0 — at least one DB dumped successfully, zero dump failures
#   1 — usage / dump failure / no containers dumped
#
# Name parity: container_name values match docker-compose.yml (erp-*-db).
# Dumps are written without docker TTY (-t) so binary -Fc files stay clean.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

BACKUP_DIR="${1:-./backups}"
TIMESTAMP="$(date +"%Y%m%d_%H%M%S")"
FULL_BACKUP_DIR="${BACKUP_DIR}/${TIMESTAMP}"

# compose_service|container_name|volume_key|dbname|dbuser
# Keep in lockstep with docker-compose.yml container_name / POSTGRES_*
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

if ! command -v docker >/dev/null 2>&1; then
  echo "ERROR: docker is required" >&2
  exit 1
fi

mkdir -p "$FULL_BACKUP_DIR"

COMPOSE_PROJECT="${COMPOSE_PROJECT_NAME:-}"
if [[ -z "$COMPOSE_PROJECT" ]] && docker compose version >/dev/null 2>&1; then
  COMPOSE_PROJECT="$(docker compose config --format json 2>/dev/null | sed -n 's/.*"name"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1 || true)"
fi
COMPOSE_PROJECT="${COMPOSE_PROJECT:-$(basename "$ROOT")}"

ok=0
failed=0
skipped=0

echo "Starting backup of ERP databases → $FULL_BACKUP_DIR"
echo "Compose project (for volume name parity): $COMPOSE_PROJECT"

{
  echo "timestamp=$TIMESTAMP"
  echo "compose_project=$COMPOSE_PROJECT"
  echo "created_at=$(date -Iseconds)"
  echo "host=$(hostname 2>/dev/null || echo unknown)"
} >"$FULL_BACKUP_DIR/MANIFEST.txt"

for row in "${DB_ROWS[@]}"; do
  IFS='|' read -r _service container _volume dbname dbuser <<<"$row"
  dump_path="$FULL_BACKUP_DIR/${dbname}.dump"

  if [[ -z "$(docker ps -q -f "name=^/${container}$")" ]]; then
    echo "WARNING: container $container not running — skip $dbname"
    echo "skip|$container|$dbname" >>"$FULL_BACKUP_DIR/MANIFEST.txt"
    skipped=$((skipped + 1))
    continue
  fi

  echo "Backing up $dbname from $container (user=$dbuser)..."
  # No -t: TTY would inject CR into binary custom-format dumps.
  if docker exec -i "$container" pg_dump -U "$dbuser" -Fc --no-owner --no-acl "$dbname" >"$dump_path"; then
    if [[ ! -s "$dump_path" ]]; then
      echo "ERROR: empty dump for $dbname ($dump_path)" >&2
      rm -f "$dump_path"
      echo "fail|$container|$dbname|empty" >>"$FULL_BACKUP_DIR/MANIFEST.txt"
      failed=$((failed + 1))
      continue
    fi
    size="$(wc -c <"$dump_path" | tr -d ' ')"
    echo " -> Saved $dump_path (${size} bytes)"
    echo "ok|$container|$dbname|$size" >>"$FULL_BACKUP_DIR/MANIFEST.txt"
    ok=$((ok + 1))
  else
    echo "ERROR: pg_dump failed for $dbname on $container" >&2
    rm -f "$dump_path"
    echo "fail|$container|$dbname|pg_dump" >>"$FULL_BACKUP_DIR/MANIFEST.txt"
    failed=$((failed + 1))
  fi
done

echo "----"
echo "Backup summary: ok=$ok failed=$failed skipped=$skipped dir=$FULL_BACKUP_DIR"
echo "ok=$ok failed=$failed skipped=$skipped" >>"$FULL_BACKUP_DIR/MANIFEST.txt"

if [[ "$failed" -gt 0 ]]; then
  echo "ERROR: one or more dumps failed" >&2
  exit 1
fi
if [[ "$ok" -eq 0 ]]; then
  echo "ERROR: no databases were backed up (are containers running?)" >&2
  exit 1
fi

echo "Backup completed successfully!"
# Print path last for easy capture by dr-drill: BACKUP_DIR=$(... | tail -1)
echo "$FULL_BACKUP_DIR"
exit 0
