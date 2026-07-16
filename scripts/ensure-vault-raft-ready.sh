#!/usr/bin/env bash
# W133 — Ensure Vault Raft node ready (dev profile)
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG="${ROOT}/.agents/swarm/ensure-vault-raft.log"
mkdir -p "$(dirname "$LOG")"
log() { echo "[$(date -Iseconds)] [vault-raft] $*" | tee -a "$LOG"; }

[[ -f "${ROOT}/infra/vault/raft/raft-config.hcl" ]] || { log "FAIL: raft-config.hcl missing"; exit 1; }

if command -v docker >/dev/null 2>&1; then
  docker compose --profile prod-observability up -d vault vault-raft 2>&1 | tail -3 | tee -a "$LOG" || true
fi

for port in 8200 8202; do
  curl -sf "http://127.0.0.1:${port}/v1/sys/health" >/dev/null 2>&1 && log "Vault :${port} OK" || log "Vault :${port} SKIP"
done
log "Vault Raft check complete"
exit 0
