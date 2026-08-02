#!/usr/bin/env bash
# Enterprise 2.1 P0 — boot core stack under ENTERPRISE profile
# Usage: bash scripts/boot-enterprise.sh
# Does not replace boot-pilot-complete.sh (pilot remains separate).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
export PATH="${HOME}/.local/share/mise/installs/node/22/bin:${PATH:-}"

LOG="${ENTERPRISE_BOOT_LOG_DIR:-/tmp/enterprise-2.1-logs}"
mkdir -p "$LOG"

log() { echo "[boot-enterprise] $*"; }

# --- Enterprise profile (KD-P0-5) ---
export ENTERPRISE="${ENTERPRISE:-1}"
export NATS_JETSTREAM="${NATS_JETSTREAM:-true}"
export NATS_URL="${NATS_URL:-nats://127.0.0.1:4222}"
export AUTH_ENFORCE="${AUTH_ENFORCE:-true}"
export USE_KEYCLOAK_JWKS="${USE_KEYCLOAK_JWKS:-true}"
export HOST="${HOST:-0.0.0.0}"
export DEFAULT_TENANT_ID="${DEFAULT_TENANT_ID:-default}"
export TENANCY_MODEL="${TENANCY_MODEL:-DEDICATED_STACK}"
export MEILI_MASTER_KEY="${MEILI_MASTER_KEY:-pilot-dev-meili-key-not-for-prod}"
export ANALYTICS_NATS_DISABLE="${ANALYTICS_NATS_DISABLE:-true}"

if [[ "${AUTH_ENFORCE}" == "false" || "${AUTH_DISABLE:-}" == "true" ]]; then
  log "ERROR: enterprise boot forbids AUTH_ENFORCE=false or AUTH_DISABLE=true"
  exit 1
fi

export PM_DATABASE_URL="${PM_DATABASE_URL:-postgresql://erp_user:erp_password@localhost:5434/pm_db}"
export INV_DATABASE_URL="${INV_DATABASE_URL:-postgresql://erp_user:erp_password@localhost:5436/inv_db}"
export PROC_DATABASE_URL="${PROC_DATABASE_URL:-postgresql://erp_user:erp_password@localhost:5437/proc_db}"
export FINANCE_DATABASE_URL="${FINANCE_DATABASE_URL:-postgresql://erp_user:erp_password@localhost:5438/fin_db}"
export ANALYTICS_DATABASE_URL="${ANALYTICS_DATABASE_URL:-postgresql://erp_user:erp_password@localhost:5445/analytics_db}"

log "profile ENTERPRISE=${ENTERPRISE} NATS_JETSTREAM=${NATS_JETSTREAM}"

# Optional infra (non-fatal if already up)
if command -v docker >/dev/null 2>&1; then
  log "ensure infra containers (nats redis keycloak + core DBs)"
  docker compose up -d nats redis keycloak \
    crm-db pm-db inv-db proc-db fin-db quality-db eam-db plm-db tax-db hr-db analytics-db \
    >/dev/null 2>&1 || log "WARN: docker compose partial"
fi

if [ -f scripts/nats-bootstrap-streams.sh ]; then
  log "jetstream bootstrap"
  bash scripts/nats-bootstrap-streams.sh >/dev/null 2>&1 || true
fi

# --- Finance prebuild (KD-P0-2) ---
log "build finance dist if needed"
if [[ ! -f apps/finance/dist/main.js ]]; then
  (cd apps/finance && npx tsc -p tsconfig.build.json) || {
    log "ERROR: finance build failed"
    exit 1
  }
else
  log "finance dist/main.js present"
fi

kill_port() { fuser -k "$1/tcp" 2>/dev/null || true; }
if [[ "${ENTERPRISE_BOOT_KILL_PORTS:-1}" == "1" ]]; then
  for p in 4002 4003 4004 4005 4006 4007 4010 4011; do kill_port "$p"; done
  sleep 1
fi

start_bg() {
  local name="$1"
  shift
  nohup bash -c "$*" >"$LOG/${name}.log" 2>&1 &
  echo $! >"$LOG/${name}.pid"
  log "started $name pid=$(cat "$LOG/${name}.pid")"
}

start_bg gateway "export AUTH_ENFORCE=true USE_KEYCLOAK_JWKS=true ENTERPRISE=1 NATS_JETSTREAM=true MEILI_MASTER_KEY='$MEILI_MASTER_KEY' NATS_URL='$NATS_URL' HOST='$HOST' TENANCY_MODEL='$TENANCY_MODEL'; pnpm run start:gateway"
start_bg pm "export PM_DATABASE_URL='$PM_DATABASE_URL' ENTERPRISE=1 NATS_JETSTREAM=true DEFAULT_TENANT_ID='$DEFAULT_TENANT_ID' NATS_URL='$NATS_URL' HOST='$HOST'; pnpm run start:pm"
start_bg inv "export NATS_JETSTREAM=true ENTERPRISE=1 NATS_URL='$NATS_URL' HOST='$HOST' INV_DATABASE_URL='$INV_DATABASE_URL' INVENTORY_DATABASE_URL='$INV_DATABASE_URL'; pnpm run start:inv"
start_bg proc "export PROC_DATABASE_URL='$PROC_DATABASE_URL' NATS_JETSTREAM=true ENTERPRISE=1 NATS_URL='$NATS_URL' HOST='$HOST'; pnpm run start:proc"
start_bg plm "export NATS_JETSTREAM=true ENTERPRISE=1 NATS_URL='$NATS_URL' HOST='$HOST'; pnpm run start:plm"
start_bg mes "export NATS_JETSTREAM=true ENTERPRISE=1 NATS_URL='$NATS_URL' HOST='$HOST'; pnpm run start:mes"
start_bg finance "export FINANCE_DATABASE_URL='$FINANCE_DATABASE_URL' NATS_JETSTREAM=true ENTERPRISE=1 NATS_URL='$NATS_URL' HOST='$HOST'; node apps/finance/dist/main.js"
start_bg analytics "export ANALYTICS_DATABASE_URL='$ANALYTICS_DATABASE_URL' DATABASE_URL='$ANALYTICS_DATABASE_URL' ANALYTICS_NATS_DISABLE=true NATS_JETSTREAM=true ENTERPRISE=1 HOST='$HOST'; if [ -f apps/analytics-service/dist/main.js ]; then node apps/analytics-service/dist/main.js; else pnpm --filter analytics-service run start:dev; fi"

log "wait health-matrix"
for i in $(seq 1 40); do
  if bash scripts/health-matrix.sh; then
    log "enterprise boot healthy (try $i)"
    exit 0
  fi
  sleep 3
done
log "ERROR: health-matrix did not pass in time — see $LOG"
bash scripts/health-matrix.sh || true
exit 1
