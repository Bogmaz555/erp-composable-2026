#!/usr/bin/env bash
# W140 — Ensure tenant hardening artifacts ready
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG="${ROOT}/.agents/swarm/ensure-tenant-hardening.log"
mkdir -p "$(dirname "$LOG")"
log() { echo "[$(date -Iseconds)] [tenant-hardening] $*" | tee -a "$LOG"; }

[[ -f "${ROOT}/infra/tenant/TENANT-HARDENING-POLICY.md" ]] || exit 1
[[ -f "${ROOT}/apps/proc-service/src/tenant.middleware.ts" ]] || exit 1
log "Tenant hardening policy OK"

GW="${GW_URL:-http://127.0.0.1:4005}"
code=$(curl -s -o /dev/null -w '%{http_code}' -H 'X-Tenant-Id: default' \
  "${GW}/api/analytics/tenants/default/isolation" 2>/dev/null || echo 0)
log "isolation probe HTTP ${code}"
