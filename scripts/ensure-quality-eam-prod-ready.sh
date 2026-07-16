#!/usr/bin/env bash
# W137 — Ensure quality + eam services for production endpoints
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG="${ROOT}/.agents/swarm/ensure-quality-eam-prod.log"
mkdir -p "$(dirname "$LOG")"
log() { echo "[$(date -Iseconds)] [quality-eam-prod] $*" | tee -a "$LOG"; }

source "${ROOT}/scripts/erp-env.sh"

log "Starting quality + eam services..."
fuser -k 4008/tcp 4009/tcp 2>/dev/null || true
sleep 1
nohup bash -c "${PNPM} --filter quality-service run start:dev" >> /tmp/erp-quality-prod.log 2>&1 &
nohup bash -c "${PNPM} --filter eam-service run start:dev" >> /tmp/erp-eam-prod.log 2>&1 &

for i in $(seq 1 20); do
  q=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4008/health 2>/dev/null || echo 0)
  e=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4009/health 2>/dev/null || echo 0)
  [[ "$q" =~ ^[23] && "$e" =~ ^[23] ]] && { log "quality=$q eam=$e OK"; exit 0; }
  sleep 2
done
log "WARN: services may still be starting"
