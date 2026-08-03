#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
# shellcheck disable=SC1091
source "$(dirname "$0")/lib.sh"
require_files

MODE="${1:-step}"
shift || true
emit() { node "$(dirname "$0")/emit-next-prompt.mjs"; }
advance() { node "$(dirname "$0")/advance-phase.mjs" "$@"; }

do_gate() {
  local mid
  mid="$(current_milestone_id)"
  mid="${mid:-E0}"
  if bash "$(dirname "$0")/gate-check.sh" "$mid"; then
    advance success "gate passed $mid"
    emit
    return 0
  else
    advance fail "gate failed $mid"
    emit
    return 1
  fi
}

commit_status() {
  if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    git add docs/ENTERPRISE-ROADMAP-STATUS.md docs/enterprise-roadmap/NEXT_AGENT_PROMPT.md 2>/dev/null || true
    if ! git diff --cached --quiet 2>/dev/null; then
      git commit -m "chore(enterprise-roadmap): automation status $(iso_now)" || true
    fi
    if [[ "${ENTERPRISE_PUSH:-1}" == "1" ]]; then
      git push -u origin HEAD 2>/dev/null || git push 2>/dev/null || log "push skipped"
    fi
  fi
}

case "$MODE" in
  prompt) emit ;;
  gate) do_gate; commit_status ;;
  advance)
    advance "${1:-success}" "${*:2}"
    emit
    commit_status
    ;;
  once|step)
    emit
    phase="$(current_phase)"
    state="$(status_get state)"
    log "state=$state milestone=$(current_milestone_id) phase=$phase"
    if [[ "$state" == "DONE" || "$phase" == "DONE" ]]; then
      log "Program DONE — nothing to do"
      exit 0
    fi
    if [[ "$state" == "BLOCKED" ]]; then
      log "BLOCKED — $(status_get last_error)"
      exit 2
    fi
    if [[ "$phase" == "GATE" ]]; then
      do_gate || true
      commit_status
    else
      log "Agent work required for phase=$phase — see $PROMPT_FILE"
      commit_status
      exit 10
    fi
    ;;
  status)
    log "milestone=$(current_milestone_id) phase=$(current_phase) state=$(status_get state)"
    ;;
  *)
    echo "Usage: $0 step|once|prompt|gate|advance|status"
    exit 1
    ;;
esac
