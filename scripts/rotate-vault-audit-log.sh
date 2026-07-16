#!/usr/bin/env bash
# W125 — Rotate Vault audit log (archive + truncate)
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STAMP="$(date +%Y%m%d-%H%M%S)"
ARCHIVE="${ROOT}/infra/vault/audit/archive/${STAMP}"
LOG_FILE="${ROOT}/infra/vault/audit/audit.log"
mkdir -p "$ARCHIVE"

if [[ -f "$LOG_FILE" ]] && [[ -s "$LOG_FILE" ]]; then
  cp "$LOG_FILE" "${ARCHIVE}/audit.log"
  : > "$LOG_FILE"
  echo "Vault audit log rotated — archive: ${ARCHIVE}"
else
  touch "$LOG_FILE"
  echo "Vault audit log initialized"
fi
