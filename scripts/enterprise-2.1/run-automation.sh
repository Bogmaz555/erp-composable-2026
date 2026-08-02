#!/usr/bin/env bash
# Enterprise 2.1 control plane
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
# shellcheck disable=SC1091
source "$(dirname "$0")/lib.sh"
require_files

MODE="${1:-once}"
shift || true

emit() { node "$(dirname "$0")/emit-next-prompt.mjs"; }
advance() { node "$(dirname "$0")/advance-phase.mjs" "$@"; }

do_gate() {
  local mid
  mid="$(current_milestone_id)"
  mid="${mid:-P0}"
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
    git add docs/ENTERPRISE-2.1-STATUS.md docs/enterprise-2.1/NEXT_AGENT_PROMPT.md 2>/dev/null || true
    if ! git diff --cached --quiet 2>/dev/null; then
      git commit -m "chore(enterprise-2.1): automation status $(iso_now)" || true
    fi
    if [[ "${ENTERPRISE_PUSH:-1}" == "1" ]]; then
      git push -u origin HEAD 2>/dev/null || git push 2>/dev/null || log "push skipped"
    fi
  fi
}

print_agent_banner() {
  log "============================================================"
  log "GROK AGENT WORK WAITING (Enterprise 2.1)"
  log "  $PROMPT_FILE"
  log "Then: pnpm run enterprise21:step"
  log "============================================================"
  head -20 "$PROMPT_FILE" 2>/dev/null || true
}

case "$MODE" in
  prompt) emit; print_agent_banner ;;
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
      print_agent_banner
      exit 2
    fi
    if [[ "$phase" == "GATE" ]]; then
      do_gate || true
      commit_status
    else
      print_agent_banner
      commit_status
      exit 10
    fi
    ;;
  loop)
    MAX="${ENTERPRISE21_MAX_ITER:-500}"
    SLEEP="${ENTERPRISE21_LOOP_SLEEP:-300}"
    i=0
    while [[ $i -lt $MAX ]]; do
      i=$((i + 1))
      log "loop $i/$MAX"
      set +e
      bash "$0" step
      ec=$?
      set -e
      state="$(status_get state)"
      phase="$(current_phase)"
      if [[ "$state" == "DONE" || "$phase" == "DONE" ]]; then
        log "DONE after $i"
        exit 0
      fi
      sleep "$SLEEP"
    done
    exit 1
    ;;
  status)
    log "milestone=$(current_milestone_id) phase=$(current_phase) state=$(status_get state)"
    log "next=$(status_get next_action)"
    exit 0
    ;;
  *)
    echo "Usage: $0 once|step|loop|prompt|gate|advance|status"
    exit 1
    ;;
esac
