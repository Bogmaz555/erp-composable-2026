#!/usr/bin/env bash
# Enterprise 2.0 — unattended driver (no human paste required when Grok scheduler/workflow is on)
#
# Modes:
#   bash scripts/enterprise-2.0/autonomous-driver.sh once   # one control-plane tick
#   bash scripts/enterprise-2.0/autonomous-driver.sh loop   # forever until DONE
#   bash scripts/enterprise-2.0/autonomous-driver.sh status # print STATUS summary
#
# Environment:
#   ENTERPRISE_PUSH=1|0          push after status commits (default 1)
#   ENTERPRISE_LOOP_SLEEP=300    seconds between loop ticks
#   ENTERPRISE_MAX_ITER=2000
#   ENTERPRISE_AUTO_GATE=1       run gate when phase=GATE (default 1)
#   ENTERPRISE_LOCK_TIMEOUT=3600 lock TTL seconds
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
# shellcheck disable=SC1091
source "$(dirname "$0")/lib.sh"
require_files

MODE="${1:-once}"
LOCK="$STATE_DIR/driver.lock"
LOCK_TIMEOUT="${ENTERPRISE_LOCK_TIMEOUT:-3600}"
export ENTERPRISE_PUSH="${ENTERPRISE_PUSH:-1}"
export ENTERPRISE_AUTO_GATE="${ENTERPRISE_AUTO_GATE:-1}"

acquire_lock() {
  mkdir -p "$STATE_DIR"
  if [[ -f "$LOCK" ]]; then
    local age pid
    age=$(( $(date +%s) - $(stat -c %Y "$LOCK" 2>/dev/null || echo 0) ))
    pid="$(cat "$LOCK" 2>/dev/null || echo 0)"
    if [[ "$age" -lt "$LOCK_TIMEOUT" ]] && kill -0 "$pid" 2>/dev/null; then
      log "lock held by pid=$pid age=${age}s — skip"
      exit 0
    fi
    log "stale lock age=${age}s — taking over"
  fi
  echo $$ >"$LOCK"
  trap 'rm -f "$LOCK"' EXIT
}

print_status() {
  log "milestone=$(current_milestone_id) phase=$(current_phase) state=$(status_get state)"
  log "next=$(status_get next_action)"
  log "prompt=$PROMPT_FILE"
}

tick() {
  node "$(dirname "$0")/emit-next-prompt.mjs"
  local phase state mid
  phase="$(current_phase)"
  state="$(status_get state)"
  mid="$(current_milestone_id)"
  log "tick state=$state milestone=$mid phase=$phase"

  if [[ "$state" == "DONE" || "$phase" == "DONE" || "$mid" == "DONE" ]]; then
    log "PROGRAM DONE — enterprise automation complete"
    echo "DONE" >"$STATE_DIR/last_result"
    return 0
  fi

  if [[ "$state" == "BLOCKED" ]]; then
    log "BLOCKED last_error=$(status_get last_error)"
    echo "BLOCKED" >"$STATE_DIR/last_result"
    # Still emit prompt so agent can fix
    echo "AGENT_NEEDED" >"$STATE_DIR/handoff"
    return 2
  fi

  if [[ "$phase" == "GATE" && "$ENTERPRISE_AUTO_GATE" == "1" ]]; then
    log "auto GATE for $mid"
    if bash "$(dirname "$0")/gate-check.sh" "$mid"; then
      node "$(dirname "$0")/advance-phase.mjs" success "gate passed $mid"
      node "$(dirname "$0")/emit-next-prompt.mjs"
      git add docs/ENTERPRISE-2.0-STATUS.md docs/enterprise-2.0/NEXT_AGENT_PROMPT.md 2>/dev/null || true
      if ! git diff --cached --quiet 2>/dev/null; then
        git commit -m "chore(enterprise-2.0): GATE pass $mid → $(current_phase)" || true
      fi
      if [[ "${ENTERPRISE_PUSH}" == "1" ]]; then
        git push -u origin HEAD 2>/dev/null || git push 2>/dev/null || log "push skipped"
      fi
      echo "GATE_PASS" >"$STATE_DIR/last_result"
      echo "AGENT_NEEDED" >"$STATE_DIR/handoff"  # RELEASE needs agent
      return 0
    else
      node "$(dirname "$0")/advance-phase.mjs" fail "gate failed $mid"
      node "$(dirname "$0")/emit-next-prompt.mjs"
      git add docs/ENTERPRISE-2.0-STATUS.md docs/enterprise-2.0/NEXT_AGENT_PROMPT.md 2>/dev/null || true
      if ! git diff --cached --quiet 2>/dev/null; then
        git commit -m "chore(enterprise-2.0): GATE fail $mid BLOCKED" || true
      fi
      [[ "${ENTERPRISE_PUSH}" == "1" ]] && { git push 2>/dev/null || true; }
      echo "GATE_FAIL" >"$STATE_DIR/last_result"
      echo "AGENT_NEEDED" >"$STATE_DIR/handoff"
      return 1
    fi
  fi

  # DESIGN / IMPLEMENT / RELEASE → agent must run NEXT_AGENT_PROMPT
  echo "AGENT_NEEDED" >"$STATE_DIR/handoff"
  echo "WAIT_AGENT:$mid/$phase" >"$STATE_DIR/last_result"
  cat >"$STATE_DIR/RESUME.txt" <<EOF
RESUME Enterprise 2.0 full automation. No confirmation pauses.
Repo: $ROOT
git fetch && git checkout enterprise-2.0-automation && git pull --ff-only || true
Read docs/ENTERPRISE-2.0-STATUS.md and docs/enterprise-2.0/NEXT_AGENT_PROMPT.md
Execute NEXT_AGENT_PROMPT fully (milestone=$mid phase=$phase).
Update STATUS. Commit. Push.
Run: pnpm run enterprise:step
Continue until phase advances or BLOCKED/DONE.
EOF
  log "============================================================"
  log "AGENT WORK REQUIRED: $mid / $phase"
  log "Prompt: $PROMPT_FILE"
  log "Resume: $STATE_DIR/RESUME.txt"
  log "============================================================"
  return 10
}

acquire_lock

case "$MODE" in
  status)
    print_status
    if [[ -f "$STATE_DIR/last_result" ]]; then log "last_result=$(cat "$STATE_DIR/last_result")"; fi
    if [[ -f "$STATE_DIR/handoff" ]]; then log "handoff=$(cat "$STATE_DIR/handoff")"; fi
    exit 0
    ;;
  once|step)
    set +e
    tick
    ec=$?
    set -e
    print_status
    exit "$ec"
    ;;
  loop)
    MAX="${ENTERPRISE_MAX_ITER:-2000}"
    SLEEP="${ENTERPRISE_LOOP_SLEEP:-300}"
    i=0
    while [[ $i -lt $MAX ]]; do
      i=$((i + 1))
      log "driver loop $i/$MAX"
      set +e
      tick
      ec=$?
      set -e
      phase="$(current_phase)"
      state="$(status_get state)"
      if [[ "$state" == "DONE" || "$phase" == "DONE" ]]; then
        log "DONE after $i iterations"
        exit 0
      fi
      log "sleep ${SLEEP}s (exit=$ec) — external agent/scheduler should process handoff"
      sleep "$SLEEP"
    done
    log "max iterations"
    exit 1
    ;;
  *)
    echo "Usage: $0 once|step|loop|status"
    exit 1
    ;;
esac
