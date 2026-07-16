#!/usr/bin/env bash
# W113 — Rotate dev + mTLS certificates (backup old, regenerate new)
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STAMP="$(date +%Y%m%d-%H%M%S)"
ARCHIVE="${ROOT}/infra/tls/rotation/archive/${STAMP}"
mkdir -p "$ARCHIVE"

for dir in dev mtls; do
  src="${ROOT}/infra/tls/${dir}"
  if [[ -d "$src" ]]; then
    find "$src" -maxdepth 1 -type f \( -name '*.crt' -o -name '*.key' -o -name '*.csr' -o -name '*.srl' \) -exec cp {} "${ARCHIVE}/" \; 2>/dev/null || true
  fi
done

bash "${ROOT}/scripts/generate-dev-tls-certs.sh"
bash "${ROOT}/scripts/generate-mtls-certs.sh"
echo "TLS certs rotated — archive: ${ARCHIVE}"
