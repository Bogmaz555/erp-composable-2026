#!/usr/bin/env bash
# Structural P0 bootstrap checks (Enterprise 2.1)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
FAIL=0
need() { if [[ ! -f "$1" ]]; then echo "MISSING $1"; FAIL=$((FAIL+1)); else echo "OK $1"; fi; }

need docs/ENTERPRISE-2.1-PLAN.md
need docs/ENTERPRISE-2.1-STATUS.md
need docs/ENTERPRISE-2.1-P0-BOOTSTRAP-DESIGN.md
need docs/enterprise-2.1/SECRETS-CONTRACT.md
need infra/enterprise.env.example
need scripts/health-matrix.sh
need scripts/boot-enterprise.sh
need scripts/enterprise-2.1/check-p0-bootstrap.sh
need infra/helm/erp/values-prod.yaml
need infra/helm/erp/values-staging.yaml

grep -q 'ENTERPRISE' infra/enterprise.env.example || { echo "FAIL enterprise.env.example missing ENTERPRISE"; FAIL=$((FAIL+1)); }
grep -q 'NATS_JETSTREAM' infra/enterprise.env.example || { echo "FAIL enterprise.env missing NATS_JETSTREAM"; FAIL=$((FAIL+1)); }
grep -q 'enterprise:' infra/helm/erp/values-prod.yaml || { echo "FAIL values-prod missing enterprise block"; FAIL=$((FAIL+1)); }
grep -q 'natsJetstream' infra/helm/erp/values-prod.yaml || { echo "FAIL values-prod missing natsJetstream"; FAIL=$((FAIL+1)); }
grep -q 'ENTERPRISE' infra/helm/erp/templates/api-gateway.yaml || { echo "FAIL gateway template missing ENTERPRISE env"; FAIL=$((FAIL+1)); }
grep -q 'NATS_JETSTREAM' infra/helm/erp/templates/api-gateway.yaml || { echo "FAIL gateway template missing NATS_JETSTREAM"; FAIL=$((FAIL+1)); }
grep -q 'health:matrix\|health-matrix' package.json || { echo "FAIL package.json missing health:matrix"; FAIL=$((FAIL+1)); }
grep -q 'boot:enterprise\|boot-enterprise' package.json || { echo "FAIL package.json missing boot:enterprise"; FAIL=$((FAIL+1)); }
test -x scripts/health-matrix.sh || { echo "FAIL health-matrix not executable"; FAIL=$((FAIL+1)); }
test -x scripts/boot-enterprise.sh || { echo "FAIL boot-enterprise not executable"; FAIL=$((FAIL+1)); }

if [[ "$FAIL" -gt 0 ]]; then
  echo "P0 structural FAIL count=$FAIL"
  exit 1
fi
echo "P0 structural PASS"
exit 0
