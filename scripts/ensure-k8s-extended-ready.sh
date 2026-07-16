#!/usr/bin/env bash
# W139 — Ensure K8s extended manifests ready
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG="${ROOT}/.agents/swarm/ensure-k8s-extended.log"
mkdir -p "$(dirname "$LOG")"
log() { echo "[$(date -Iseconds)] [k8s-extended] $*" | tee -a "$LOG"; }

for f in pm-service plm-service finance-service quality-service eam-service proc-service; do
  [[ -f "${ROOT}/infra/k8s/deploy/${f}.yaml" ]] || { log "MISSING ${f}.yaml"; exit 1; }
done
log "All extended manifests present"

if command -v kubectl >/dev/null 2>&1; then
  kubectl apply -k "${ROOT}/infra/k8s/deploy/" --dry-run=client 2>&1 | tail -3 | tee -a "$LOG" || true
else
  log "kubectl not installed — file checks only"
fi
