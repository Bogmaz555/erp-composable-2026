#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
# Pass if ADR defers OR SHARED_RLS work present
if grep -qE 'DEFERRED|SHARED_RLS' docs/ENTERPRISE-ROADMAP-E4-DESIGN.md 2>/dev/null; then
  echo "check-e4 PASSED (ADR present)"
  exit 0
fi
echo "FAIL: missing E4 design/ADR"
exit 1
