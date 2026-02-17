#!/usr/bin/env bash
# Avvia API (3001) e Instructor (3012). Libera le porte prima. Ctrl+C ferma tutto.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "Libero porte 3001 e 3012..."
lsof -ti tcp:3001 | xargs kill -9 2>/dev/null || true
lsof -ti tcp:3012 | xargs kill -9 2>/dev/null || true
sleep 1

cleanup() {
  echo ""
  echo "Arresto API e Instructor..."
  kill $(jobs -p) 2>/dev/null || true
  exit 0
}
trap cleanup INT TERM

echo "Avvio API su http://localhost:3001 ..."
pnpm -C apps/api dev &
API_PID=$!

echo "Avvio Instructor su http://localhost:3012 ..."
PORT=3012 pnpm -C apps/instructor dev &
INSTRUCTOR_PID=$!

echo ""
echo "  API:        http://localhost:3001"
echo "  Instructor: http://localhost:3012"
echo ""
echo "Premi Ctrl+C per fermare tutto."
echo ""

wait
