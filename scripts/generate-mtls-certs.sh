#!/usr/bin/env bash
# W101 — Generate mTLS CA + server + client certs for gateway dev profile
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MTLS_DIR="${ROOT}/infra/tls/mtls"
mkdir -p "$MTLS_DIR"

if [[ -f "${MTLS_DIR}/server.crt" && -f "${MTLS_DIR}/ca.crt" ]]; then
  echo "mTLS certs already exist at ${MTLS_DIR}"
  exit 0
fi

openssl genrsa -out "${MTLS_DIR}/ca.key" 2048
openssl req -x509 -new -nodes -key "${MTLS_DIR}/ca.key" -sha256 -days 825 \
  -out "${MTLS_DIR}/ca.crt" -subj "/CN=ERP Dev CA/O=ERP Composable/C=PL"

openssl genrsa -out "${MTLS_DIR}/server.key" 2048
openssl req -new -key "${MTLS_DIR}/server.key" -out "${MTLS_DIR}/server.csr" \
  -subj "/CN=erp-gateway.local/O=ERP Composable/C=PL"
openssl x509 -req -in "${MTLS_DIR}/server.csr" -CA "${MTLS_DIR}/ca.crt" -CAkey "${MTLS_DIR}/ca.key" \
  -CAcreateserial -out "${MTLS_DIR}/server.crt" -days 825 -sha256

openssl genrsa -out "${MTLS_DIR}/client.key" 2048
openssl req -new -key "${MTLS_DIR}/client.key" -out "${MTLS_DIR}/client.csr" \
  -subj "/CN=erp-client/O=ERP Composable/C=PL"
openssl x509 -req -in "${MTLS_DIR}/client.csr" -CA "${MTLS_DIR}/ca.crt" -CAkey "${MTLS_DIR}/ca.key" \
  -CAcreateserial -out "${MTLS_DIR}/client.crt" -days 825 -sha256

echo "Generated mTLS certs in ${MTLS_DIR}"
