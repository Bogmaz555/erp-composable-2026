#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
STATUS_FILE="$ROOT/docs/ENTERPRISE-ROADMAP-STATUS.md"
MILESTONES_FILE="$ROOT/docs/enterprise-roadmap/milestones.json"
PROMPT_FILE="$ROOT/docs/enterprise-roadmap/NEXT_AGENT_PROMPT.md"
STATE_DIR="$ROOT/docs/enterprise-roadmap/state"
LOG_DIR="${ENTERPRISE_ROADMAP_LOG_DIR:-/tmp/enterprise-roadmap-logs}"
mkdir -p "$STATE_DIR" "$LOG_DIR"
iso_now() { date -u +"%Y-%m-%dT%H:%M:%SZ"; }
status_get() {
  local key="$1"
  grep -E "^${key}:" "$STATUS_FILE" 2>/dev/null | head -1 | sed "s/^${key}:[[:space:]]*//" || true
}
require_files() {
  [[ -f "$STATUS_FILE" ]] || { echo "missing $STATUS_FILE"; exit 1; }
  [[ -f "$MILESTONES_FILE" ]] || { echo "missing $MILESTONES_FILE"; exit 1; }
}
current_milestone_id() { status_get "milestone" | tr -d '[:space:]'; }
current_phase() { status_get "phase" | tr -d '[:space:]'; }
log() { echo "[enterprise-roadmap $(iso_now)] $*"; }
