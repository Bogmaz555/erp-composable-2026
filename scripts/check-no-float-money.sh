#!/usr/bin/env bash
# KD-5 / PR 11+12: gate that money fields are Prisma Decimal (not Float).
#
# Scope = BLOCKLIST only (not "any Float in monorepo").
# Pilot-critical (PR 11) + secondary CRM/PLM standardCost (PR 12).
# Allowed residual Floats: engineering qty/weight/scrap, FTE units, hours, %, CRM tkw/margin.
#
# Usage:
#   bash scripts/check-no-float-money.sh
#   pnpm run check:no-float-money
#
# Exit 0 = all blocklist fields are Decimal in schema.prisma.
# Exit 1 = at least one blocklist field still typed as Float (or field missing).
set -euo pipefail

if [ "${1:-}" = "-h" ] || [ "${1:-}" = "--help" ]; then
  sed -n '2,16p' "$0" | sed 's/^# \{0,1\}//'
  exit 0
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FAILED=0

# Each entry: "relative/schema.prisma|FieldName"
# finance already Decimal — still asserted so regressions fail the gate.
# PR 11 pilot-critical + PR 12 secondary (CRM monetary + PLM standardCost).
BLOCKLIST=(
  "apps/finance/prisma/schema.prisma|amount"
  "apps/finance/prisma/schema.prisma|balance"
  "apps/finance/prisma/schema.prisma|wipBalance"
  "apps/finance/prisma/schema.prisma|materialReserved"
  "apps/finance/prisma/schema.prisma|laborCost"
  "apps/tax-legal/prisma/schema.prisma|amount"
  "apps/proc-service/prisma/schema.prisma|unitPrice"
  "apps/proc-service/prisma/schema.prisma|freightCost"
  "apps/proc-service/prisma/schema.prisma|customsDuty"
  "apps/proc-service/prisma/schema.prisma|landedUnitCost"
  "apps/pm-service/prisma/schema.prisma|budget"
  "apps/pm-service/prisma/schema.prisma|baselineCost"
  "apps/pm-service/prisma/schema.prisma|actualLaborCost"
  "apps/pm-service/prisma/schema.prisma|targetRevenue"
  "apps/hr/prisma/schema.prisma|hourlyRate"
  "apps/crm-service/prisma/schema.prisma|value"
  "apps/crm-service/prisma/schema.prisma|price"
  "apps/crm-service/prisma/schema.prisma|basePrice"
  "apps/plm-service/prisma/schema.prisma|standardCost"
)

echo "=== check-no-float-money (KD-5 blocklist + PR 12 secondary) ==="

check_field() {
  local schema="$1"
  local field="$2"
  local path="$ROOT/$schema"

  if [ ! -f "$path" ]; then
    echo "FAIL  missing schema: $schema"
    return 1
  fi

  # Match model field lines: optional leading spaces, field name, type.
  # Accept Decimal / Decimal? / Decimal[] etc. Reject Float / Float?.
  local line
  line="$(grep -E "^[[:space:]]+${field}[[:space:]]+" "$path" | head -1 || true)"
  if [ -z "$line" ]; then
    echo "FAIL  $schema — field '${field}' not found"
    return 1
  fi

  if echo "$line" | grep -qE "[[:space:]]Float(\?|\[\]|@|[[:space:]]|$)"; then
    echo "FAIL  $schema — ${field} is still Float: $(echo "$line" | xargs)"
    return 1
  fi

  if ! echo "$line" | grep -qE "[[:space:]]Decimal(\?|\[\]|@|[[:space:]]|$)"; then
    echo "FAIL  $schema — ${field} is not Decimal: $(echo "$line" | xargs)"
    return 1
  fi

  echo "OK    $schema — ${field} → Decimal"
  return 0
}

for entry in "${BLOCKLIST[@]}"; do
  schema="${entry%%|*}"
  field="${entry##*|}"
  if ! check_field "$schema" "$field"; then
    FAILED=$((FAILED + 1))
  fi
done

# Explicit residual (engineering qty / non-money — must remain Float)
RESIDUAL_OK=(
  "apps/pm-service/prisma/schema.prisma|ccpmBufferPct|Float"
  "apps/hr/prisma/schema.prisma|hours|Float"
  "apps/inv-service/prisma/schema.prisma|quantityUsed|Float"
  "apps/plm-service/prisma/schema.prisma|weightKg|Float"
  "apps/plm-service/prisma/schema.prisma|scrapFactor|Float"
  "apps/crm-service/prisma/schema.prisma|tkw|Float"
  "apps/crm-service/prisma/schema.prisma|marginCoefficient|Float"
)

echo "--- residual non-money Float (allowed) ---"
for entry in "${RESIDUAL_OK[@]}"; do
  schema="${entry%%|*}"
  rest="${entry#*|}"
  field="${rest%%|*}"
  expect="${rest##*|}"
  path="$ROOT/$schema"
  line="$(grep -E "^[[:space:]]+${field}[[:space:]]+" "$path" | head -1 || true)"
  if [ -z "$line" ]; then
    echo "WARN  residual field missing (ok if model removed): $schema $field"
    continue
  fi
  if echo "$line" | grep -qE "[[:space:]]${expect}(\?|\[\]|@|[[:space:]]|$)"; then
    echo "OK    residual $schema — ${field} remains ${expect}"
  else
    echo "NOTE  residual $schema — ${field} is not ${expect} (review if intentional): $(echo "$line" | xargs)"
  fi
done

if [ "$FAILED" -gt 0 ]; then
  echo "=== FAILED: $FAILED blocklist field(s) not Decimal ==="
  exit 1
fi

echo "=== PASSED: all KD-5 blocklist money fields are Decimal ==="
exit 0
