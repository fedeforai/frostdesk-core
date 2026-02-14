#!/usr/bin/env bash
# CI safety net: forbid importing instructorApiServer from client files.
# Run from repo root. Exit 1 if any file with 'use client' imports instructorApiServer.
set -e
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INSTRUCTOR_APP="${ROOT}/apps/instructor"
violations=""
while IFS= read -r f; do
  [ -z "$f" ] && continue
  if grep -q "instructorApiServer" "$f" 2>/dev/null; then
    violations="${violations}${violations:+$'\n'}$f"
  fi
done < <(grep -rl "'use client'" "$INSTRUCTOR_APP/app" "$INSTRUCTOR_APP/components" 2>/dev/null || true)
if [ -n "$violations" ]; then
  echo "Forbidden: these client files import instructorApiServer (server-only):"
  echo "$violations"
  exit 1
fi
echo "OK: no client file imports instructorApiServer."
