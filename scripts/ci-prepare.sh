#!/usr/bin/env bash
# ERP 2026 - Prepare environment after install (Shared Kernel & Prisma)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "[ci-prepare] Building shared-kernel..."
if [ -d "apps/shared-kernel" ]; then
  (cd apps/shared-kernel && npx tsc) || echo "WARN: Failed to build shared-kernel"
fi

echo "[ci-prepare] Generating Prisma clients..."
for schema in apps/*/prisma/schema.prisma; do
  if [ -f "$schema" ]; then
    svc_dir="$(dirname "$schema")/.."
    echo "[ci-prepare] Generating client for $svc_dir"
    (cd "$svc_dir" && npx prisma@5.22.0 generate --schema=prisma/schema.prisma) || echo "WARN: Failed to generate Prisma for $svc_dir"
  fi
done

echo "[ci-prepare] Ready."
