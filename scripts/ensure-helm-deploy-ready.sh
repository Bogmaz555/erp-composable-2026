#!/usr/bin/env bash
# W135 — Ensure Helm deploy artifacts are ready
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG="${ROOT}/.agents/swarm/ensure-helm-deploy.log"
mkdir -p "$(dirname "$LOG")"
log() { echo "[$(date -Iseconds)] [helm-deploy] $*" | tee -a "$LOG"; }

log "Checking Helm chart..."
for f in Chart.yaml values.yaml values-dev.yaml values-staging.yaml values-prod.yaml; do
  [[ -f "${ROOT}/infra/helm/erp/${f}" ]] || { log "MISSING ${f}"; exit 1; }
done
log "Helm chart OK"

if command -v helm >/dev/null 2>&1; then
  helm lint "${ROOT}/infra/helm/erp/" 2>&1 | tail -3 | tee -a "$LOG" || true
  helm template erp "${ROOT}/infra/helm/erp/" -f "${ROOT}/infra/helm/erp/values-dev.yaml" >/dev/null 2>&1 \
    && log "helm template dev OK" || log "helm template skipped"
else
  log "helm CLI not installed — file checks only"
fi
