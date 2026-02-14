#!/usr/bin/env bash
# Avvia API (3001) e Admin (3000). Libera le porte prima. Ctrl+C ferma tutto.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "Libero porte 3001 e 3000..."
lsof -ti tcp:3001 | xargs kill -9 2>/dev/null || true
lsof -ti tcp:3000 | xargs kill -9 2>/dev/null || true
sleep 1

cleanup() {
  echo ""
  echo "Arresto API e Admin..."
  kill $(jobs -p) 2>/dev/null || true
  exit 0
}
trap cleanup INT TERM

echo "Avvio API su http://localhost:3001 ..."
pnpm -C apps/api dev &
API_PID=$!

echo "Avvio Admin su http://localhost:3000 ..."
PORT=3000 pnpm -C apps/admin dev &
ADMIN_PID=$!

echo ""
echo "  API:   http://localhost:3001"
echo "  Admin: http://localhost:3000"
echo ""
echo "Login admin: http://localhost:3000/login (l'admin chiama l'API su 3001)."
echo "Premi Ctrl+C per fermare tutto."
echo ""

wait
