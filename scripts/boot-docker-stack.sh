#!/usr/bin/env bash
# ERP 2026 — Boot full Docker infrastructure (DBs + NATS + Redis + Keycloak)
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
LOG="${ROOT}/.agents/swarm/boot-docker.log"
mkdir -p "$(dirname "$LOG")"

log() { echo "[$(date -Iseconds)] [docker-stack] $*" | tee -a "$LOG"; }

if ! command -v docker >/dev/null 2>&1; then
  log "ERROR docker not installed"
  exit 1
fi

log "docker compose up infrastructure"
docker compose up -d \
  crm-db pm-db mfg-db inv-db proc-db fin-db plm-db quality-db analytics-db \
  nats redis keycloak 2>&1 | tail -15 | tee -a "$LOG"

log "wait for proc-db healthy"
for i in $(seq 1 30); do
  if docker compose ps proc-db 2>/dev/null | grep -q healthy; then
    log "proc-db ready"
    break
  fi
  sleep 2
done

bash "${ROOT}/scripts/ensure-databases.sh" proc-service pm-service finance inv-service quality-service 2>&1 | tail -10 | tee -a "$LOG"

log "docker stack ready — run: pnpm run boot:all"
