#!/usr/bin/env bash
# Faza 3 — Procurement infra smoke (proc-db + NATS + inv-db)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== ERP Faza 3 Docker Smoke ==="

if ! command -v docker >/dev/null 2>&1; then
  echo "ERROR: docker not available"
  exit 1
fi

echo "[1/3] Starting procurement + inventory + NATS..."
docker compose up -d proc-db inv-db pm-db fin-db nats redis

echo "[2/3] NATS health..."
for i in $(seq 1 20); do
  if curl -sf http://localhost:8222/healthz >/dev/null 2>&1; then
    echo "NATS OK"
    break
  fi
  sleep 2
done

echo "[3/3] Contract smokes (no live services required):"
echo "  npm run smoke:faza3"
echo "  npm run smoke:proc"
echo "  npm run smoke:faza3:live   # requires proc-service + NATS"
echo ""
echo "Proc DB: localhost:5437/proc_db"
echo "Boot stack: npm run boot:all"
echo ""
echo "=== Faza 3 Docker Smoke finished ==="
