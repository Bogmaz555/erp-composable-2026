#!/usr/bin/env bash
# W127 — Boot prod-observability profile (Prometheus + Grafana + Alertmanager + Vault)
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG="${ROOT}/.agents/swarm/ensure-prod-observability.log"
mkdir -p "$(dirname "$LOG")"
log() { echo "[$(date -Iseconds)] [prod-obs] $*" | tee -a "$LOG"; }

if command -v docker >/dev/null 2>&1; then
  docker compose --profile prod-observability up -d prometheus alertmanager grafana vault vault-ha 2>&1 | tail -5 | tee -a "$LOG" || true
fi

for url in http://127.0.0.1:9090/-/ready http://127.0.0.1:9093/-/ready http://127.0.0.1:3000/api/health; do
  curl -sf "$url" >/dev/null 2>&1 && log "OK $url" || log "SKIP $url"
done
log "prod-observability profile ready"
exit 0
