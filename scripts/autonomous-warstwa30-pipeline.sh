#!/usr/bin/env bash
# W30 — Regression stabilność (FE auto-detect, optional UI/outbox)
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT" && source scripts/erp-env.sh
LOG="${ROOT}/.agents/swarm/warstwa30-pipeline.log"
mkdir -p "$(dirname "$LOG")"
log() { echo "[$(date -Iseconds)] $*" | tee -a "$LOG"; }

log "W30 START — regression stabilność"
bash scripts/boot-regression-pipeline.sh 2>&1 | tee -a "$LOG" || true
log "W30 END"
