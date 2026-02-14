#!/usr/bin/env bash
# Kills process(es) listening on PORT. Default 3002. Idempotent: exit 0 if none.
set -e
PORT="${1:-3002}"
if ! [[ "$PORT" =~ ^[0-9]+$ ]] || [[ "$PORT" -lt 1 ]] || [[ "$PORT" -gt 65535 ]]; then
  echo "Invalid port. Use 1-65535." >&2
  exit 1
fi
PIDS=$(lsof -ti tcp:"$PORT" 2>/dev/null || true)
if [[ -z "$PIDS" ]]; then
  exit 0
fi
for pid in $PIDS; do
  echo "Killing PID $pid on port $PORT"
  kill -TERM "$pid" 2>/dev/null || true
  sleep 1
  kill -KILL "$pid" 2>/dev/null || true
done
exit 0
