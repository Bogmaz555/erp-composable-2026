#!/usr/bin/env bash
# Structural P0 checks (filled as implement lands)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
FAIL=0
need() { if [[ ! -f "$1" ]]; then echo "MISSING $1"; FAIL=$((FAIL+1)); else echo "OK $1"; fi; }
need docs/ENTERPRISE-2.1-PLAN.md
need docs/ENTERPRISE-2.1-STATUS.md
need docs/enterprise-2.1/milestones.json
need infra/enterprise.env.example
# design lands in P0 DESIGN phase
if [[ -f docs/ENTERPRISE-2.1-P0-BOOTSTRAP-DESIGN.md ]]; then
  echo "OK docs/ENTERPRISE-2.1-P0-BOOTSTRAP-DESIGN.md"
else
  echo "PENDING design docs/ENTERPRISE-2.1-P0-BOOTSTRAP-DESIGN.md (ok until DESIGN done)"
fi
if [[ "$FAIL" -gt 0 ]]; then echo "P0 structural FAIL $FAIL"; exit 1; fi
echo "P0 structural PASS (scaffold)"
exit 0
