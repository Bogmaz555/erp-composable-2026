#!/usr/bin/env bash
# Enterprise 2.1 P0 — health matrix for core services
# Usage: bash scripts/health-matrix.sh
# Env: HEALTH_MIN_OK (default 6), HEALTH_REQUIRE_GATEWAY=1 (default)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

MIN_OK="${HEALTH_MIN_OK:-6}"
REQUIRE_GW="${HEALTH_REQUIRE_GATEWAY:-1}"

# name|port|path
TARGETS=(
  "gateway|4005|/api/health"
  "pm|4002|/health"
  "inv|4003|/health"
  "proc|4004|/health"
  "mes|4006|/health"
  "plm|4007|/health"
  "fin|4010|/fin/health"
  "analytics|4011|/health"
)

ok=0
fail=0
gw_ok=0
results=()

probe() {
  local name="$1" port="$2" path="$3"
  local code
  code=$(curl -sS -o /dev/null -w "%{http_code}" --max-time 3 "http://127.0.0.1:${port}${path}" 2>/dev/null || echo "000")
  if [[ "$code" =~ ^[23] ]]; then
    echo "OK   ${name} :${port}${path} → ${code}"
    results+=("${name}=ok")
    ok=$((ok + 1))
    [[ "$name" == "gateway" ]] && gw_ok=1
  else
    echo "FAIL ${name} :${port}${path} → ${code}"
    results+=("${name}=fail")
    fail=$((fail + 1))
  fi
}

echo "=== health-matrix (min_ok=${MIN_OK} require_gateway=${REQUIRE_GW}) ==="
for t in "${TARGETS[@]}"; do
  IFS='|' read -r name port path <<<"$t"
  probe "$name" "$port" "$path"
done

echo "---"
echo "ok=${ok} fail=${fail} total=${#TARGETS[@]}"

if [[ "$REQUIRE_GW" == "1" && "$gw_ok" -ne 1 ]]; then
  echo "RESULT: FAIL (gateway required)"
  exit 1
fi
if [[ "$ok" -lt "$MIN_OK" ]]; then
  echo "RESULT: FAIL (ok ${ok} < min ${MIN_OK})"
  exit 1
fi
echo "RESULT: PASS"
exit 0
