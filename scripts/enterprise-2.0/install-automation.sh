#!/usr/bin/env bash
# Install Enterprise 2.0 automation hooks (workflows + optional systemd user unit + log dir)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
LOG_DIR="${ENTERPRISE_LOG_DIR:-/tmp/enterprise-2.0-logs}"
mkdir -p "$LOG_DIR" "$ROOT/docs/enterprise-2.0/state" \
  "$ROOT/.grok/workflows" \
  "${HOME}/.grok/workflows"

# Project + user workflow copies
for f in enterprise-2.0-step.rhai enterprise-2.0-continuous.rhai; do
  if [[ -f "$ROOT/.grok/workflows/$f" ]]; then
    cp -f "$ROOT/.grok/workflows/$f" "${HOME}/.grok/workflows/$f"
    echo "installed workflow → ~/.grok/workflows/$f"
  fi
done

# Emit fresh prompt
node "$ROOT/scripts/enterprise-2.0/emit-next-prompt.mjs"

# Optional: background local gate loop (does not replace Grok agent)
if [[ "${ENTERPRISE_INSTALL_LOOP:-0}" == "1" ]]; then
  nohup env ENTERPRISE_LOOP_SLEEP="${ENTERPRISE_LOOP_SLEEP:-600}" ENTERPRISE_PUSH="${ENTERPRISE_PUSH:-1}" \
    bash "$ROOT/scripts/enterprise-2.0/autonomous-driver.sh" loop \
    >"$LOG_DIR/driver-loop.log" 2>&1 &
  echo $! >"$ROOT/docs/enterprise-2.0/state/driver.pid"
  echo "driver loop pid=$(cat "$ROOT/docs/enterprise-2.0/state/driver.pid") log=$LOG_DIR/driver-loop.log"
fi

cat <<EOF

Enterprise 2.0 automation installed.

Commands:
  pnpm run enterprise:prompt      # regenerate NEXT_AGENT_PROMPT
  pnpm run enterprise:step        # one tick (gate auto / agent handoff)
  pnpm run enterprise:autonomous  # same as autonomous-driver once
  pnpm run enterprise:loop        # local loop (gates + wait for agent)
  pnpm run enterprise:status      # status summary

Grok continuous:
  /workflow enterprise-2.0-continuous  (or open NEXT_AGENT_PROMPT.md)

Scheduler RESUME (every 2–6h):
  paste docs/enterprise-2.0/state/RESUME.txt or AGENT_CONTRACT resume block

Log dir: $LOG_DIR
EOF
