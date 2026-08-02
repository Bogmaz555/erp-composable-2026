#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
FAIL=0
need() { if [[ ! -f "$1" ]]; then echo "MISSING $1"; FAIL=$((FAIL+1)); else echo "OK $1"; fi; }
need docs/ENTERPRISE-2.1-P1-OBS-DESIGN.md
need docs/enterprise-2.1/ONCALL-RUNBOOK.md
need apps/inv-service/src/tracing.ts
need apps/finance/src/tracing.ts
need apps/mes-service/src/tracing.ts
need apps/pm-service/src/tracing.ts
need apps/api-gateway/src/tracing.ts
need infra/prometheus/prometheus.yml
need infra/prometheus/alerts/enterprise-core.yml
need infra/grafana/dashboards/enterprise-core-slo.json
grep -q "import './tracing'" apps/inv-service/src/main.ts || { echo "FAIL inv main missing tracing import"; FAIL=$((FAIL+1)); }
grep -q "import './tracing'" apps/finance/src/main.ts || { echo "FAIL finance main missing tracing import"; FAIL=$((FAIL+1)); }
grep -q "import './tracing'" apps/mes-service/src/main.ts || { echo "FAIL mes main missing tracing import"; FAIL=$((FAIL+1)); }
grep -q 'erp-api-gateway' infra/prometheus/prometheus.yml || { echo "FAIL prom missing gateway job"; FAIL=$((FAIL+1)); }
grep -q 'metrics' apps/api-gateway/src/app.controller.ts || { echo "FAIL gateway missing metrics"; FAIL=$((FAIL+1)); }
if [[ "$FAIL" -gt 0 ]]; then echo "P1 structural FAIL $FAIL"; exit 1; fi
echo "P1 structural PASS"
exit 0
