#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"; cd "$ROOT"; FAIL=0
need(){ [[ -f "$1" ]] && echo "OK $1" || { echo "MISSING $1"; FAIL=$((FAIL+1)); }; }
need docs/ENTERPRISE-2.1-P2-DR-DESIGN.md
need docs/enterprise-2.1/DR-EVIDENCE.md
need docs/enterprise-2.1/JETSTREAM-HA-RESIDUAL.md
need docs/enterprise-2.0/DR-RPO-RTO.md
need scripts/dr-drill.sh
need scripts/backup-dbs.sh
need infra/nats/HA.md
need infra/k8s/cronjob-backup-dbs.yaml
[[ $FAIL -gt 0 ]] && exit 1
echo "P2 structural PASS"; exit 0
