#!/usr/bin/env bash
# Enterprise 2.1 gate runner for milestone id (P0..P5)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
# shellcheck disable=SC1091
source "$(dirname "$0")/lib.sh"
require_files

MID="${1:-$(current_milestone_id)}"
MID="${MID:-P0}"
log "gate-check milestone=$MID"

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
run "pnpm run db:check:baselines" || true
if [ -f scripts/check-no-float-money.sh ]; then
  run "bash scripts/check-no-float-money.sh"
fi

mapfile -t EXTRA < <(node -e "
const m=require('$MILESTONES_FILE');
const x=m.milestones.find(z=>z.id==='$MID');
(x&&x.gate_commands||[]).forEach(c=>console.log(c));
")

for cmd in "${EXTRA[@]:-}"; do
  [[ -z "$cmd" ]] && continue
  # Never nest full gate-check for same program
  if [[ "$cmd" == *gate-check.sh* ]]; then
    log "SKIP nested gate-check: $cmd"
    continue
  fi
  run "$cmd"
done

[[ -f docs/ENTERPRISE-2.1-PLAN.md ]] || { log "FAIL missing PLAN"; FAIL=$((FAIL+1)); }
[[ -f docs/ADRs/ADR-008-Enterprise-2.0-Non-Negotiables.md ]] || { log "FAIL missing ADR-008"; FAIL=$((FAIL+1)); }

if [[ "$FAIL" -gt 0 ]]; then
  log "GATE FAILED count=$FAIL"
  exit 1
fi
log "GATE PASSED milestone=$MID"
exit 0
