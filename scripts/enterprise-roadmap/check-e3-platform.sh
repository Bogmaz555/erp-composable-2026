#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
FAIL=0
fail() { echo "FAIL: $*"; FAIL=$((FAIL + 1)); }
[[ -f docs/ENTERPRISE-ROADMAP-E3-DESIGN.md ]] || fail "missing E3 design"
[[ -f docs/enterprise-roadmap/CUTOVER-V2.md ]] || fail "missing cutover v2"
if [[ "$FAIL" -gt 0 ]]; then echo "check-e3 FAILED $FAIL"; exit 1; fi
echo "check-e3 PASSED (structural)"; exit 0
