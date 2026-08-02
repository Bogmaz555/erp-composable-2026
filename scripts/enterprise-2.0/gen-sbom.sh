#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="${1:-$ROOT/docs/enterprise-2.0/sbom-cyclonedx.json}"
mkdir -p "$(dirname "$OUT")"
if command -v syft >/dev/null 2>&1; then
  syft dir:"$ROOT" -o cyclonedx-json >"$OUT"
  echo "SBOM → $OUT"
elif command -v pnpm >/dev/null 2>&1; then
  (cd "$ROOT" && pnpm list -r --json >"${OUT%.json}-pnpm-list.json" 2>/dev/null || true)
  echo "syft missing; wrote pnpm list fallback ${OUT%.json}-pnpm-list.json"
else
  echo "[]" >"$OUT"
  echo "no syft/pnpm; empty SBOM placeholder $OUT"
fi
