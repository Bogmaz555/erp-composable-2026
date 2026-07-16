#!/usr/bin/env bash
# ADR-004 guard: invoice/KSeF logic only in tax-legal (excluding docs/tests)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VIOLATIONS=0

echo "=== ADR-004 TaxLegal isolation check ==="

while IFS= read -r -d '' f; do
  case "$f" in
    *tax-legal*|*docs/*|*scripts/*|*.md|*check-adr004*) continue ;;
  esac
  if rg -q 'ksef|KSeF|JPK_V7|split.?payment' "$f" 2>/dev/null; then
    echo "VIOLATION: $f"
    VIOLATIONS=$((VIOLATIONS + 1))
  fi
done < <(find "$ROOT/apps" -name '*.ts' -print0 2>/dev/null)

if [ "$VIOLATIONS" -gt 0 ]; then
  echo "FAILED: $VIOLATIONS file(s) may breach TaxLegalPBC isolation"
  exit 1
fi

echo "PASSED: no KSeF/tax API usage outside tax-legal in apps/*.ts"
