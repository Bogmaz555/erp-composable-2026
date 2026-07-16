#!/usr/bin/env bash
# ERP 2026 — Mission-Aware Autonomous Worker
# Czyta misje WARSTWA*.md → uruchamia pipeline → zapisuje checkpoint
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
export PATH="${HOME}/.local/share/mise/installs/node/22/bin:${PATH:-}"
LOG="${ROOT}/.agents/swarm/mission-worker.log"
CHECKPOINT="${ROOT}/.agents/orchestrator/CHECKPOINTS/MISSION-WORKER-LATEST.md"
LOOP=false
INTERVAL=600
QUICK=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --loop) LOOP=true; shift ;;
    --interval) INTERVAL="${2:-600}"; shift 2 ;;
    --quick) QUICK=true; shift ;;
    *) shift ;;
  esac
done

log() { echo "[$(date -Iseconds)] [mission] $*" | tee -a "$LOG"; }
mkdir -p "$(dirname "$LOG")" "$(dirname "$CHECKPOINT")" "${ROOT}/.agents/swarm"

list_missions() {
  find "${ROOT}/.agents/orchestrator/MISSIONS" -name 'WARSTWA*.md' 2>/dev/null | sort -V | tail -8
}

run_cycle() {
  log "========== MISSION WORKER CYCLE =========="
  local missions
  missions=$(list_missions | wc -l)
  log "missions tracked: ${missions}"

  if $QUICK; then
    npx tsx "${ROOT}/scripts/master-regression-report.ts" 2>&1 | tail -8 | tee -a "$LOG" || true
  else
    bash "${ROOT}/scripts/boot-docker-stack.sh" 2>&1 | tail -4 | tee -a "$LOG" || true
    bash "${ROOT}/scripts/ensure-finance-prod.sh" start 2>&1 | tail -2 | tee -a "$LOG" || true
    bash "${ROOT}/scripts/autonomous-master-orchestrator.sh" --quick 2>&1 | tail -12 | tee -a "$LOG" || true
  fi

  local score="n/a"
  if [[ -f "${ROOT}/.agents/swarm/regression-report.json" ]]; then
    score=$(python3 -c "import json; print(json.load(open('${ROOT}/.agents/swarm/regression-report.json')).get('score','?'))" 2>/dev/null || echo "?")
  fi

  cat > "$CHECKPOINT" <<EOF
# Mission Worker Checkpoint

**Updated:** $(date -Iseconds)
**Regression score:** ${score}%
**Missions:** ${missions}

## Last missions
$(list_missions | tail -5 | sed 's|.*/||')

## Commands
\`\`\`bash
bash scripts/autonomous-mission-worker.sh --loop
pnpm run pipeline:full
\`\`\`
EOF
  log "checkpoint → ${CHECKPOINT}"
  log "========== MISSION WORKER END =========="
}

if $LOOP; then
  log "LOOP interval=${INTERVAL}s"
  while true; do
    run_cycle || true
    sleep "$INTERVAL"
  done
else
  run_cycle
fi
