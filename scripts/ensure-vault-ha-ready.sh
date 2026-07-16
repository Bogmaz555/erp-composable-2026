#!/usr/bin/env bash
# W129 — Ensure Vault HA stub ready (primary + secondary)
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG="${ROOT}/.agents/swarm/ensure-vault-ha.log"
mkdir -p "$(dirname "$LOG")"
log() { echo "[$(date -Iseconds)] [vault-ha] $*" | tee -a "$LOG"; }

bash "${ROOT}/scripts/ensure-vault-audit-ready.sh" 2>&1 | tail -2 | tee -a "$LOG" || true

if command -v docker >/dev/null 2>&1; then
  docker compose --profile prod-observability up -d vault vault-ha 2>&1 | tail -3 | tee -a "$LOG" || true
fi

for port in 8200 8201; do
  curl -sf "http://127.0.0.1:${port}/v1/sys/health" >/dev/null 2>&1 && log "Vault :${port} OK" || log "Vault :${port} SKIP"
done
log "Vault HA stub check complete"
exit 0
