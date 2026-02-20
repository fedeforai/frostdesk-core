#!/usr/bin/env bash
# Dump the current production DB schema (public only) into a single migration file.
# Usage: from repo root, with DATABASE_URL set (or in .env):
#   ./scripts/dump_production_schema.sh
# Or: source .env.local && ./scripts/dump_production_schema.sh
set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

if [ -f .env.local ]; then
  set -a
  source .env.local
  set +a
fi
if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL is not set. Set it in .env or .env.local or export it."
  exit 1
fi

MIGRATIONS_DIR="supabase/migrations"
TIMESTAMP=$(date +%Y%m%d%H%M%S)
OUTPUT_FILE="${MIGRATIONS_DIR}/${TIMESTAMP}_full_schema_from_production.sql"

echo "Dumping public schema from DATABASE_URL to ${OUTPUT_FILE} ..."
pg_dump "$DATABASE_URL" \
  --schema-only \
  --no-owner \
  --no-privileges \
  --schema=public \
  -f "$OUTPUT_FILE"

echo "Done. Migration file: ${OUTPUT_FILE}"
echo "Review it and run 'supabase db push' or apply manually if needed."
