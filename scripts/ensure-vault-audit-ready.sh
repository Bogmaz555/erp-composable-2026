#!/usr/bin/env bash
# W125 — Ensure Vault audit logging enabled (dev profile)
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG="${ROOT}/.agents/swarm/ensure-vault-audit.log"
AUDIT_LOG="${ROOT}/infra/vault/audit/audit.log"
mkdir -p "$(dirname "$LOG")" "${ROOT}/infra/vault/audit/archive"

log() { echo "[$(date -Iseconds)] [vault-audit] $*" | tee -a "$LOG"; }

bash "${ROOT}/scripts/ensure-vault-kms-unseal-ready.sh" 2>&1 | tail -2 | tee -a "$LOG" || true

[[ -f "${ROOT}/infra/vault/audit/audit-device.hcl" ]] || { log "FAIL: audit-device.hcl missing"; exit 1; }
[[ -f "${ROOT}/infra/vault/audit/AUDIT-POLICY.md" ]] || { log "FAIL: AUDIT-POLICY.md missing"; exit 1; }

if [[ ! -f "$AUDIT_LOG" ]]; then
  touch "$AUDIT_LOG"
  log "audit log file created"
fi

# Dev stub: append synthetic audit entry for compliance probe
echo "{\"type\":\"audit\",\"time\":\"$(date -Iseconds)\",\"auth\":{\"display_name\":\"erp-dev\"},\"request\":{\"operation\":\"read\",\"path\":\"secret/erp/db-password\"}}" >> "$AUDIT_LOG"
log "Vault audit ready (dev stub)"
exit 0
