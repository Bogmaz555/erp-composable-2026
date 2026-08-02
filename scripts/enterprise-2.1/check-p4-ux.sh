#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"; cd "$ROOT"; FAIL=0
need(){ [[ -f "$1" ]] && echo "OK $1" || { echo "MISSING $1"; FAIL=$((FAIL+1)); }; }
need docs/ENTERPRISE-2.1-P4-UX-DESIGN.md
need docs/enterprise-2.1/UAT-ETO-WEEK.md
need docs/enterprise-2.1/WEBHOOK-DELIVERY.md
need apps/dms/src/storage.ts
need apps/frontend/app/eto-week/page.tsx
need apps/shared-kernel/src/webhook-sign.ts
need e2e/pilot-eto-complete.spec.ts
[[ $FAIL -gt 0 ]] && exit 1
echo "P4 structural PASS"; exit 0
