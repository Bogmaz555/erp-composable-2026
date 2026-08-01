#!/usr/bin/env bash
# ERP 2026 — Purge local secret material from the workspace (not for production key rotation).
# Removes private key files and cluster-keys that must never live in the tree.
# Safe to re-run. Does not modify git history.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "=== security-purge-local-secrets ==="
echo "ROOT=$ROOT"

shred_or_rm() {
  local f="$1"
  if [[ ! -e "$f" ]]; then
    return 0
  fi
  if [[ -f "$f" ]]; then
    if command -v shred >/dev/null 2>&1; then
      shred -u -z -n 1 "$f" 2>/dev/null || rm -f "$f"
    else
      # Full-file overwrite then unlink (best-effort without shred)
      local sz
      sz="$(stat -c%s "$f" 2>/dev/null || stat -f%z "$f" 2>/dev/null || echo 0)"
      if [[ "${sz}" =~ ^[0-9]+$ ]] && [[ "${sz}" -gt 0 ]]; then
        dd if=/dev/zero of="$f" bs=4096 count=$(( (sz + 4095) / 4096 )) conv=notrunc status=none 2>/dev/null \
          || dd if=/dev/zero of="$f" bs="$sz" count=1 conv=notrunc status=none 2>/dev/null \
          || true
      else
        echo "  WARN: could not determine size for full wipe of $f; unlinking only" >&2
      fi
      rm -f "$f"
    fi
  else
    rm -rf "$f"
  fi
  echo "  purged: $f"
}

# Explicit high-risk paths from Pilot v1 PR1
PATHS=(
  "cluster-keys.json"
  "infra/vault/unseal/unseal.key"
)

for p in "${PATHS[@]}"; do
  shred_or_rm "$ROOT/$p"
done

# All *.key under infra/tls (dev, mtls, rotation archives)
if [[ -d "$ROOT/infra/tls" ]]; then
  while IFS= read -r -d '' f; do
    shred_or_rm "$f"
  done < <(find "$ROOT/infra/tls" -type f -name '*.key' -print0 2>/dev/null)
fi

# Any other unseal keys under infra/vault
if [[ -d "$ROOT/infra/vault" ]]; then
  while IFS= read -r -d '' f; do
    shred_or_rm "$f"
  done < <(find "$ROOT/infra/vault" -type f -name '*.key' -print0 2>/dev/null)
fi

# Refuse to leave tracked secret material (if someone force-added)
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  TRACKED_KEYS="$(git ls-files '*.key' 'cluster-keys.json' 2>/dev/null || true)"
  if [[ -n "${TRACKED_KEYS}" ]]; then
    echo "WARN: still tracked by git (run git rm --cached):"
    echo "$TRACKED_KEYS"
    while IFS= read -r tf; do
      [[ -z "$tf" ]] && continue
      git rm --cached -f -- "$tf" 2>/dev/null || true
      shred_or_rm "$ROOT/$tf"
    done <<< "$TRACKED_KEYS"
  fi
fi

echo "=== purge complete ==="
echo "Note: regenerate local TLS with scripts/generate-dev-tls-certs.sh / generate-mtls-certs.sh if needed."
echo "Note: set MEILI_MASTER_KEY and PM_DATABASE_URL in env/.env (never commit secrets)."
echo "Note: local ci-no-secrets allows gitignored *.key; CI=true enforces empty worktree (run this purge first)."
