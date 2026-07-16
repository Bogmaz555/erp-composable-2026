#!/usr/bin/env bash
# W97 — Generate dev TLS certs for gateway (infra-gated prod-security profile)
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TLS_DIR="${ROOT}/infra/tls/dev"
mkdir -p "$TLS_DIR"

if [[ -f "${TLS_DIR}/server.crt" && -f "${TLS_DIR}/server.key" ]]; then
  echo "TLS dev certs already exist at ${TLS_DIR}"
  exit 0
fi

openssl req -x509 -newkey rsa:2048 -nodes \
  -keyout "${TLS_DIR}/server.key" \
  -out "${TLS_DIR}/server.crt" \
  -days 365 \
  -subj "/CN=erp-gateway.local/O=ERP Composable/C=PL"

echo "Generated ${TLS_DIR}/server.crt and server.key"
