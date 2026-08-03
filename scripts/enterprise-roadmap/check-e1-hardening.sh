#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
FAIL=0
fail() { echo "FAIL: $*"; FAIL=$((FAIL + 1)); }
ok() { echo "OK: $*"; }

[[ -f docs/ENTERPRISE-ROADMAP-E1-DESIGN.md ]] || fail "missing E1 design"
[[ -f docs/enterprise-2.1/JETSTREAM-HA-RESIDUAL.md ]] || fail "missing JS HA residual"
grep -qE 'pilot:\s*["'\'']?1' infra/helm/erp/values-prod.yaml || fail "values-prod pilot!=1"
grep -q 'useKeycloakJwks:\s*true' infra/helm/erp/values-prod.yaml || fail "values-prod jwks"
bash scripts/ci-pilot-auth-env.sh || fail "ci-pilot-auth-env"

if [[ "$FAIL" -gt 0 ]]; then echo "check-e1 FAILED $FAIL"; exit 1; fi
echo "check-e1 PASSED"; exit 0
