#!/usr/bin/env bash
# Jednorazowe uporządkowanie repo — usuwa szum autonomicznych runów, zostawia governance + docs.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "[cleanup] checkpoints SILENT/RUN…"
rm -f .agents/orchestrator/CHECKPOINTS/FAZA*-AUTONOMOUS-*.md
rm -f .agents/orchestrator/CHECKPOINTS/FAZA1-M01-*.md
rm -f .agents/orchestrator/CHECKPOINTS/FAZA1-START-FINAL.md
rm -f .agents/orchestrator/CHECKPOINTS/FAZA0-OVERALL-CHECKPOINT-2.md
rm -f .agents/orchestrator/CHECKPOINTS/MISSION-001-CHECKPOINT-FINAL.md
rm -f .agents/orchestrator/CHECKPOINTS/MISSION-WORKER-LATEST.md
rm -f .agents/orchestrator/CHECKPOINTS/WARSTWA{14,15,16,17,18,19,20,21,22}-CLOSURE.md

echo "[cleanup] mission briefs (zastąpione roadmapą)…"
rm -rf .agents/orchestrator/MISSIONS/*
mkdir -p .agents/orchestrator/MISSIONS

echo "[cleanup] swarm logs & progress…"
rm -f .agents/swarm/*.log
rm -f .agents/swarm/progress-warstwa*.md
rm -f .agents/swarm/progress-max-speed.md
rm -f .agents/swarm/final_diff.diff
rm -f .agents/swarm/last-keycloak-token.txt
rm -f .agents/swarm/regression-report.json
rm -f .agents/swarm/progress/FAZA0-PROGRESS.md

echo "[cleanup] root one-off scripts & logs…"
rm -f gateway.log gateway-test.log apps/api-gateway/crash.log
rm -f fix.js fix2.js fix3.js fix-final.js fix-gateway.js fix-ignore.js
rm -f fix-root.js fix-root-again.js fix-scripts.js fix-tsconfigs.js
rm -f fix-aggregate.js fix-db-urls.js final-fix.js get-docker.sh

echo "[cleanup] zewnętrzna analiza APEX (mapa w docs/APEX-VALUE-MAP.md)…"
rm -rf "Dane do analizy rozwojowej"

echo "[cleanup] redundant docs…"
rm -f docs/FAZA3-PROCUREMENT-CLOSURE-DRAFT.md
rm -f docs/FAZA1-MANUFACTURING-CLOSURE-CHECKLIST.md
rm -f deep-seed/ERP-2026-ULTIMATE-MASTER-PACK-v3.md

echo "[cleanup] DONE — zostało:"
find .agents/orchestrator/CHECKPOINTS -type f 2>/dev/null | sort
ls -la .agents/orchestrator/MISSIONS/ 2>/dev/null || true
