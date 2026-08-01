#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# Idempotent NATS JetStream stream bootstrap — ERP Pilot v1
#
# Streams:  ETO_CORE | SUPPLY | QUALITY
# Consumers (pull durables): fin-wip-worker, inv-eto-worker, mes-eto-worker,
#                            proc-supply-worker, quality-worker
#
# Usage:
#   bash scripts/nats-bootstrap-streams.sh
#   NATS_URL=nats://nats:4222 bash scripts/nats-bootstrap-streams.sh
#
# Env:
#   NATS_URL                         default nats://127.0.0.1:4222
#   NATS_BOOTSTRAP_SKIP_CONSUMERS=1  only create streams
#   NATS_JETSTREAM                   publish-path flag (PR 13/14); not required here
#   NATS_MONITOR_URL                 default http://127.0.0.1:8222
#
# Resolution order:
#   1) monorepo tsx / node --experimental-strip-types + shared-kernel jetstream module
#   2) nats CLI on PATH
#   3) docker run natsio/nats-box (host network)
# ═══════════════════════════════════════════════════════════════════════════════
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# shellcheck source=erp-env.sh
source "${ROOT}/scripts/erp-env.sh" 2>/dev/null || true

export NATS_URL="${NATS_URL:-nats://127.0.0.1:4222}"

log() { echo "[nats-bootstrap] $*"; }

# ── Primary: Node + shared-kernel jetstream module ────────────────────────────
run_node_kernel() {
  local -a node_path_parts=()

  # Ensure `nats` resolves (shared-kernel dependency).
  for d in \
    "${ROOT}/apps/shared-kernel/node_modules" \
    "${ROOT}/node_modules" \
    "${ROOT}/node_modules/.pnpm/node_modules"
  do
    [[ -d "$d" ]] && node_path_parts+=("$d")
  done
  export NODE_PATH="$(IFS=:; echo "${node_path_parts[*]}${NODE_PATH:+:}${NODE_PATH:-}")"

  # Prefer compiled dist via plain node (no tsx).
  if [[ -f "${ROOT}/apps/shared-kernel/dist/jetstream/index.js" ]]; then
    log "using node → nats-bootstrap-streams.cjs (shared-kernel dist)"
    node "${ROOT}/scripts/nats-bootstrap-streams.cjs"
    return $?
  fi

  # Build dist if tsc available under shared-kernel
  if [[ -f "${ROOT}/apps/shared-kernel/tsconfig.json" ]] && command -v npx >/dev/null 2>&1; then
    log "building @erp/shared-kernel (dist missing)…"
    if (cd "${ROOT}/apps/shared-kernel" && npx tsc -p tsconfig.json); then
      if [[ -f "${ROOT}/apps/shared-kernel/dist/jetstream/index.js" ]]; then
        log "using node → nats-bootstrap-streams.cjs (fresh dist)"
        node "${ROOT}/scripts/nats-bootstrap-streams.cjs"
        return $?
      fi
    fi
  fi

  # tsx path (dev)
  local runner="" script="${ROOT}/scripts/nats-bootstrap-streams.ts"
  for c in \
    "${ROOT}/node_modules/.bin/tsx" \
    "${ROOT}/apps/shared-kernel/node_modules/.bin/tsx"
  do
    if [[ -x "$c" ]]; then
      runner="$c"
      break
    fi
  done
  if [[ -n "$runner" ]]; then
    log "using ${runner} → nats-bootstrap-streams.ts"
    "$runner" "$script"
    return $?
  fi

  return 1
}

# ── nats CLI helpers (PATH or nats-box) ───────────────────────────────────────
# Use array NATS_PREFIX so filters like 'finance.wip.>' are never word-split / redirected.
NATS_PREFIX=()

nats_cmd() {
  "${NATS_PREFIX[@]}" "$@"
}

run_nats_cli_body() {
  ensure_stream_cli() {
    local name="$1"
    shift
    local subjects=("$@")
    local -a subj_flags=()
    local s
    for s in "${subjects[@]}"; do
      subj_flags+=(--subjects "$s")
    done

    if nats_cmd stream info "${name}" --server="${NATS_URL}" >/dev/null 2>&1; then
      log "stream ok: ${name}"
      nats_cmd stream edit "${name}" \
        --server="${NATS_URL}" \
        "${subj_flags[@]}" \
        --max-age=7d \
        --max-bytes=256MB \
        --force >/dev/null 2>&1 || true
    else
      log "stream create: ${name} subjects=${subjects[*]}"
      nats_cmd stream add "${name}" \
        --server="${NATS_URL}" \
        "${subj_flags[@]}" \
        --storage=file \
        --retention=limits \
        --discard=old \
        --max-age=7d \
        --max-bytes=256MB \
        --replicas=1 \
        --dupe-window=2m \
        --defaults
    fi
  }

  ensure_consumer_cli() {
    local stream="$1" durable="$2" filter="${3:-}"
    if nats_cmd consumer info "${stream}" "${durable}" --server="${NATS_URL}" >/dev/null 2>&1; then
      log "consumer ok: ${stream}/${durable}"
      return 0
    fi
    log "consumer create: ${stream}/${durable}"
    local -a args=(
      consumer add "${stream}" "${durable}"
      --server="${NATS_URL}"
      --pull
      --ack=explicit
      --deliver=all
      --replay=instant
      --max-deliver=-1
      --defaults
    )
    if [[ -n "${filter}" ]]; then
      args+=(--filter "${filter}")
    fi
    nats_cmd "${args[@]}"
  }

  # Quote subjects — unquoted `>` is a shell redirect.
  ensure_stream_cli ETO_CORE 'plm.>' 'pm.>' 'inventory.>' 'mes.>' 'finance.wip.>'
  ensure_stream_cli SUPPLY 'inv.stock.>' 'proc.>'
  ensure_stream_cli QUALITY 'quality.>' 'eam.>'

  if [[ "${NATS_BOOTSTRAP_SKIP_CONSUMERS:-}" != "1" ]]; then
    ensure_consumer_cli ETO_CORE fin-wip-worker 'finance.wip.>'
    ensure_consumer_cli ETO_CORE inv-eto-worker
    ensure_consumer_cli ETO_CORE mes-eto-worker 'mes.>'
    ensure_consumer_cli SUPPLY proc-supply-worker
    ensure_consumer_cli QUALITY quality-worker
  fi

  log "done (nats CLI)"
}

run_nats_cli() {
  if command -v nats >/dev/null 2>&1; then
    NATS_PREFIX=(nats)
    log "using nats CLI on PATH @ ${NATS_URL}"
    run_nats_cli_body
    return $?
  fi
  return 1
}

run_nats_box() {
  if ! command -v docker >/dev/null 2>&1; then
    return 1
  fi
  log "using docker natsio/nats-box @ ${NATS_URL}"
  # host network so nats://127.0.0.1:4222 from the box reaches the host NATS
  NATS_PREFIX=(docker run --rm --network host natsio/nats-box:latest nats)
  run_nats_cli_body
  return $?
}

# ── Optional: wait for NATS monitor HTTP (health) ────────────────────────────
wait_nats() {
  local mon="${NATS_MONITOR_URL:-http://127.0.0.1:8222}"
  local i
  for i in 1 2 3 4 5 6 7 8 9 10; do
    if curl -sf --max-time 2 "${mon}/healthz" >/dev/null 2>&1 \
      || curl -sf --max-time 2 "${mon}/varz" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done
  log "warn: monitor ${mon} not reachable — continuing (server may still accept clients)"
  return 0
}

wait_nats

if run_node_kernel; then
  exit 0
fi

log "node/tsx kernel path unavailable — trying nats CLI"
if run_nats_cli; then
  exit 0
fi

log "nats CLI unavailable — trying nats-box container"
if run_nats_box; then
  exit 0
fi

log "ERROR: no bootstrap runner available"
log "  - pnpm install (provides nats + tsx in monorepo), or"
log "  - install nats CLI: https://github.com/nats-io/natscli , or"
log "  - docker pull natsio/nats-box"
exit 1
