#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
echo "check-p4-ux: scaffold OK (expand during p4 IMPLEMENT)"
# Require plan always
test -f docs/ENTERPRISE-2.1-PLAN.md
exit 0
