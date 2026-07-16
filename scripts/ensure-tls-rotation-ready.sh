#!/usr/bin/env bash
# W113 — Check TLS cert expiry and rotate if within 30 days (or missing)
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG="${ROOT}/.agents/swarm/ensure-tls-rotation.log"
mkdir -p "$(dirname "$LOG")"

needs_rotate=0
check_expiry() {
  local cert="$1"
  if [[ ! -f "$cert" ]]; then
    needs_rotate=1
    return
  fi
  local end
  end=$(openssl x509 -enddate -noout -in "$cert" 2>/dev/null | cut -d= -f2 || echo "")
  if [[ -z "$end" ]]; then
    needs_rotate=1
    return
  fi
  local end_epoch now days
  end_epoch=$(date -d "$end" +%s 2>/dev/null || echo 0)
  now=$(date +%s)
  days=$(( (end_epoch - now) / 86400 ))
  if [[ $days -lt 30 ]]; then
    echo "[tls-rotation] ${cert} expires in ${days}d — rotate" | tee -a "$LOG"
    needs_rotate=1
  fi
}

check_expiry "${ROOT}/infra/tls/dev/server.crt"
check_expiry "${ROOT}/infra/tls/mtls/server.crt"

if [[ $needs_rotate -eq 1 ]]; then
  bash "${ROOT}/scripts/rotate-tls-certs.sh" 2>&1 | tee -a "$LOG"
else
  echo "[tls-rotation] certs OK (>30d)" | tee -a "$LOG"
fi
