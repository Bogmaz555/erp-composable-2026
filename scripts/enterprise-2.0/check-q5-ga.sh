#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
FAIL=0
need() { if [[ ! -f "$1" ]]; then echo "MISSING $1"; FAIL=$((FAIL+1)); else echo "OK $1"; fi; }
need docs/ENTERPRISE-2.0-GA-DESIGN.md
need docs/enterprise-2.0/SLO-MATRIX.md
need docs/enterprise-2.0/DR-RPO-RTO.md
need docs/enterprise-2.0/PENTEST-PACK.md
need docs/enterprise-2.0/ISO27001-CONTROL-MAP.md
need infra/helm/README-UMBRELLA.md
need scripts/enterprise-2.0/gen-sbom.sh
need scripts/dr-drill.sh
if [[ "$FAIL" -gt 0 ]]; then echo "Q5 structural FAIL count=$FAIL"; exit 1; fi
echo "Q5 structural PASS"
exit 0
