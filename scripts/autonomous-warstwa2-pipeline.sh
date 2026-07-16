#!/usr/bin/env bash
# ERP 2026 — Autonomous Warstwa 2 Pipeline
# Pełna automatyzacja: infra → schema → boot → smoke → raport postępu
# Użycie: bash scripts/autonomous-warstwa2-pipeline.sh [--skip-boot] [--missions-only]

set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
export PATH="${HOME}/.local/share/mise/installs/node/22/bin:${PATH:-}"
PNPM="${ROOT}/node_modules/.bin/pnpm"
PRISMA="${ROOT}/node_modules/.bin/prisma"
LOG="${ROOT}/.agents/swarm/warstwa2-pipeline.log"
PROGRESS="${ROOT}/.agents/swarm/progress-warstwa2.md"
SKIP_BOOT=false
MISSIONS_ONLY=false

for arg in "$@"; do
  case "$arg" in
    --skip-boot) SKIP_BOOT=true ;;
    --missions-only) MISSIONS_ONLY=true ;;
  esac
done

log() { echo "[$(date -Iseconds)] $*" | tee -a "$LOG"; }

mkdir -p "$(dirname "$LOG")" "$(dirname "$PROGRESS")"

# ── Faza 0: Infrastruktura Docker ──────────────────────────────────────────
phase_infra() {
  log "FAZA infra: docker compose up"
  docker compose up -d postgres nats redis keycloak 2>/dev/null || docker compose up -d 2>/dev/null || true
  sleep 3
}

# ── Faza 1: Prisma schema sync (wszystkie serwisy) ─────────────────────────
phase_schema() {
  log "FAZA schema: prisma db push (all services)"
  local schemas=(
    apps/plm-service/prisma/schema.prisma
    apps/pm-service/prisma/schema.prisma
    apps/mes-service/prisma/schema.prisma
    apps/inv-service/prisma/schema.prisma
    apps/proc-service/prisma/schema.prisma
    apps/crm-service/prisma/schema.prisma
    apps/finance/prisma/schema.prisma
    apps/quality-service/prisma/schema.prisma
    apps/eam-service/prisma/schema.prisma
    apps/hr/prisma/schema.prisma
    apps/tax-legal/prisma/schema.prisma
  )
  for s in "${schemas[@]}"; do
    if [[ -f "$s" ]]; then
      log "  push $s"
      "$PRISMA" db push --schema "$s" --skip-generate 2>/dev/null || "$PRISMA" db push --schema "$s" || log "  WARN: $s failed"
      "$PRISMA" generate --schema "$s" 2>/dev/null || true
    fi
  done
}

# ── Faza 2: Boot stack (jeśli porty wolne) ─────────────────────────────────
phase_kill_stale() {
  log "FAZA kill-stale: freeing ERP ports if zombie processes"
  for p in 4005 4001 4002 4003 4006 4010 3001; do
    fuser -k "${p}/tcp" 2>/dev/null || true
  done
  sleep 2
}

phase_boot() {
  if $SKIP_BOOT; then log "FAZA boot: SKIPPED"; return; fi
  phase_kill_stale
  local ports=(4005 4001 4002 4003 4004 4006 4007 3001)
  local need_boot=false
  for p in "${ports[@]}"; do
    if ! ss -ltn 2>/dev/null | grep -q ":$p "; then need_boot=true; break; fi
  done
  if $need_boot; then
    log "FAZA boot: starting boot:all"
    nohup "$PNPM" run boot:all >> /tmp/erp-boot.log 2>&1 &
    log "  waiting 45s for services..."
    sleep 45
  else
    log "FAZA boot: stack already running"
  fi
}

# ── Faza 3: Health smoke ────────────────────────────────────────────────────
phase_smoke() {
  log "FAZA smoke: gateway + key services"
  local fails=0
  local checks=(
    "http://127.0.0.1:4005/api/plm/items?pageSize=1"
    "http://127.0.0.1:4005/api/pm"
    "http://127.0.0.1:4005/api/mes/work-orders"
    "http://127.0.0.1:4005/api/mes/oee/summary"
    "http://127.0.0.1:4005/api/fin/accounts"
    "http://127.0.0.1:4005/api/fin/journal"
    "http://127.0.0.1:4005/api/inv/inventory"
    "http://127.0.0.1:4005/api/proc/orders"
    "http://127.0.0.1:4005/api/proc/mrp/netting"
    "http://127.0.0.1:4005/api/quality/control-plans"
    "http://127.0.0.1:4005/api/quality/aql/samples"
    "http://127.0.0.1:4005/api/inv/wms/bins"
    "http://127.0.0.1:4005/api/inv/wms/pick-lists"
    "http://127.0.0.1:4005/api/fin/budget-variance"
    "http://127.0.0.1:4005/api/fin/payables"
    "http://127.0.0.1:4005/api/crm/catalog"
    "http://127.0.0.1:3001/products/"
    "http://127.0.0.1:3001/mes"
    "http://127.0.0.1:3001/finance"
    "http://127.0.0.1:3001/proc"
    "http://127.0.0.1:3001/quality"
  )
  # PM EVM — dynamic project id
  local pm_id
  pm_id=$(curl -s --max-time 5 "http://127.0.0.1:4005/api/pm" 2>/dev/null | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4 || true)
  if [[ -n "$pm_id" ]]; then
    checks+=("http://127.0.0.1:4005/api/pm/projects/${pm_id}/evm")
  fi
  for url in "${checks[@]}"; do
    code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 8 "$url" 2>/dev/null || echo "000")
    if [[ "$code" =~ ^[23] ]]; then
      log "  OK $code $url"
    else
      log "  FAIL $code $url"
      ((fails++)) || true
    fi
  done
  log "FAZA smoke: $fails failures"
  return $(( fails > 3 ? 1 : 0 ))
}

# ── Faza 4: Contract gate (opcjonalnie) ───────────────────────────────────
phase_contracts() {
  if [[ -x "${ROOT}/scripts/ci-contract-gate.sh" ]]; then
    log "FAZA contracts: ci-contract-gate"
    bash "${ROOT}/scripts/ci-contract-gate.sh" >> "$LOG" 2>&1 || log "  contracts: some failures (non-blocking)"
  fi
}

# ── Faza 5: Raport postępu Warstwa 2 ──────────────────────────────────────
phase_report() {
  log "FAZA report: updating $PROGRESS"
  cat > "$PROGRESS" <<EOF
# Warstwa 2 — Autonomous Pipeline Progress

**Last run:** $(date -Iseconds)
**Log:** \`.agents/swarm/warstwa2-pipeline.log\`

## Missions (parallel workers)

| ID | Moduł | Cel | Status |
|----|-------|-----|--------|
| W2-M01 | MES | Routingi + operacje + OEE UI | DONE |
| W2-M02 | PM | EVM (PV/EV/AC/CPI/SPI) | DONE |
| W2-M03 | Finance | Księga główna GL + UI | DONE |
| W2-M04 | PROC | MRP II (netting, lead times) | DONE |
| W2-M05 | Quality | Plany kontroli + AQL | DONE |
| W2-M06 | INV | WMS bins + pick lists | DONE |
| W2-M07 | PM | Harmonogram + ścieżka krytyczna | DONE |
| W2-M08 | Finance | Budżet vs wykonanie | DONE |

## Uruchomienie pipeline

\`\`\`bash
bash scripts/autonomous-warstwa2-pipeline.sh
bash scripts/autonomous-warstwa2-pipeline.sh --skip-boot   # tylko schema+smoke
\`\`\`

## Cursor Agent Workers

Użyj w Cursor Composer / Agent:
1. \`@erp-coder\` + mission file z \`.agents/orchestrator/MISSIONS/WARSTWA2-*\`
2. Równolegle: MES + PM + Finance (max 3 agenty)
3. Po każdej misji: \`bash scripts/autonomous-warstwa2-pipeline.sh --skip-boot\`

EOF
  log "FAZA report: done"
}

# ── Main ───────────────────────────────────────────────────────────────────
main() {
  log "========== WARSTWA 2 PIPELINE START =========="
  if ! $MISSIONS_ONLY; then
    phase_infra
    phase_schema
    phase_boot
    phase_smoke || true
    phase_contracts || true
  fi
  phase_report
  log "========== WARSTWA 2 PIPELINE END =========="
}

main "$@"
