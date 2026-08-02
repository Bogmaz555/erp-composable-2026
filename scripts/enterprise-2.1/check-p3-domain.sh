#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"; cd "$ROOT"; FAIL=0
need(){ [[ -f "$1" ]] && echo "OK $1" || { echo "MISSING $1"; FAIL=$((FAIL+1)); }; }
need docs/ENTERPRISE-2.1-P3-DOMAIN-DESIGN.md
need docs/enterprise-2.1/DOMAIN-P3-OPS.md
need docs/enterprise-2.0/KSEF-RUNBOOK.md
need docs/enterprise-2.0/TEMPORAL-Q2.md
need apps/finance/src/period-close.service.ts
need apps/shared-kernel/src/outbox-relay.ts
[[ $FAIL -gt 0 ]] && exit 1
echo "P3 structural PASS"; exit 0
