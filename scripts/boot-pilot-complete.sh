#!/usr/bin/env bash
# Boot stack for Pilot v1 COMPLETE live gates (K1).
# Usage: bash scripts/boot-pilot-complete.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
LOG="${PILOT_COMPLETE_LOG_DIR:-/tmp/pilot-v1-complete-logs}"
mkdir -p "$LOG"

export MEILI_MASTER_KEY="${MEILI_MASTER_KEY:-pilot-dev-meili-key-not-for-prod}"
export AUTH_ENFORCE="${AUTH_ENFORCE:-true}"
export USE_KEYCLOAK_JWKS="${USE_KEYCLOAK_JWKS:-true}"
export NATS_JETSTREAM="${NATS_JETSTREAM:-true}"
export NATS_URL="${NATS_URL:-nats://127.0.0.1:4222}"
export HOST="${HOST:-0.0.0.0}"
export DEFAULT_TENANT_ID="${DEFAULT_TENANT_ID:-default}"
export ANALYTICS_NATS_DISABLE="${ANALYTICS_NATS_DISABLE:-true}"
export PM_DATABASE_URL="${PM_DATABASE_URL:-postgresql://erp_user:erp_password@localhost:5434/pm_db}"
export INV_DATABASE_URL="${INV_DATABASE_URL:-postgresql://erp_user:erp_password@localhost:5436/inv_db}"
export PROC_DATABASE_URL="${PROC_DATABASE_URL:-postgresql://erp_user:erp_password@localhost:5437/proc_db}"
export FINANCE_DATABASE_URL="${FINANCE_DATABASE_URL:-postgresql://erp_user:erp_password@localhost:5438/fin_db}"
export ANALYTICS_DATABASE_URL="${ANALYTICS_DATABASE_URL:-postgresql://erp_user:erp_password@localhost:5445/analytics_db}"
export DATABASE_URL="${DATABASE_URL:-$PM_DATABASE_URL}"

log() { echo "[boot-pilot-complete] $*"; }

log "infra: nats redis keycloak + core DBs"
docker compose up -d nats redis keycloak \
  crm-db pm-db inv-db proc-db fin-db quality-db eam-db plm-db tax-db hr-db analytics-db \
  >/dev/null

log "wait nats"
for i in $(seq 1 30); do
  curl -sf http://127.0.0.1:8222/healthz >/dev/null 2>&1 && break
  sleep 1
done

if [ -x scripts/ensure-databases.sh ]; then
  log "ensure-databases (non-fatal if partial)"
  bash scripts/ensure-databases.sh || true
fi

# Decimal / schema sync for money fields (non-fatal warnings)
for pair in \
  "apps/hr:postgresql://erp_user:erp_password@localhost:5443/hr_db" \
  "apps/pm-service:$PM_DATABASE_URL" \
  "apps/proc-service:$PROC_DATABASE_URL" \
  "apps/finance:$FINANCE_DATABASE_URL" \
  "apps/crm-service:postgresql://erp_user:erp_password@localhost:5433/crm_db" \
  "apps/plm-service:postgresql://postgres:postgres@localhost:5441/plm_db"
do
  dir="${pair%%:*}"; url="${pair#*:}"
  if [ -f "$dir/prisma/schema.prisma" ]; then
    (cd "$dir" && DATABASE_URL="$url" npx prisma db push --accept-data-loss --skip-generate >/dev/null 2>&1) || true
  fi
done

if [ -f scripts/nats-bootstrap-streams.sh ]; then
  log "jetstream bootstrap"
  bash scripts/nats-bootstrap-streams.sh || true
fi

kill_port() { fuser -k "$1/tcp" 2>/dev/null || true; }
for p in 4001 4002 4003 4004 4005 4006 4007 4010 4011; do kill_port "$p"; done
sleep 1

start_bg() {
  local name="$1"
  shift
  nohup bash -c "$*" >"$LOG/${name}.log" 2>&1 &
  echo $! >"$LOG/${name}.pid"
  log "started $name pid=$(cat "$LOG/${name}.pid")"
}

start_bg gateway "export AUTH_ENFORCE=true USE_KEYCLOAK_JWKS=true NATS_JETSTREAM=true MEILI_MASTER_KEY='$MEILI_MASTER_KEY' NATS_URL='$NATS_URL' HOST='$HOST'; pnpm run start:gateway"
start_bg pm "export PM_DATABASE_URL='$PM_DATABASE_URL' NATS_JETSTREAM=true DEFAULT_TENANT_ID='$DEFAULT_TENANT_ID' NATS_URL='$NATS_URL' HOST='$HOST'; pnpm run start:pm"
start_bg inv "export NATS_JETSTREAM=true NATS_URL='$NATS_URL' HOST='$HOST'; pnpm run start:inv"
start_bg proc "export PROC_DATABASE_URL='$PROC_DATABASE_URL' NATS_JETSTREAM=true NATS_URL='$NATS_URL' HOST='$HOST'; pnpm run start:proc"
start_bg plm "export NATS_JETSTREAM=true NATS_URL='$NATS_URL' HOST='$HOST'; pnpm run start:plm"
start_bg mes "export NATS_JETSTREAM=true NATS_URL='$NATS_URL' HOST='$HOST'; pnpm run start:mes"
start_bg finance "export NATS_JETSTREAM=true NATS_URL='$NATS_URL' HOST='$HOST' FINANCE_DATABASE_URL='$FINANCE_DATABASE_URL'; pnpm run start:fin:prod || pnpm run start:fin"
start_bg analytics "export ANALYTICS_DATABASE_URL='$ANALYTICS_DATABASE_URL' DATABASE_URL='$ANALYTICS_DATABASE_URL' ANALYTICS_NATS_DISABLE=true NATS_JETSTREAM=true HOST='$HOST'; if [ -f apps/analytics-service/dist/main.js ]; then node apps/analytics-service/dist/main.js; else (cd apps/analytics-service && npx tsc -p tsconfig.json && node dist/main.js); fi"

log "wait health matrix"
declare -A PORTS=([gateway]=4005 [pm]=4002 [inv]=4003 [proc]=4004 [mes]=4006 [plm]=4007 [fin]=4010 [analytics]=4011)
ok=0
for i in $(seq 1 60); do
  ok=0
  for name in "${!PORTS[@]}"; do
    p="${PORTS[$name]}"
    path="/health"
    [ "$name" = "gateway" ] && path="/api/health"
    [ "$name" = "fin" ] && path="/fin/health"
    code=$(curl -sS -o /dev/null -w "%{http_code}" "http://127.0.0.1:${p}${path}" 2>/dev/null || echo 000)
    if [ "$code" = "200" ]; then ok=$((ok+1)); fi
  done
  log "health ok $ok/8 (try $i)"
  [ "$ok" -ge 6 ] && break
  sleep 2
done

echo "=== health matrix ==="
for name in gateway pm inv proc mes plm fin analytics; do
  p="${PORTS[$name]}"
  path="/health"
  [ "$name" = "gateway" ] && path="/api/health"
  [ "$name" = "fin" ] && path="/fin/health"
  code=$(curl -sS -o /dev/null -w "%{http_code}" "http://127.0.0.1:${p}${path}" 2>/dev/null || echo 000)
  echo "$name :$p $path → $code"
done
log "logs in $LOG"
log "done"
