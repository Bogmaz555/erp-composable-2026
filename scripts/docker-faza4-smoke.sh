#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== Faza 4 Docker Smoke ==="
docker compose up -d quality-db eam-db nats redis proc-db inv-db pm-db fin-db 2>/dev/null || \
  docker compose up -d nats redis

for i in $(seq 1 15); do
  curl -sf http://localhost:8222/healthz >/dev/null 2>&1 && echo "NATS OK" && break
  sleep 2
done

echo "Contract gate:"
echo "  npm run ci:contracts"
echo "Quality: :4008 | EAM: :4009 | Gateway: :4005"
echo "=== done ==="
