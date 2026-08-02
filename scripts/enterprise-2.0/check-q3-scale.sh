#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
FAIL=0
need() { if [[ ! -f "$1" ]]; then echo "MISSING $1"; FAIL=$((FAIL+1)); else echo "OK $1"; fi; }
need docs/ENTERPRISE-0.4-SCALE-DESIGN.md
need infra/nats/HA.md
need infra/k8s/networkpolicy/default-deny-ingress.yaml
need infra/k8s/networkpolicy/allow-gateway-ingress.yaml
need scripts/load/eto-path.k6.js
need apps/shared-kernel/src/tenancy-model.ts
need infra/helm/erp/templates/hpa-pdb-core.yaml
# tenancy export
grep -q tenancy-model apps/shared-kernel/src/index.ts || { echo "MISSING export tenancy-model"; FAIL=$((FAIL+1)); }
# gateway wires assert
grep -q assertTenancyModel apps/api-gateway/src/main.ts || { echo "MISSING assertTenancyModel in gateway"; FAIL=$((FAIL+1)); }
if [[ "$FAIL" -gt 0 ]]; then echo "Q3 structural FAIL count=$FAIL"; exit 1; fi
echo "Q3 structural PASS"
exit 0
