#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
# shellcheck disable=SC1091
source "$(dirname "$0")/lib.sh"
require_files

MID="${1:-$(current_milestone_id)}"
MID="${MID:-E0}"
log "gate-check milestone=$MID"
FAIL=0
run() {
  log "+ $*"
  if eval "$@"; then log "OK: $*"; else log "FAIL: $*"; FAIL=$((FAIL + 1)); fi
}

run "bash scripts/ci-no-secrets.sh"

mapfile -t EXTRA < <(node -e "
const m=require('$MILESTONES_FILE');
const x=m.milestones.find(z=>z.id==='$MID');
(x&&x.gate_commands||[]).forEach(c=>console.log(c));
")

for cmd in "${EXTRA[@]:-}"; do
  [[ -z "$cmd" ]] && continue
  if [[ "$cmd" == *gate-check.sh* ]]; then
    log "SKIP nested: $cmd"
    continue
  fi
  # de-dupe ci-no-secrets if listed again
  if [[ "$cmd" == *ci-no-secrets* ]]; then
    continue
  fi
  run "$cmd"
done

[[ -f docs/ENTERPRISE-ROADMAP.md ]] || { log "FAIL missing ROADMAP"; FAIL=$((FAIL + 1)); }

if [[ "$FAIL" -gt 0 ]]; then
  log "GATE FAILED count=$FAIL"
  exit 1
fi
log "GATE PASSED milestone=$MID"
exit 0
