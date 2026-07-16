#!/usr/bin/env bash
# W121 — Rotate Vault unseal keys (dev: re-init stub)
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STAMP="$(date +%Y%m%d-%H%M%S)"
ARCHIVE="${ROOT}/infra/vault/kms/archive/${STAMP}"
mkdir -p "$ARCHIVE"

if [[ -f "${ROOT}/infra/vault/unseal/unseal.key" ]]; then
  cp "${ROOT}/infra/vault/unseal/unseal.key" "${ARCHIVE}/"
fi

openssl rand -hex 32 > "${ROOT}/infra/vault/unseal/unseal.key"
chmod 600 "${ROOT}/infra/vault/unseal/unseal.key"
echo "Vault unseal key rotated — archive: ${ARCHIVE}"
