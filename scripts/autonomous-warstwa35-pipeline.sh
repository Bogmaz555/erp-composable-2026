#!/usr/bin/env bash
# W35 — Full stack regression (boot:otel + finance + gateway + analytics)
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT" && source scripts/erp-env.sh
LOG="${ROOT}/.agents/swarm/warstwa35-pipeline.log"
mkdir -p "$(dirname "$LOG")"
log() { echo "[$(date -Iseconds)] $*" | tee -a "$LOG"; }

log "W35 START — full stack regression"
docker compose --profile otel up -d jaeger 2>&1 | tail -2 | tee -a "$LOG" || true
bash scripts/ensure-finance-prod.sh start 2>&1 | tee -a "$LOG" || true
bash scripts/boot-regression-pipeline.sh 2>&1 | tail -14 | tee -a "$LOG" || true
npx tsx scripts/observability-readiness-smoke.ts 2>&1 | tee -a "$LOG" || true
npx tsx scripts/finance-prod-smoke.ts 2>&1 | tee -a "$LOG" || true
log "W35 END"
