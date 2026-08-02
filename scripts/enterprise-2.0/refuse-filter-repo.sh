#!/usr/bin/env bash
# Refuse git history rewrite (Variant A) unless STATUS APPROVED_BY_USER_A=true
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
STATUS="$ROOT/docs/ENTERPRISE-2.0-STATUS.md"
if [[ "${1:-}" == "filter-repo" || "${1:-}" == "git-filter-repo" ]]; then
  if grep -q 'APPROVED_BY_USER_A: true' "$STATUS" 2>/dev/null; then
    echo "APPROVED_BY_USER_A=true — filter-repo allowed by policy (operator must still run carefully)"
    exit 0
  fi
  echo "REFUSED: git filter-repo / history rewrite blocked (Secrets Variant B)."
  echo "Set APPROVED_BY_USER_A=true in docs/ENTERPRISE-2.0-STATUS.md only with human approval."
  exit 1
fi
echo "OK: no filter-repo request"
exit 0
