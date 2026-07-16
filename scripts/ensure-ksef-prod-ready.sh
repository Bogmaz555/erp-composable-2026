#!/usr/bin/env bash
# W141 — Ensure KSeF production profile artifacts ready
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG="${ROOT}/.agents/swarm/ensure-ksef-prod.log"
mkdir -p "$(dirname "$LOG")"
log() { echo "[$(date -Iseconds)] [ksef-prod] $*" | tee -a "$LOG"; }

[[ -f "${ROOT}/infra/ksef/KSEF-PROD-POLICY.md" ]] || exit 1
[[ -f "${ROOT}/apps/tax-legal/src/ksef-production.service.ts" ]] || exit 1
log "KSeF prod policy OK"

source "${ROOT}/scripts/erp-env.sh"
GW="${GW_URL:-http://127.0.0.1:4005}"
code=$(curl -s -o /dev/null -w '%{http_code}' "${GW}/api/tax-legal/ksef/production/profile" 2>/dev/null || echo 0)
if [[ ! "$code" =~ ^[23] ]]; then
  log "tax-legal not up (HTTP ${code}) — starting..."
  fuser -k 4015/tcp 2>/dev/null || true
  sleep 1
  nohup bash -c "${PNPM} --filter @erp/tax-legal run start:dev" >> /tmp/erp-ksef-prod.log 2>&1 &
  for i in $(seq 1 20); do
    code=$(curl -s -o /dev/null -w '%{http_code}' "${GW}/api/tax-legal/ksef/production/profile" 2>/dev/null || echo 0)
    [[ "$code" =~ ^[23] ]] && break
    sleep 2
  done
fi
log "ksef production profile HTTP ${code}"
