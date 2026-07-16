#!/usr/bin/env bash
# Shared ERP script environment — pnpm path + node mise + .env.erp profile
export PATH="${HOME}/.local/share/mise/installs/node/22/bin:${PATH:-}"

_ERP_ENV_DIR="${ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
if [[ -f "${_ERP_ENV_DIR}/.env.erp" ]]; then
  set -a
  # shellcheck source=/dev/null
  source "${_ERP_ENV_DIR}/.env.erp"
  set +a
fi
export ERP_AUTH_ENFORCE="${ERP_AUTH_ENFORCE:-false}"
if [[ -z "${PNPM:-}" ]]; then
  if command -v pnpm >/dev/null 2>&1; then
    PNPM="$(command -v pnpm)"
  elif [[ -n "${ROOT:-}" && -x "${ROOT}/node_modules/.bin/pnpm" ]]; then
    PNPM="${ROOT}/node_modules/.bin/pnpm"
  else
    PNPM="pnpm"
  fi
  export PNPM
fi
