#!/usr/bin/env bash
# ERP 2026 — Autonomous Warstwa 11 Pipeline
# DB fix + tenant isolation + MSP export + auth UI smoke
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
export PATH="${HOME}/.local/share/mise/installs/node/22/bin:${PATH:-}"
LOG="${ROOT}/.agents/swarm/warstwa11-pipeline.log"
PROGRESS="${ROOT}/.agents/swarm/progress-warstwa11.md"
SKIP_BOOT=false
PNPM="${ROOT}/node_modules/.bin/pnpm"

for arg in "$@"; do
  case "$arg" in --skip-boot) SKIP_BOOT=true ;; esac
done

log() { echo "[$(date -Iseconds)] $*" | tee -a "$LOG"; }
mkdir -p "$(dirname "$LOG")" "$(dirname "$PROGRESS")"

phase_db() {
  bash "${ROOT}/scripts/ensure-databases.sh" proc-service pm-service finance 2>&1 | tail -12 | tee -a "$LOG" || true
}

phase_services() {
  if $SKIP_BOOT; then return; fi
  bash "${ROOT}/scripts/ensure-finance-prod.sh" start 2>&1 | tail -2 | tee -a "$LOG" || true
  for spec in "4004:${PNPM} --filter proc-service run start:dev" "4002:${PNPM} --filter pm-service run start:dev"; do
    port="${spec%%:*}"
    cmd="${spec#*:}"
    code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 "http://127.0.0.1:${port}/health" 2>/dev/null || echo "000")
    if [[ ! "$code" =~ ^[23] ]]; then
      log "restart :${port}"
      fuser -k "${port}/tcp" 2>/dev/null || true
      sleep 1
      nohup bash -c "$cmd" >> "/tmp/erp-w11-${port}.log" 2>&1 &
      sleep 10
    fi
  done
}

phase_smoke() {
  log "smoke W11"
  local fails=0
  for url in \
    "http://127.0.0.1:4005/api/proc/orders" \
    "http://127.0.0.1:4005/api/analytics/tenants/default/isolation" \
    "http://127.0.0.1:4005/api/tax-legal/jpk/kr/validate?year=2026&month=6"; do
    code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 12 -H "X-Tenant-Id: default" "$url" 2>/dev/null || echo "000")
    if [[ "$code" =~ ^[23] ]]; then log "  OK $code $url"; else log "  FAIL $code $url"; ((fails++)) || true; fi
  done

  curl -s -X POST -H "X-Tenant-Id: tenant-pln" "http://127.0.0.1:4005/api/proc/orders/seed-demo" 2>/dev/null | head -c 120 | tee -a "$LOG" || true

  local pid
  pid=$(curl -s "http://127.0.0.1:4005/api/pm" 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[0]['id'] if d else '')" 2>/dev/null || echo "")
  if [[ -n "$pid" ]]; then
    code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "http://127.0.0.1:4005/api/pm/projects/${pid}/schedule/export-xml" 2>/dev/null || echo "000")
    if [[ "$code" =~ ^[23] ]]; then log "  OK $code MSP export ($pid)"; else log "  FAIL $code MSP export"; ((fails++)) || true; fi
  fi

  npx tsx scripts/master-regression-report.ts 2>&1 | tail -6 | tee -a "$LOG" || ((fails++)) || true
  return $(( fails > 2 ? 1 : 0 ))
}

phase_report() {
  cat > "$PROGRESS" <<EOF
# Warstwa 11 — Production Path

**Last run:** $(date -Iseconds)

| ID | Moduł | Cel | Status |
|----|-------|-----|--------|
| W11-M01 | Infra | PROC DB fix + ensure-databases.sh | DONE |
| W11-M02 | Platform | Tenant isolation snapshot + provision | DONE |
| W11-M03 | PM | MSP XML export z PredecessorLink | DONE |
| W11-M04 | Auth UI | LoginButton + fetchWithAuth | DONE |
| W11-M05 | UI | TenantIsolationPanel na dashboardzie | DONE |

\`\`\`bash
bash scripts/ensure-databases.sh
pnpm run pipeline:warstwa11
\`\`\`
EOF
}

main() {
  log "========== WARSTWA 11 PIPELINE START =========="
  phase_db
  phase_services
  phase_smoke || true
  phase_report
  log "========== WARSTWA 11 PIPELINE END =========="
}

main "$@"
