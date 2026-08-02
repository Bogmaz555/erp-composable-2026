#!/usr/bin/env bash
# Enterprise 2.0 gate runner for milestone id (Q0..Q5)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
# shellcheck source=lib.sh
source "$(dirname "$0")/lib.sh"
require_files

MID="${1:-$(current_milestone_id)}"
MID="${MID:-Q0}"
log "gate-check milestone=$MID"

# Always: non-negotiable baseline gates
FAIL=0
run() {
  log "+ $*"
  if eval "$@"; then
    log "OK: $*"
  else
    log "FAIL: $*"
    FAIL=$((FAIL + 1))
  fi
}

run "bash scripts/ci-no-secrets.sh"
run "pnpm run db:check:baselines"
if [ -f scripts/check-no-float-money.sh ]; then
  run "bash scripts/check-no-float-money.sh"
fi
run "pnpm run smoke:pilot"

# Milestone-specific from JSON via node
mapfile -t EXTRA < <(node -e "
const m=require('$MILESTONES_FILE');
const x=m.milestones.find(z=>z.id==='$MID');
(x&&x.gate_commands||[]).forEach(c=>console.log(c));
")

for cmd in "${EXTRA[@]:-}"; do
  [[ -z "$cmd" ]] && continue
  # Skip REQUIRE_LIVE if stack down (detect gateway)
  if [[ "$cmd" == *REQUIRE_LIVE* ]]; then
    if ! curl -sf http://127.0.0.1:4005/api/health >/dev/null 2>&1; then
      log "WARN: gateway down — attempting boot-pilot-complete"
      bash scripts/boot-pilot-complete.sh || true
      sleep 5
    fi
  fi
  run "$cmd"
done

# ADR / plan presence
[[ -f docs/ADRs/ADR-008-Enterprise-2.0-Non-Negotiables.md ]] || { log "FAIL missing ADR-008"; FAIL=$((FAIL+1)); }
[[ -f docs/ENTERPRISE-2.0-PLAN.md ]] || { log "FAIL missing PLAN"; FAIL=$((FAIL+1)); }

if [[ "$FAIL" -gt 0 ]]; then
  log "GATE FAILED count=$FAIL"
  exit 1
fi
log "GATE PASSED milestone=$MID"
exit 0
