#!/usr/bin/env bash
# W27 — Genealogia INV chain ETO (TD-004 partial)
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT" && source scripts/erp-env.sh
LOG="${ROOT}/.agents/swarm/warstwa27-pipeline.log"
mkdir -p "$(dirname "$LOG")"
log() { echo "[$(date -Iseconds)] $*" | tee -a "$LOG"; }
log "W27 START"
pnpm run test:contracts 2>&1 | tail -4 | tee -a "$LOG" || true
npx tsx scripts/genealogy-chain-smoke.ts 2>&1 | tee -a "$LOG" || true
log "W27 END"
