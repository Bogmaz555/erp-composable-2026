#!/usr/bin/env bash
# ERP 2026 — Continuous Warstwa 2 Worker
# Pełna automatyzacja: schema → build krytycznych serwisów → restart → smoke → raport
# Użycie: bash scripts/autonomous-warstwa2-continuous.sh [--full-boot]

set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
export PATH="${HOME}/.local/share/mise/installs/node/22/bin:${PATH:-}"
PNPM="${ROOT}/node_modules/.bin/pnpm"
PRISMA="${ROOT}/node_modules/.bin/prisma"
LOG="${ROOT}/.agents/swarm/warstwa2-continuous.log"
FULL_BOOT=false

for arg in "$@"; do
  case "$arg" in
    --full-boot) FULL_BOOT=true ;;
  esac
done

log() { echo "[$(date -Iseconds)] $*" | tee -a "$LOG"; }
mkdir -p "$(dirname "$LOG")"

log "========== CONTINUOUS WORKER START =========="

# 1. Schema push (proc + quality — nowe modele W2-M04/M05)
for s in apps/proc-service/prisma/schema.prisma apps/quality-service/prisma/schema.prisma apps/inv-service/prisma/schema.prisma apps/pm-service/prisma/schema.prisma; do
  log "schema push: $s"
  "$PRISMA" db push --schema "$s" --skip-generate 2>/dev/null || "$PRISMA" db push --schema "$s" || true
  "$PRISMA" generate --schema "$s" 2>/dev/null || true
done

# 2. Build serwisów jeśli dist brakuje
build_if_needed() {
  local app=$1
  local dist=$2
  if [[ ! -f "$dist" ]]; then
    log "build $app"
    (cd "$ROOT/apps/$app" && npx nest build 2>/dev/null || npx tsc -p tsconfig.build.json 2>/dev/null) || log "WARN build $app"
  fi
}

build_if_needed "proc-service" "proc-service/dist/main.js"
build_if_needed "quality-service" "quality-service/dist/main.js"

# 3. Restart PROC (4004) + Quality (4008) jeśli nie odpowiadają
restart_service() {
  local port=$1
  local name=$2
  local start_cmd=$3
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 "http://127.0.0.1:${port}/health" 2>/dev/null || echo "000")
  if [[ ! "$code" =~ ^[23] ]]; then
    log "restart $name on :$port"
    fuser -k "${port}/tcp" 2>/dev/null || true
    sleep 1
    eval "nohup $start_cmd >> /tmp/erp-${name}.log 2>&1 &"
    sleep 6
  fi
}

restart_service 4004 proc "${PNPM} --filter proc-service run start:dev"
restart_service 4008 quality "${PNPM} --filter quality-service run start:dev"
restart_service 4003 inv "${PNPM} --filter inv-service run start:dev"
restart_service 4002 pm "${PNPM} --filter pm-service run start:dev"
restart_service 4010 fin "node ${ROOT}/apps/finance/dist/main.js"

# 4. Pipeline smoke (skip boot unless --full-boot)
if $FULL_BOOT; then
  bash "$ROOT/scripts/autonomous-warstwa2-pipeline.sh"
else
  bash "$ROOT/scripts/autonomous-warstwa2-pipeline.sh" --skip-boot
fi

log "========== CONTINUOUS WORKER END =========="
