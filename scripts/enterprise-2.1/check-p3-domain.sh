#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
echo "check-p3-domain: scaffold OK (expand during p3 IMPLEMENT)"
# Require plan always
test -f docs/ENTERPRISE-2.1-PLAN.md
exit 0
