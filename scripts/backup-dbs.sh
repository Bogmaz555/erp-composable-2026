#!/usr/bin/env bash
# Backup all ERP Compose databases using pg_dump

set -e

BACKUP_DIR=${1:-"./backups"}
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FULL_BACKUP_DIR="$BACKUP_DIR/$TIMESTAMP"

mkdir -p "$FULL_BACKUP_DIR"

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

echo "Starting backup of ERP databases to $FULL_BACKUP_DIR..."

for container in "${!DB_CONFIGS[@]}"; do
  # Parse config
  IFS=" " read -r dbname dbuser <<< "${DB_CONFIGS[$container]}"
  
  if [ "$(docker ps -q -f name=^/${container}$)" ]; then
    echo "Backing up $dbname from $container..."
    docker exec -t "$container" pg_dump -U "$dbuser" -Fc "$dbname" > "$FULL_BACKUP_DIR/${dbname}.dump"
    echo " -> Saved to $FULL_BACKUP_DIR/${dbname}.dump"
  else
    echo "WARNING: Container $container is not running. Skipping $dbname."
  fi
done

echo "Backup completed successfully!"
