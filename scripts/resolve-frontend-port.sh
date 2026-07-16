#!/usr/bin/env bash
# Resolve free frontend port (skip :3000 if occupied by non-ERP e.g. Open WebUI)
set -euo pipefail
for p in 3003 3000 3001 3002; do
  if ! ss -tlnH 2>/dev/null | grep -q ":${p} "; then
    echo "$p"
    exit 0
  fi
done
echo 3003
