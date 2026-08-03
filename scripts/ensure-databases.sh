#!/usr/bin/env bash
# ERP 2026 — Ensure PostgreSQL databases (docker) + Prisma schema sync
# Użycie: bash scripts/ensure-databases.sh [proc-service pm-service finance ...]
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
LOG="${ROOT}/.agents/swarm/ensure-databases.log"
mkdir -p "$(dirname "$LOG")"

log() { echo "[$(date -Iseconds)] [db] $*" | tee -a "$LOG"; }

DB_SERVICES=(proc-db pm-db fin-db inv-db crm-db quality-db plm-db analytics-db tax-db hr-db eam-db)
TARGETS=("$@")
if [[ ${#TARGETS[@]} -eq 0 ]]; then
  TARGETS=(proc-service pm-service finance inv-service analytics-service tax-legal hr eam-service)
fi

phase_docker() {
  if ! command -v docker >/dev/null 2>&1; then
    log "WARN docker not available — skip container boot"
    return
  fi
  log "docker compose up databases"
  docker compose up -d "${DB_SERVICES[@]}" 2>&1 | tail -8 | tee -a "$LOG" || true
  local waited=0
  while [[ $waited -lt 60 ]]; do
    if docker compose ps proc-db 2>/dev/null | grep -q healthy; then
      log "proc-db healthy"
      break
    fi
    sleep 2
    ((waited += 2)) || true
  done
}

phase_prisma() {
  if [ -f "$ROOT/.env" ]; then
    set -a
    # shellcheck source=/dev/null
    source "$ROOT/.env"
    set +a
  fi

  # Defaults for CI / clean shells (do not override if already set)
  export CRM_DATABASE_URL="${CRM_DATABASE_URL:-postgresql://erp_user:erp_password@localhost:5433/crm_db?schema=public}"
  export PM_DATABASE_URL="${PM_DATABASE_URL:-postgresql://erp_user:erp_password@localhost:5434/pm_db?schema=public}"
  export INVENTORY_DATABASE_URL="${INVENTORY_DATABASE_URL:-postgresql://erp_user:erp_password@localhost:5436/inv_db?schema=public}"
  export INV_DATABASE_URL="${INV_DATABASE_URL:-$INVENTORY_DATABASE_URL}"
  export PROC_DATABASE_URL="${PROC_DATABASE_URL:-postgresql://erp_user:erp_password@localhost:5437/proc_db?schema=public}"
  export FINANCE_DATABASE_URL="${FINANCE_DATABASE_URL:-postgresql://erp_user:erp_password@localhost:5438/fin_db?schema=public}"
  export ANALYTICS_DATABASE_URL="${ANALYTICS_DATABASE_URL:-postgresql://erp_user:erp_password@localhost:5445/analytics_db?schema=public}"
  export DATABASE_URL="${DATABASE_URL:-$PM_DATABASE_URL}"

  for svc in "${TARGETS[@]}"; do
    SCHEMA="${ROOT}/apps/${svc}/prisma/schema.prisma"
    [[ -f "$SCHEMA" ]] || continue
    log "prisma db push ${svc}"
    # Per-service DATABASE_URL aliases for prisma env()
    case "$svc" in
      analytics-service)
        export DATABASE_URL="$ANALYTICS_DATABASE_URL"
        ;;
      pm-service)
        export DATABASE_URL="$PM_DATABASE_URL"
        export PM_DATABASE_URL
        ;;
      crm-service)
        export DATABASE_URL="$CRM_DATABASE_URL"
        export CRM_DATABASE_URL
        ;;
      inv-service)
        export DATABASE_URL="$INVENTORY_DATABASE_URL"
        export INVENTORY_DATABASE_URL
        export INV_DATABASE_URL
        ;;
      proc-service)
        export DATABASE_URL="$PROC_DATABASE_URL"
        export PROC_DATABASE_URL
        ;;
      finance)
        export DATABASE_URL="$FINANCE_DATABASE_URL"
        export FINANCE_DATABASE_URL
        ;;
    esac
    (cd "${ROOT}/apps/${svc}" && \
      ANALYTICS_DATABASE_URL="$ANALYTICS_DATABASE_URL" \
      PM_DATABASE_URL="$PM_DATABASE_URL" \
      CRM_DATABASE_URL="$CRM_DATABASE_URL" \
      INVENTORY_DATABASE_URL="$INVENTORY_DATABASE_URL" \
      INV_DATABASE_URL="$INV_DATABASE_URL" \
      PROC_DATABASE_URL="$PROC_DATABASE_URL" \
      FINANCE_DATABASE_URL="$FINANCE_DATABASE_URL" \
      DATABASE_URL="$DATABASE_URL" \
      npx prisma@5.22.0 db push --schema=prisma/schema.prisma --skip-generate 2>&1 | tail -6) | tee -a "$LOG" || true
    (cd "${ROOT}/apps/${svc}" && npx prisma@5.22.0 generate --schema=prisma/schema.prisma 2>&1 | tail -2) | tee -a "$LOG" || true
  done
}

phase_docker
phase_prisma
log "ensure-databases complete"
