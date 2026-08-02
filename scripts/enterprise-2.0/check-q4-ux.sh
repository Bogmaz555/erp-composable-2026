#!/usr/bin/env bash
# Structural Q4 UX/MDM/DMS checks
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
FAIL=0
need() { if [[ ! -f "$1" ]]; then echo "MISSING $1"; FAIL=$((FAIL+1)); else echo "OK $1"; fi; }
need docs/ENTERPRISE-0.5-UX-DESIGN.md
need docs/MDM-SOR-MAP.md
need apps/shared-kernel/src/webhook-sign.ts
need apps/dms/src/dms.controller.ts
need apps/frontend/app/eto-week/page.tsx
grep -q 'DocumentVersion' apps/dms/prisma/schema.prisma || { echo "MISSING DocumentVersion"; FAIL=$((FAIL+1)); }
grep -q 'mdm/sor' apps/api-gateway/src/app.controller.ts || { echo "MISSING mdm/sor"; FAIL=$((FAIL+1)); }
grep -q 'allowedIndices' apps/search-service/src/search-service.service.ts || { echo "MISSING search authz"; FAIL=$((FAIL+1)); }
grep -q 'webhook-sign' apps/shared-kernel/src/index.ts || { echo "MISSING webhook-sign export"; FAIL=$((FAIL+1)); }
if [[ "$FAIL" -gt 0 ]]; then echo "Q4 structural FAIL count=$FAIL"; exit 1; fi
echo "Q4 structural PASS"
exit 0
