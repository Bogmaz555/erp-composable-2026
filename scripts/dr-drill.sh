#!/usr/bin/env bash
# DR drill — backup → destroy DB volumes → restore → smoke (OQ-4).
#
# Contract (Pilot v1 / OQ-4):
#   RPO 24h  — nightly (or on-demand) pg_dump via scripts/backup-dbs.sh
#   RTO 2h   — restore drill target; this script measures wall-clock restore path
#
# Safety:
#   DR_DRILL_DRY_RUN=1 (default) — plan only; no volume destroy / restore.
#   DR_DRILL_DRY_RUN=0           — full destructive drill (local/pilot only).
#
# Usage:
#   ./scripts/dr-drill.sh
#   DR_DRILL_DRY_RUN=0 ./scripts/dr-drill.sh
#   DR_DRILL_DRY_RUN=0 BACKUP_ROOT=./backups ./scripts/dr-drill.sh
#   DR_DRILL_DRY_RUN=0 RESTORE_FROM=./backups/20260718_120000 ./scripts/dr-drill.sh
#
# Env:
#   DR_DRILL_DRY_RUN   default 1
#   BACKUP_ROOT        default ./backups
#   RESTORE_FROM       if set, skip backup and restore this directory
#   COMPOSE_PROJECT_NAME  optional; else resolved from `docker compose config`
#   GATEWAY_URL        default http://127.0.0.1:4005 (post-restore smoke)
#   DR_DRILL_SKIP_SMOKE  if 1, skip HTTP smoke after restore

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

DR_DRILL_DRY_RUN="${DR_DRILL_DRY_RUN:-1}"
BACKUP_ROOT="${BACKUP_ROOT:-./backups}"
RESTORE_FROM="${RESTORE_FROM:-}"
GATEWAY_URL="${GATEWAY_URL:-http://127.0.0.1:4005}"
DR_DRILL_SKIP_SMOKE="${DR_DRILL_SKIP_SMOKE:-0}"
RPO_TARGET_H="${RPO_TARGET_H:-24}"
RTO_TARGET_H="${RTO_TARGET_H:-2}"

# compose service list + volume keys (parity with docker-compose.yml)
DB_SERVICES=(
  crm-db pm-db mfg-db inv-db proc-db fin-db
  quality-db eam-db tax-db hr-db plm-db analytics-db
)
VOLUME_KEYS=(
  crm_pgdata pm_pgdata mfg_pgdata inv_pgdata proc_pgdata fin_pgdata
  quality_pgdata eam_pgdata tax_pgdata hr_pgdata plm_pgdata analytics_pgdata
)
CONTAINERS=(
  erp-crm-db erp-pm-db erp-mfg-db erp-inv-db erp-proc-db erp-fin-db
  erp-quality-db erp-eam-db erp-tax-db erp-hr-db erp-plm-db erp-analytics-db
)

is_dry() {
  case "${DR_DRILL_DRY_RUN}" in
    0|false|FALSE|no|NO) return 1 ;;
    *) return 0 ;;
  esac
}

log() { echo "[$(date -Iseconds)] [dr-drill] $*"; }
die() { log "ERROR: $*"; exit 1; }

if ! command -v docker >/dev/null 2>&1; then
  die "docker is required"
fi

# Resolve compose project for volume name parity:
# 1) COMPOSE_PROJECT_NAME env
# 2) volume prefix from a running erp-*-db container (authoritative when stack is up)
# 3) `docker compose config` name for this working tree
# 4) directory basename
resolve_compose_project() {
  if [[ -n "${COMPOSE_PROJECT_NAME:-}" ]]; then
    echo "$COMPOSE_PROJECT_NAME"
    return
  fi
  local c mount key prefix
  for c in "${CONTAINERS[@]}"; do
    mount="$(docker inspect "$c" --format '{{range .Mounts}}{{if eq .Destination "/var/lib/postgresql/data"}}{{.Name}}{{end}}{{end}}' 2>/dev/null || true)"
    if [[ -n "$mount" && "$mount" == *_pgdata ]]; then
      # e.g. erp-composable-2026_pm_pgdata → erp-composable-2026
      for key in "${VOLUME_KEYS[@]}"; do
        if [[ "$mount" == *"_${key}" ]]; then
          prefix="${mount%_${key}}"
          if [[ -n "$prefix" ]]; then
            echo "$prefix"
            return
          fi
        fi
      done
    fi
  done
  if docker compose version >/dev/null 2>&1; then
    local from_cfg
    from_cfg="$(docker compose config --format json 2>/dev/null | sed -n 's/.*"name"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1 || true)"
    if [[ -n "$from_cfg" ]]; then
      echo "$from_cfg"
      return
    fi
  fi
  basename "$ROOT"
}
COMPOSE_PROJECT="$(resolve_compose_project)"
log "=============================================="
log "DR drill — RPO ${RPO_TARGET_H}h / RTO ${RTO_TARGET_H}h (OQ-4)"
log "compose project: $COMPOSE_PROJECT"
if is_dry; then
  log "mode: DRY-RUN (set DR_DRILL_DRY_RUN=0 for live destroy+restore)"
else
  log "mode: LIVE (destructive — DB volumes will be removed)"
fi
log "=============================================="

DRILL_START_TS="$(date +%s)"
BACKUP_DIR=""

# ── 1) Backup ──────────────────────────────────────────────────────────────
if [[ -n "$RESTORE_FROM" ]]; then
  BACKUP_DIR="$RESTORE_FROM"
  [[ -d "$BACKUP_DIR" ]] || die "RESTORE_FROM not a directory: $BACKUP_DIR"
  log "Using existing backup: $BACKUP_DIR (skip live backup)"
else
  if is_dry; then
    log "DRY-RUN would: run scripts/backup-dbs.sh $BACKUP_ROOT"
    # Still attempt a non-destructive backup in dry-run when containers are up —
    # useful validation without volume destroy. Fail soft if nothing running.
    if out="$(bash "$ROOT/scripts/backup-dbs.sh" "$BACKUP_ROOT" 2>&1)"; then
      echo "$out"
      BACKUP_DIR="$(echo "$out" | tail -1)"
      log "Dry-run backup produced: $BACKUP_DIR"
    else
      echo "$out" || true
      log "WARNING: backup skipped/failed in dry-run (containers may be down)"
      BACKUP_DIR="${BACKUP_ROOT}/<timestamp>"
    fi
  else
    log "Phase 1/4: backup"
    out="$(bash "$ROOT/scripts/backup-dbs.sh" "$BACKUP_ROOT")"
    echo "$out"
    BACKUP_DIR="$(echo "$out" | tail -1)"
    [[ -d "$BACKUP_DIR" ]] || die "backup did not produce a directory"
    log "Backup ready: $BACKUP_DIR"
  fi
fi

# ── 2) Destroy volumes ─────────────────────────────────────────────────────
log "Phase 2/4: destroy DB volumes (project prefix ${COMPOSE_PROJECT}_*)"

destroy_volumes() {
  # Prefer fixed container_name stop/rm so drill works even when CWD compose
  # project differs from the stack that originally created the volumes.
  local c key vol
  for c in "${CONTAINERS[@]}"; do
    if docker inspect "$c" >/dev/null 2>&1; then
      log "Stopping/removing container $c"
      docker stop "$c" >/dev/null 2>&1 || true
      docker rm -f "$c" >/dev/null 2>&1 || true
    fi
  done

  for key in "${VOLUME_KEYS[@]}"; do
    vol="${COMPOSE_PROJECT}_${key}"
    if docker volume inspect "$vol" >/dev/null 2>&1; then
      log "Removing volume $vol"
      docker volume rm -f "$vol"
    else
      log "Volume $vol not present — skip"
    fi
  done
}

if is_dry; then
  for c in "${CONTAINERS[@]}"; do
    if docker inspect "$c" >/dev/null 2>&1; then
      log "DRY-RUN would: docker stop+rm $c (exists)"
    else
      log "DRY-RUN would: docker stop+rm $c (not present)"
    fi
  done
  for key in "${VOLUME_KEYS[@]}"; do
    vol="${COMPOSE_PROJECT}_${key}"
    if docker volume inspect "$vol" >/dev/null 2>&1; then
      log "DRY-RUN would: docker volume rm -f $vol (exists)"
    else
      log "DRY-RUN would: docker volume rm -f $vol (not present)"
    fi
  done
else
  destroy_volumes
fi

# ── 3) Recreate empty DBs + restore ────────────────────────────────────────
log "Phase 3/4: recreate DB containers + restore"

recreate_and_restore() {
  log "COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT docker compose up -d ${DB_SERVICES[*]}"
  # Re-bind volumes under the same project prefix that was destroyed.
  COMPOSE_PROJECT_NAME="$COMPOSE_PROJECT" docker compose up -d "${DB_SERVICES[@]}"

  local c i
  for c in "${CONTAINERS[@]}"; do
    log "Waiting for $c (pg_isready)..."
    for i in $(seq 1 60); do
      if docker exec "$c" pg_isready -q 2>/dev/null; then
        log "$c ready"
        break
      fi
      if [[ "$i" -eq 60 ]]; then
        die "timeout waiting for $c"
      fi
      sleep 2
    done
  done

  # brief settle for first-boot initdb
  sleep 3

  log "Restoring from $BACKUP_DIR"
  bash "$ROOT/scripts/restore-dbs.sh" "$BACKUP_DIR"
}

if is_dry; then
  log "DRY-RUN would: COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT docker compose up -d ${DB_SERVICES[*]}"
  log "DRY-RUN would: wait pg_isready on ${CONTAINERS[*]}"
  log "DRY-RUN would: scripts/restore-dbs.sh $BACKUP_DIR"
else
  recreate_and_restore
fi

# ── 4) Smoke ───────────────────────────────────────────────────────────────
log "Phase 4/4: smoke"

smoke_dbs() {
  local c failed=0
  for c in "${CONTAINERS[@]}"; do
    if [[ -z "$(docker ps -q -f "name=^/${c}$")" ]]; then
      log "SMOKE FAIL: $c not running"
      failed=$((failed + 1))
      continue
    fi
    if docker exec "$c" pg_isready -q 2>/dev/null; then
      log "SMOKE OK: $c pg_isready"
    else
      log "SMOKE FAIL: $c pg_isready"
      failed=$((failed + 1))
    fi
  done
  return "$failed"
}

smoke_http() {
  if [[ "$DR_DRILL_SKIP_SMOKE" == "1" ]]; then
    log "HTTP smoke skipped (DR_DRILL_SKIP_SMOKE=1)"
    return 0
  fi
  if ! command -v curl >/dev/null 2>&1; then
    log "curl not available — skip HTTP smoke"
    return 0
  fi
  local code
  code="$(curl -s -o /dev/null -w '%{http_code}' --connect-timeout 3 --max-time 8 \
    "${GATEWAY_URL}/api/health" 2>/dev/null || echo "000")"
  if [[ "$code" == "200" || "$code" == "401" || "$code" == "503" ]]; then
    log "SMOKE OK: gateway ${GATEWAY_URL}/api/health → $code"
    return 0
  fi
  # Optional path when gateway not in drill scope
  log "SMOKE INFO: gateway ${GATEWAY_URL}/api/health → $code (non-blocking; DBs are source of truth for this drill)"
  return 0
}

if is_dry; then
  log "DRY-RUN would: pg_isready on all erp-*-db containers"
  log "DRY-RUN would: curl ${GATEWAY_URL}/api/health (optional)"
else
  smoke_dbs || die "DB smoke failed"
  smoke_http
fi

DRILL_END_TS="$(date +%s)"
ELAPSED=$((DRILL_END_TS - DRILL_START_TS))
ELAPSED_H="$(awk -v s="$ELAPSED" 'BEGIN { printf "%.2f", s/3600 }')"
RTO_OK=1
if awk -v e="$ELAPSED" -v t="$RTO_TARGET_H" 'BEGIN { exit !(e > t*3600) }'; then
  RTO_OK=0
fi

log "=============================================="
log "DR drill complete"
log "  mode:     $(is_dry && echo DRY-RUN || echo LIVE)"
log "  backup:   $BACKUP_DIR"
log "  project:  $COMPOSE_PROJECT"
log "  elapsed:  ${ELAPSED}s (~${ELAPSED_H}h)"
log "  RPO target: ${RPO_TARGET_H}h (nightly/on-demand dump)"
log "  RTO target: ${RTO_TARGET_H}h — $([[ "$RTO_OK" -eq 1 ]] && echo MET || echo EXCEEDED)"
log "=============================================="

if is_dry; then
  log "Dry-run finished without destroying data."
  log "Live drill: DR_DRILL_DRY_RUN=0 $0"
  exit 0
fi

if [[ "$RTO_OK" -ne 1 ]]; then
  die "RTO target ${RTO_TARGET_H}h exceeded (elapsed ${ELAPSED}s)"
fi

exit 0
