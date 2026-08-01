#!/usr/bin/env bash
# ERP 2026 — CI gate: fail if secret material patterns reappear in the tree.
# Scans for: tracked/working-tree *.key, cluster-keys.json, hardcoded Meili master key.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

FAILED=0
fail() {
  echo "FAIL: $*" >&2
  FAILED=1
}

echo "=== ci-no-secrets ==="

# 1) No cluster-keys.json in workspace or git index
if [[ -f "$ROOT/cluster-keys.json" ]]; then
  fail "cluster-keys.json present on disk (run scripts/security-purge-local-secrets.sh)"
fi
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  if git ls-files --error-unmatch cluster-keys.json >/dev/null 2>&1; then
    fail "cluster-keys.json is tracked by git"
  fi
fi

# 2) No *.key files under repo (working tree), excluding node_modules
KEY_HITS="$(find "$ROOT" \
  -path '*/node_modules/*' -prune -o \
  -path '*/.git/*' -prune -o \
  -path '*/.pnpm-store/*' -prune -o \
  -type f -name '*.key' -print 2>/dev/null || true)"
if [[ -n "${KEY_HITS}" ]]; then
  fail "private key files present:"
  echo "$KEY_HITS" | sed 's/^/  /' >&2
fi

if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  TRACKED="$(git ls-files '*.key' 2>/dev/null || true)"
  if [[ -n "${TRACKED}" ]]; then
    fail "tracked *.key files:"
    echo "$TRACKED" | sed 's/^/  /' >&2
  fi
fi

# 3) No hardcoded Meili demo master key in source / compose
# Exclude design/docs that mention the string as historical audit notes.
MEILI_PATTERN='erp-meili-master-key-2026'
MEILI_HITS=""
if command -v rg >/dev/null 2>&1; then
  MEILI_HITS="$(rg -n --hidden \
    -g '!.git/**' \
    -g '!node_modules/**' \
    -g '!.pnpm-store/**' \
    -g '!dist/**' \
    -g '!**/dist/**' \
    -g '!.next/**' \
    -g '!coverage/**' \
    -g '!test-results/**' \
    -g '!docs/**' \
    -g '!**/*.md' \
    -g '!scripts/ci-no-secrets.sh' \
    -F "$MEILI_PATTERN" "$ROOT" 2>/dev/null || true)"
else
  MEILI_HITS="$(grep -RIn --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.pnpm-store \
    --exclude-dir=dist --exclude-dir=.next --exclude-dir=coverage --exclude-dir=test-results \
    --exclude-dir=docs --exclude='*.md' --exclude='ci-no-secrets.sh' \
    -F "$MEILI_PATTERN" "$ROOT" 2>/dev/null || true)"
fi
if [[ -n "${MEILI_HITS}" ]]; then
  fail "hardcoded Meili master key string found (use MEILI_MASTER_KEY env):"
  echo "$MEILI_HITS" | sed 's/^/  /' >&2
fi

# 4) backups/ must be gitignored
if [[ -f "$ROOT/.gitignore" ]]; then
  if ! grep -qE '^backups/?$' "$ROOT/.gitignore"; then
    fail ".gitignore must include backups/"
  fi
fi

if [[ "$FAILED" -ne 0 ]]; then
  echo "=== ci-no-secrets: FAILED ===" >&2
  exit 1
fi

echo "=== ci-no-secrets: OK ==="
exit 0
