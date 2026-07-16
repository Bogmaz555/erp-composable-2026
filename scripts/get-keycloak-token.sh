#!/usr/bin/env bash
# Obtain dev JWT from Keycloak realm erp (docker compose keycloak service)
set -euo pipefail

KC_URL="${KEYCLOAK_URL:-http://localhost:8080}"
REALM="${KEYCLOAK_REALM:-erp}"
CLIENT="${KEYCLOAK_CLIENT:-erp-gateway}"
USER="${KEYCLOAK_USER:-demo.engineer}"
PASS="${KEYCLOAK_PASS:-demo123}"

RESP=$(curl -s -X POST "${KC_URL}/realms/${REALM}/protocol/openid-connect/token" \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d "grant_type=password" \
  -d "client_id=${CLIENT}" \
  -d "username=${USER}" \
  -d "password=${PASS}" 2>/dev/null || echo '{}')

TOKEN=$(echo "$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null || echo "")

if [ -z "$TOKEN" ]; then
  echo "Failed to get token. Is Keycloak up? docker compose up -d keycloak" >&2
  exit 1
fi

echo "$TOKEN"
