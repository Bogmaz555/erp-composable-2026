#!/usr/bin/env bash
# W91 — Start Prometheus + Grafana (observability profile) and wait for health
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
GRAFANA_URL="${GRAFANA_URL:-http://localhost:3000}"
PROM_URL="${PROMETHEUS_URL:-http://localhost:9090}"
LOG="${ROOT}/.agents/swarm/ensure-grafana.log"
MAX_WAIT="${GRAFANA_MAX_WAIT:-90}"

log() { echo "[$(date -Iseconds)] [grafana] $*" | tee -a "$LOG"; }
mkdir -p "$(dirname "$LOG")"

if command -v docker >/dev/null 2>&1; then
  docker compose --profile observability up -d prometheus alertmanager grafana 2>&1 | tail -5 | tee -a "$LOG" || true
fi

log "waiting for Grafana + Prometheus (max ${MAX_WAIT}s)"
waited=0
while [[ $waited -lt $MAX_WAIT ]]; do
  g_ok=0
  p_ok=0
  curl -sf "${GRAFANA_URL}/api/health" >/dev/null 2>&1 && g_ok=1
  curl -sf "${PROM_URL}/-/ready" >/dev/null 2>&1 && p_ok=1
  if [[ $g_ok -eq 1 && $p_ok -eq 1 ]]; then
    log "observability stack ready (${waited}s)"
    exit 0
  fi
  sleep 3
  ((waited += 3)) || true
done

log "FAIL: Grafana/Prometheus not ready"
exit 1
