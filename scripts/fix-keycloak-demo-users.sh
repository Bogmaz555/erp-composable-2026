#!/usr/bin/env bash
# Clear Keycloak required actions on demo users (fixes "Account is not fully set up")
set -euo pipefail
KC_URL="${KEYCLOAK_URL:-http://localhost:8080}"
REALM="${KEYCLOAK_REALM:-erp}"

if ! curl -sf "${KC_URL}/realms/${REALM}/.well-known/openid-configuration" >/dev/null 2>&1; then
  echo "SKIP: Keycloak not reachable"
  exit 0
fi

ADMIN_TOKEN=$(curl -s -X POST "${KC_URL}/realms/master/protocol/openid-connect/token" \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'grant_type=password' -d 'client_id=admin-cli' \
  -d 'username=admin' -d 'password=admin' \
  | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null || echo "")

if [[ -z "$ADMIN_TOKEN" ]]; then
  echo "SKIP: Keycloak admin token unavailable"
  exit 0
fi

for user in demo.engineer demo.buyer demo.accountant demo.inspector demo.admin; do
  uid=$(curl -s "${KC_URL}/admin/realms/${REALM}/users?username=${user}" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}" \
    | python3 -c "import sys,json; u=json.load(sys.stdin); print(u[0]['id'] if u else '')" 2>/dev/null || echo "")
  [[ -z "$uid" ]] && continue
  curl -s -X PUT "${KC_URL}/admin/realms/${REALM}/users/${uid}" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}" \
    -H 'Content-Type: application/json' \
    -d "{\"emailVerified\":true,\"requiredActions\":[],\"enabled\":true,\"firstName\":\"Demo\",\"lastName\":\"User\"}" >/dev/null || true
  curl -s -X PUT "${KC_URL}/admin/realms/${REALM}/users/${uid}/execute-actions-email" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}" \
    -H 'Content-Type: application/json' \
    -d '[]' >/dev/null 2>&1 || true
  echo "fixed user ${user}"
done

echo "Keycloak demo users patched"
