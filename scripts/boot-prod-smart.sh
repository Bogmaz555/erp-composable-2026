#!/usr/bin/env bash
# ERP 2026 — Production smart boot: ERP_AUTH_ENFORCE=true + Keycloak + full stack
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
export PATH="${HOME}/.local/share/mise/installs/node/22/bin:${PATH:-}"

export ERP_AUTH_ENFORCE=true
export AUTH_ENFORCE=true

echo "[boot-prod-smart] ERP_AUTH_ENFORCE=true production profile"
bash "${ROOT}/scripts/ensure-keycloak-ready.sh" 2>&1 | tail -4 || true
bash "${ROOT}/scripts/fix-keycloak-demo-users.sh" 2>&1 | tail -2 || true
exec bash "${ROOT}/scripts/boot-all-smart.sh"
