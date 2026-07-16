#!/usr/bin/env bash
# ERP 2026 — Build all NestJS backend services (excludes frontend, analytics*, dms)
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
# shellcheck source=erp-env.sh
source "${ROOT}/scripts/erp-env.sh"

echo "[nest-build-all] prisma generate (services with schema)"
for svc in tax-legal inv-service proc-service pm-service analytics-service mes-service plm-service crm-service quality-service eam-service hr finance; do
  SCHEMA="${ROOT}/apps/${svc}/prisma/schema.prisma"
  [[ -f "$SCHEMA" ]] || continue
  echo "  → ${svc}"
  (cd "${ROOT}/apps/${svc}" && "${PNPM}" exec prisma generate --schema=prisma/schema.prisma) 2>&1 | tail -1 || true
done

echo "[nest-build-all] nest build (filtered apps)"
"${PNPM}" --filter './apps/*' --filter '!frontend' --filter '!analytics*' --filter '!dms' exec nest build

echo "[nest-build-all] DONE"
