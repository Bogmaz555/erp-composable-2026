#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
FAIL=0
fail() { echo "FAIL: $*"; FAIL=$((FAIL + 1)); }
[[ -f docs/ENTERPRISE-ROADMAP-E2-DESIGN.md ]] || fail "missing E2 design"
[[ -f docs/enterprise-roadmap/E2-UAT-PATH.md ]] || fail "missing E2 UAT path"
if [[ "$FAIL" -gt 0 ]]; then echo "check-e2 FAILED $FAIL"; exit 1; fi
echo "check-e2 PASSED (structural)"; exit 0
