#!/usr/bin/env bash
# W101 — Prepare mTLS gateway dev profile (certs + env)
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
LOG="${ROOT}/.agents/swarm/ensure-mtls-gateway.log"
mkdir -p "$(dirname "$LOG")"

bash "${ROOT}/scripts/generate-mtls-certs.sh" 2>&1 | tee -a "$LOG"
echo "mTLS profile ready — set GATEWAY_MTLS=true to enable :4445 health listener" | tee -a "$LOG"
