#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
FAIL=0
fail() { echo "FAIL: $*"; FAIL=$((FAIL + 1)); }
ok() { echo "OK: $*"; }

[[ -f docs/ENTERPRISE-ROADMAP-E2-DESIGN.md ]] || fail "missing E2 design"
[[ -f docs/enterprise-roadmap/E2-UAT-PATH.md ]] || fail "missing E2 UAT path"

# Code path presence
grep -q 'from-opportunity' apps/pm-service/src/project.controller.ts || fail "PM from-opportunity route"
grep -q 'crm.opportunity.won.v1' apps/crm-service/src/commands/update-pipeline-stage.handler.ts || fail "CRM won outbox"
grep -q 'CreateProjectFromOpportunityCommand' apps/pm-service/src/commands/create-project-from-opportunity.handler.ts || fail "PM create-from-opp handler"
grep -q '4005\|GATEWAY_URL' apps/frontend/app/crm/actions.ts || fail "frontend CRM gateway URL"

# Optional live smoke (SKIP-safe)
if [[ -f scripts/smoke-e2-crm-pm.ts ]]; then
  if npx tsx scripts/smoke-e2-crm-pm.ts; then
    ok "smoke-e2-crm-pm"
  else
    fail "smoke-e2-crm-pm"
  fi
fi

if [[ "$FAIL" -gt 0 ]]; then
  echo "check-e2 FAILED $FAIL"
  exit 1
fi
echo "check-e2 PASSED"
exit 0
