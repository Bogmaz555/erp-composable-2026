#!/usr/bin/env bash
# E0 gate: GA-lite evidence pack present and honest fields set
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
FAIL=0
fail() { echo "FAIL: $*"; FAIL=$((FAIL + 1)); }
ok() { echo "OK: $*"; }

# Tags
for t in enterprise-2.1.0 enterprise-2.1.p0-bootstrap enterprise-2.1.p1-observability enterprise-2.1.p2-dr enterprise-2.1.p3-domain enterprise-2.1.p4-ux-dms; do
  if git rev-parse "refs/tags/$t" >/dev/null 2>&1 || git ls-remote --tags origin "refs/tags/$t" 2>/dev/null | grep -q .; then
    ok "tag $t"
  else
    fail "missing tag $t"
  fi
done

# Docs
[[ -f docs/enterprise-2.1/GA-LITE-SIGNOFF.md ]] || fail "missing GA-LITE-SIGNOFF"
[[ -f docs/enterprise-2.1/SECRETS-CONTRACT.md ]] || fail "missing SECRETS-CONTRACT"
[[ -f docs/enterprise-2.1/ONCALL-RUNBOOK.md ]] || fail "missing ONCALL-RUNBOOK"
[[ -f docs/enterprise-2.1/DR-EVIDENCE.md ]] || fail "missing DR-EVIDENCE"

# Signoff must contain evidence markers (not empty template only)
if grep -q 'EVIDENCE_PACK_DATE' docs/enterprise-2.1/GA-LITE-SIGNOFF.md; then
  ok "signoff has evidence pack date"
else
  fail "GA-LITE-SIGNOFF missing EVIDENCE_PACK_DATE"
fi

# GA_LITE_SIGNED in 2.1 STATUS
if grep -q 'GA_LITE_SIGNED: true' docs/ENTERPRISE-2.1-STATUS.md; then
  ok "ENTERPRISE-2.1-STATUS GA_LITE_SIGNED=true"
else
  fail "ENTERPRISE-2.1-STATUS GA_LITE_SIGNED not true"
fi

if grep -q 'GA_LITE_SIGNED: true' docs/ENTERPRISE-ROADMAP-STATUS.md; then
  ok "ROADMAP-STATUS GA_LITE_SIGNED=true"
else
  fail "ROADMAP-STATUS GA_LITE_SIGNED not true"
fi

# DR evidence has a dated row
if grep -qE '2026-|DRY-RUN|erp-pilot-dr' docs/enterprise-2.1/DR-EVIDENCE.md; then
  ok "DR evidence present"
else
  fail "DR evidence thin"
fi

if [[ "$FAIL" -gt 0 ]]; then
  echo "check-e0-signoff FAILED count=$FAIL"
  exit 1
fi
echo "check-e0-signoff PASSED"
exit 0
