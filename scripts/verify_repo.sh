#!/usr/bin/env bash
# Lightweight repo verification for pnpm workspace. No external deps.
set -e

FAIL=0
API_URL="${API_URL:-http://127.0.0.1:3001/health}"

echo "=== pnpm version ==="
if command -v pnpm >/dev/null 2>&1; then
  pnpm --version
else
  echo "FAIL: pnpm not found"
  exit 1
fi

echo ""
echo "=== workspace deps (depth 0) ==="
if pnpm -r list --depth 0 >/dev/null 2>&1; then
  pnpm -r list --depth 0
else
  echo "FAIL: pnpm -r list --depth 0 failed"
  FAIL=1
fi

echo ""
echo "=== API health (optional; API must be running) ==="
if curl -sf --connect-timeout 2 --max-time 5 "$API_URL" >/dev/null 2>&1; then
  echo "PASS: $API_URL responded OK"
else
  echo "SKIP: $API_URL not reachable (start with: pnpm -w dev)"
fi

echo ""
if [ "$FAIL" -eq 0 ]; then
  echo "=== PASS ==="
  exit 0
else
  echo "=== FAIL ==="
  exit 1
fi
