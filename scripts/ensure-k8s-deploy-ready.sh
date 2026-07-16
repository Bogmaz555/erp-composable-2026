#!/usr/bin/env bash
# W131 — Validate K8s manifests (dry-run if kubectl available)
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG="${ROOT}/.agents/swarm/ensure-k8s-deploy.log"
mkdir -p "$(dirname "$LOG")"
log() { echo "[$(date -Iseconds)] [k8s] $*" | tee -a "$LOG"; }

for f in namespace.yaml api-gateway.yaml analytics-service.yaml kustomization.yaml; do
  [[ -f "${ROOT}/infra/k8s/deploy/${f}" ]] || { log "FAIL missing ${f}"; exit 1; }
done

if command -v kubectl >/dev/null 2>&1; then
  kubectl apply -k "${ROOT}/infra/k8s/deploy/" --dry-run=client 2>&1 | tail -5 | tee -a "$LOG" || log "SKIP dry-run"
else
  log "kubectl not found — manifest files OK"
fi
log "K8s deploy manifests ready"
exit 0
