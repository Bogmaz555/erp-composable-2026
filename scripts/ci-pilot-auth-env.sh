#!/usr/bin/env bash
# ERP 2026 — CI gate: pilot / deploy auth profile must not disable enforcement.
#
# Always (static):
#   - prod/staging helm + k8s deploy must not set AUTH_ENFORCE=false / authEnforce: false
#   - prod/staging must not set AUTH_DISABLE=true
#
# When PILOT=1 or CI_PILOT=true (runtime pilot profile):
#   - fail if AUTH_ENFORCE=false or AUTH_DISABLE=true
#   - fail if USE_KEYCLOAK_JWKS is not true
#
# Run: bash scripts/ci-pilot-auth-env.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

FAILED=0
fail() {
  echo "FAIL: $*" >&2
  FAILED=1
}

echo "=== ci-pilot-auth-env ==="

# --- Static deploy profiles (prod / staging / k8s) ---
SCAN_FILES=(
  "infra/helm/erp/values.yaml"
  "infra/helm/erp/values-prod.yaml"
  "infra/helm/erp/values-staging.yaml"
  "infra/k8s/deploy/api-gateway.yaml"
  "infra/helm/erp/templates/api-gateway.yaml"
)

for f in "${SCAN_FILES[@]}"; do
  if [[ ! -f "$ROOT/$f" ]]; then
    continue
  fi
  # authEnforce: false in non-dev profiles
  if [[ "$f" != *values-dev* ]] && grep -nE 'authEnforce:\s*false' "$ROOT/$f" >/dev/null 2>&1; then
    fail "$f sets authEnforce: false (forbidden for pilot/prod/staging)"
  fi
  if grep -nE 'AUTH_ENFORCE["'\'']?\s*[:=]\s*["'\'']?false' "$ROOT/$f" >/dev/null 2>&1; then
    # templates may quote values from values.yaml — only flag literal false in deploy YAML
    if [[ "$f" == *deploy* ]] || [[ "$f" == *values-prod* ]] || [[ "$f" == *values-staging* ]] || [[ "$f" == *values.yaml ]]; then
      if grep -nE 'value:\s*["'\'']?false["'\'']?' "$ROOT/$f" | grep -i AUTH >/dev/null 2>&1 \
        || grep -nE 'name:\s*AUTH_ENFORCE' -A2 "$ROOT/$f" | grep -nE 'value:\s*["'\'']false["'\'']' >/dev/null 2>&1; then
        fail "$f sets AUTH_ENFORCE to false"
      fi
    fi
  fi
  if grep -nE 'AUTH_DISABLE.*true|name:\s*AUTH_DISABLE' "$ROOT/$f" >/dev/null 2>&1; then
    if grep -nE 'AUTH_DISABLE' -A2 "$ROOT/$f" | grep -nE 'value:\s*["'\'']?true' >/dev/null 2>&1; then
      fail "$f enables AUTH_DISABLE (forbidden in deploy)"
    fi
  fi
done

# Explicit check: k8s deploy AUTH_ENFORCE must be true
if [[ -f "$ROOT/infra/k8s/deploy/api-gateway.yaml" ]]; then
  if ! grep -A2 'name: AUTH_ENFORCE' "$ROOT/infra/k8s/deploy/api-gateway.yaml" | grep -q 'value: "true"'; then
    # allow value: 'true' or value: true
    if ! grep -A2 'name: AUTH_ENFORCE' "$ROOT/infra/k8s/deploy/api-gateway.yaml" | grep -qE 'value:\s*["'\'']?true'; then
      fail "infra/k8s/deploy/api-gateway.yaml AUTH_ENFORCE is not true"
    fi
  fi
fi

# Helm default values must enforce
if [[ -f "$ROOT/infra/helm/erp/values.yaml" ]]; then
  if grep -qE 'authEnforce:\s*false' "$ROOT/infra/helm/erp/values.yaml"; then
    fail "infra/helm/erp/values.yaml authEnforce: false (default must be true)"
  fi
fi
if [[ -f "$ROOT/infra/helm/erp/values-prod.yaml" ]]; then
  if grep -qE 'authEnforce:\s*false' "$ROOT/infra/helm/erp/values-prod.yaml"; then
    fail "values-prod.yaml authEnforce: false"
  fi
fi
if [[ -f "$ROOT/infra/helm/erp/values-staging.yaml" ]]; then
  if grep -qE 'authEnforce:\s*false' "$ROOT/infra/helm/erp/values-staging.yaml"; then
    fail "values-staging.yaml authEnforce: false"
  fi
fi

echo "✓ static deploy auth profile scan"

# --- Runtime pilot profile ---
if [[ "${PILOT:-}" == "1" || "${PILOT:-}" == "true" || "${CI_PILOT:-}" == "true" || "${CI_PILOT:-}" == "1" ]]; then
  echo "PILOT profile active (PILOT=${PILOT:-} CI_PILOT=${CI_PILOT:-})"
  if [[ "${AUTH_ENFORCE:-}" == "false" ]]; then
    fail "PILOT forbids AUTH_ENFORCE=false"
  fi
  if [[ "${AUTH_DISABLE:-}" == "true" ]]; then
    fail "PILOT forbids AUTH_DISABLE=true"
  fi
  if [[ "${USE_KEYCLOAK_JWKS:-}" != "true" ]]; then
    fail "PILOT requires USE_KEYCLOAK_JWKS=true (got '${USE_KEYCLOAK_JWKS:-}')"
  fi
  if [[ "$FAILED" -eq 0 ]]; then
    echo "✓ runtime pilot auth env"
  fi
else
  echo "○ runtime pilot checks skipped (set PILOT=1 or CI_PILOT=true to enforce)"
fi

if [[ "$FAILED" -ne 0 ]]; then
  echo "=== ci-pilot-auth-env: FAIL ===" >&2
  exit 1
fi
echo "=== ci-pilot-auth-env: PASS ==="
exit 0
