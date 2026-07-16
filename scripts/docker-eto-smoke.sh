#!/usr/bin/env bash
# ETO Manufacturing Core — partial/full docker smoke (Faza 1B)
# Usage: ./scripts/docker-eto-smoke.sh [--infra-only]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== ERP ETO Docker Smoke ==="

if ! command -v docker >/dev/null 2>&1; then
  echo "ERROR: docker not available"
  exit 1
fi

echo "[1/4] Starting infrastructure (postgres per BC + NATS + Redis)..."
docker compose up -d crm-db pm-db mfg-db inv-db fin-db plm-db nats redis

echo "[2/4] Waiting for NATS health..."
for i in $(seq 1 30); do
  if curl -sf http://localhost:8222/healthz >/dev/null 2>&1; then
    echo "NATS OK"
    break
  fi
  sleep 2
  if [ "$i" -eq 30 ]; then
    echo "WARN: NATS health check timeout — continue anyway"
  fi
done

if [ "${1:-}" != "--infra-only" ]; then
  if docker compose config --services 2>/dev/null | grep -q keycloak; then
    echo "[3/4] Starting Keycloak (dev)..."
    docker compose up -d keycloak || true
    echo "Keycloak admin: http://localhost:8080 (admin/admin)"
    echo "Demo user: demo.engineer / demo123 (realm erp)"
  else
    echo "[3/4] Keycloak service not in compose — skip IdP smoke"
  fi
fi

echo "[4/4] Prisma push reminder (run per service when developing):"
echo "  PLM_DATABASE_URL=... npx prisma db push --schema=apps/plm-service/prisma/schema.prisma"
echo "  PM_DATABASE_URL=... npx prisma db push --schema=apps/pm-service/prisma/schema.prisma"
echo "  INVENTORY_DATABASE_URL=... npx prisma db push --schema=apps/inv-service/prisma/schema.prisma"
echo ""
echo "Chain test (no docker): pnpm exec jest test/eto-spine-chain.contract.spec.ts"
echo "PM unit: cd apps/pm-service && pnpm test -- plm-integration"
echo "INV genealogy: cd apps/inv-service && pnpm test -- genealogy"
echo ""
echo "=== Smoke script finished ==="
