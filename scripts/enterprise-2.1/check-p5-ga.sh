#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"; cd "$ROOT"; FAIL=0
need(){ [[ -f "$1" ]] && echo "OK $1" || { echo "MISSING $1"; FAIL=$((FAIL+1)); }; }
need docs/ENTERPRISE-2.1-P5-GA-DESIGN.md
need docs/enterprise-2.1/CUTOVER-RUNBOOK.md
need docs/enterprise-2.1/PENTEST-FINDINGS.md
need docs/enterprise-2.1/GA-LITE-SIGNOFF.md
need docs/enterprise-2.0/PENTEST-PACK.md
need docs/enterprise-2.0/ISO27001-CONTROL-MAP.md
need scripts/enterprise-2.0/gen-sbom.sh
need docs/ENTERPRISE-2.1-PLAN.md
[[ $FAIL -gt 0 ]] && exit 1
echo "P5 structural PASS"; exit 0
