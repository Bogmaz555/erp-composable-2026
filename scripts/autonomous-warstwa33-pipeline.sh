#!/usr/bin/env bash
# W33 — Finance prod boot + regression z finance required
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT" && source scripts/erp-env.sh
LOG="${ROOT}/.agents/swarm/warstwa33-pipeline.log"
mkdir -p "$(dirname "$LOG")"
log() { echo "[$(date -Iseconds)] $*" | tee -a "$LOG"; }

log "W33 START"
bash scripts/ensure-finance-prod.sh start 2>&1 | tee -a "$LOG" || true
npx tsx scripts/finance-prod-smoke.ts 2>&1 | tee -a "$LOG" || true
bash scripts/boot-regression-pipeline.sh 2>&1 | tail -12 | tee -a "$LOG" || true
log "W33 END"
