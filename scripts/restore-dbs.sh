#!/usr/bin/env bash
# Restore all ERP Compose databases from pg_dump dumps

set -e

BACKUP_DIR=$1

if [ -z "$BACKUP_DIR" ]; then
  echo "Usage: $0 <path_to_backup_directory>"
  echo "Example: $0 ./backups/20260718_120000"
  exit 1
fi

if [ ! -d "$BACKUP_DIR" ]; then
  echo "Error: Directory $BACKUP_DIR does not exist."
  exit 1
fi

declare -A DB_CONFIGS=(
  ["erp-crm-db"]="crm_db erp_user"
  ["erp-pm-db"]="pm_db erp_user"
  ["erp-mfg-db"]="mfg_db erp_user"
  ["erp-inv-db"]="inv_db erp_user"
  ["erp-proc-db"]="proc_db erp_user"
  ["erp-fin-db"]="fin_db erp_user"
  ["erp-quality-db"]="quality_db postgres"
  ["erp-eam-db"]="eam_db postgres"
  ["erp-tax-db"]="tax_legal_db erp_user"
  ["erp-hr-db"]="hr_db erp_user"
  ["erp-plm-db"]="plm_db postgres"
  ["erp-analytics-db"]="analytics_db erp_user"
)

echo "Starting restore of ERP databases from $BACKUP_DIR..."

for container in "${!DB_CONFIGS[@]}"; do
  IFS=" " read -r dbname dbuser <<< "${DB_CONFIGS[$container]}"
  
  DUMP_FILE="$BACKUP_DIR/${dbname}.dump"
  
  if [ -f "$DUMP_FILE" ]; then
    if [ "$(docker ps -q -f name=^/${container}$)" ]; then
      echo "Restoring $dbname into $container..."
      
      # We drop and recreate schema to ensure clean state, or use pg_restore with --clean --if-exists
      docker exec -i "$container" pg_restore -U "$dbuser" -d "$dbname" --clean --if-exists < "$DUMP_FILE" || true
      
      echo " -> Restored $dbname"
    else
      echo "WARNING: Container $container is not running. Cannot restore $dbname."
    fi
  else
    echo "Info: No dump file found for $dbname ($DUMP_FILE). Skipping."
  fi
done

echo "Restore completed!"
