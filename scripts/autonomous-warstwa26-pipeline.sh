#!/usr/bin/env bash
# W26 — OTel / Jaeger profile (TD-009 → 🟡)
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT" && source scripts/erp-env.sh
LOG="${ROOT}/.agents/swarm/warstwa26-pipeline.log"
mkdir -p "$(dirname "$LOG")"
log() { echo "[$(date -Iseconds)] $*" | tee -a "$LOG"; }
log "W26 START"
docker compose --profile otel up -d jaeger 2>&1 | tail -3 | tee -a "$LOG" || true
pnpm run test:contracts 2>&1 | tail -4 | tee -a "$LOG" || true
npx tsx scripts/otel-smoke.ts 2>&1 | tee -a "$LOG" || true
log "W26 END"
