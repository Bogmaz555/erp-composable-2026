#!/usr/bin/env bash
# W28 — Outbox dead-letter dashboard (TD-008 → 🟡)
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT" && source scripts/erp-env.sh
LOG="${ROOT}/.agents/swarm/warstwa28-pipeline.log"
mkdir -p "$(dirname "$LOG")"
log() { echo "[$(date -Iseconds)] $*" | tee -a "$LOG"; }
log "W28 START"
pnpm run test:contracts 2>&1 | tail -4 | tee -a "$LOG" || true
npx tsx scripts/outbox-dlq-smoke.ts 2>&1 | tee -a "$LOG" || true
npx tsx scripts/master-regression-report.ts 2>&1 | tail -8 | tee -a "$LOG" || true
log "W28 END"
