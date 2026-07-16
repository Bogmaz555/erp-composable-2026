#!/usr/bin/env bash
# ERP 2026 — Full autonomous pipeline (Warstwa 2 + 3 + 4)
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
LOG="${ROOT}/.agents/swarm/full-pipeline.log"

log() { echo "[$(date -Iseconds)] $*" | tee -a "$LOG"; }
mkdir -p "$(dirname "$LOG")"

log "========== FULL PIPELINE START =========="
bash "${ROOT}/scripts/autonomous-warstwa2-pipeline.sh" --skip-boot || true
bash "${ROOT}/scripts/autonomous-warstwa3-pipeline.sh" --skip-boot || true
bash "${ROOT}/scripts/autonomous-warstwa4-pipeline.sh" --skip-boot || true
bash "${ROOT}/scripts/autonomous-warstwa5-pipeline.sh" --skip-boot || true
bash "${ROOT}/scripts/autonomous-warstwa6-pipeline.sh" --skip-boot || true
bash "${ROOT}/scripts/autonomous-warstwa7-pipeline.sh" --skip-boot || true
bash "${ROOT}/scripts/autonomous-warstwa8-pipeline.sh" --skip-boot || true
bash "${ROOT}/scripts/autonomous-warstwa9-pipeline.sh" --skip-boot || true
bash "${ROOT}/scripts/autonomous-warstwa10-pipeline.sh" --skip-boot || true
bash "${ROOT}/scripts/autonomous-warstwa11-pipeline.sh" --skip-boot || true
bash "${ROOT}/scripts/autonomous-warstwa12-pipeline.sh" --skip-boot || true
bash "${ROOT}/scripts/autonomous-warstwa13-pipeline.sh" --skip-boot || true
bash "${ROOT}/scripts/autonomous-warstwa14-pipeline.sh" --skip-boot || true
bash "${ROOT}/scripts/autonomous-warstwa15-pipeline.sh" --skip-boot || true
bash "${ROOT}/scripts/autonomous-warstwa16-pipeline.sh" --skip-boot || true
bash "${ROOT}/scripts/autonomous-warstwa17-pipeline.sh" --skip-boot || true
bash "${ROOT}/scripts/autonomous-warstwa18-pipeline.sh" --skip-boot || true
bash "${ROOT}/scripts/autonomous-warstwa19-pipeline.sh" --skip-boot || true
bash "${ROOT}/scripts/autonomous-warstwa20-pipeline.sh" --skip-boot || true
bash "${ROOT}/scripts/autonomous-warstwa21-pipeline.sh" --skip-boot || true
bash "${ROOT}/scripts/autonomous-warstwa22-pipeline.sh" --skip-boot || true
bash "${ROOT}/scripts/autonomous-warstwa23-pipeline.sh" --skip-boot || true
log "========== FULL PIPELINE END =========="
