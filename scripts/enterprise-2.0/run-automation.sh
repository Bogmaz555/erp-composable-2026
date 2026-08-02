#!/usr/bin/env bash
# Enterprise 2.0 continuous automation control plane
#
# Usage:
#   bash scripts/enterprise-2.0/run-automation.sh once      # emit prompt + optional gate
#   bash scripts/enterprise-2.0/run-automation.sh step      # once + try local gate if phase=GATE
#   bash scripts/enterprise-2.0/run-automation.sh loop      # repeat step until DONE/BLOCKED
#   bash scripts/enterprise-2.0/run-automation.sh prompt    # only emit NEXT_AGENT_PROMPT.md
#   bash scripts/enterprise-2.0/run-automation.sh gate      # gate current milestone
#   bash scripts/enterprise-2.0/run-automation.sh advance success|fail [msg]
#
# Agent (Grok) does DESIGN/IMPLEMENT/RELEASE by pasting NEXT_AGENT_PROMPT.md.
# This script handles GATE locally and status/prompt emission for unattended loops.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
# shellcheck disable=SC1091
source "$(dirname "$0")/lib.sh"
require_files

MODE="${1:-once}"
shift || true

emit() {
  node "$(dirname "$0")/emit-next-prompt.mjs"
}

advance() {
  node "$(dirname "$0")/advance-phase.mjs" "$@"
}

do_gate() {
  local mid
  mid="$(current_milestone_id)"
  mid="${mid:-Q0}"
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
    git add docs/ENTERPRISE-2.0-STATUS.md docs/enterprise-2.0/NEXT_AGENT_PROMPT.md 2>/dev/null || true
    if ! git diff --cached --quiet 2>/dev/null; then
      git commit -m "chore(enterprise-2.0): automation status $(iso_now)" || true
    fi
    if [[ "${ENTERPRISE_PUSH:-1}" == "1" ]]; then
      git push -u origin HEAD 2>/dev/null || git push 2>/dev/null || log "push skipped (no remote access)"
    fi
  fi
}

print_agent_banner() {
  log "============================================================"
  log "GROK AGENT WORK WAITING"
  log "Paste file into Grok and let it run autonomously:"
  log "  $PROMPT_FILE"
  log "Then re-run: pnpm run enterprise:step"
  log "============================================================"
  if [[ -f "$PROMPT_FILE" ]]; then
    log "----- prompt preview (first 20 lines) -----"
    head -20 "$PROMPT_FILE" || true
    log "----- end preview -----"
  fi
}

case "$MODE" in
  prompt)
    emit
    print_agent_banner
    ;;
  gate)
    do_gate
    commit_status
    ;;
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
      log "BLOCKED — fix last_error in STATUS or re-run with advance success after manual fix"
      print_agent_banner
      exit 2
    fi
    if [[ "$phase" == "GATE" ]]; then
      do_gate || true
      commit_status
    else
      print_agent_banner
      commit_status
      # Exit code 10 = needs human/Grok agent paste
      exit 10
    fi
    ;;
  loop)
    MAX="${ENTERPRISE_MAX_ITER:-500}"
    SLEEP="${ENTERPRISE_LOOP_SLEEP:-300}"
    i=0
    while [[ $i -lt $MAX ]]; do
      i=$((i + 1))
      log "loop iteration $i/$MAX"
      set +e
      bash "$0" step
      ec=$?
      set -e
      phase="$(current_phase)"
      state="$(status_get state)"
      if [[ "$state" == "DONE" || "$phase" == "DONE" ]]; then
        log "DONE after $i iterations"
        exit 0
      fi
      if [[ "$state" == "BLOCKED" ]]; then
        log "BLOCKED — sleeping ${SLEEP}s then retry (agent may have fixed)"
      fi
      # If needs agent (exit 10), sleep longer for external Grok/scheduler
      if [[ $ec -eq 10 ]]; then
        log "Waiting ${SLEEP}s for agent to process NEXT_AGENT_PROMPT.md ..."
      fi
      sleep "$SLEEP"
    done
    log "max iterations reached"
    exit 1
    ;;
  *)
    echo "Usage: $0 once|step|loop|prompt|gate|advance"
    exit 1
    ;;
esac
