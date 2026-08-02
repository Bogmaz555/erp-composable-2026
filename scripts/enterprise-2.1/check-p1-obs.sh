#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
echo "check-p1-obs: scaffold OK (expand during p1 IMPLEMENT)"
# Require plan always
test -f docs/ENTERPRISE-2.1-PLAN.md
exit 0
