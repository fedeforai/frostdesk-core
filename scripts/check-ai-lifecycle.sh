#!/bin/bash
set -e

# Check for ai_enabled DB column usage (not feature flags)
# This script ensures ai_enabled (DB column) is not used in PILOT MODE

echo "🔍 Checking for ai_enabled DB column usage..."

# Search for SQL patterns that indicate DB column usage
# Exclude feature flags (AIFeatureFlags, flags.ai_enabled, etc.)
SQL_PATTERNS=$(grep -R "ai_enabled" -n packages/src apps supabase 2>/dev/null | \
   grep -v "dist/" | \
   grep -v ".next/" | \
   grep -v "node_modules/" | \
   grep -v "migration" | \
   grep -v "\.md:" | \
   grep -v "\.sql:" | \
   grep -v "AIFeatureFlags" | \
   grep -v "flags\.ai_enabled" | \
   grep -v "flags:.*ai_enabled" | \
   grep -v "fetchAIFeatureFlags" | \
   grep -v "aiFlagsData" | \
   grep -v "AIStatusPanel" | \
   grep -E "(SELECT.*ai_enabled|UPDATE.*ai_enabled|INSERT.*ai_enabled|SET ai_enabled|\.ai_enabled\s*[,=]|ai_enabled\s*:)" || true)

# Check for interface definitions that are NOT feature flags
INTERFACE_PATTERNS=$(grep -R "ai_enabled" -n packages/src apps supabase 2>/dev/null | \
   grep -v "dist/" | \
   grep -v ".next/" | \
   grep -v "node_modules/" | \
   grep -v "migration" | \
   grep -v "AIFeatureFlags" | \
   grep -v "AIStatusPanel" | \
   grep -E "(interface.*\{|:\s*boolean)" | \
   grep -v "FeatureFlags" || true)

# Combine and filter out comments
ALL_PATTERNS=$(echo -e "$SQL_PATTERNS\n$INTERFACE_PATTERNS" | \
   grep -v "^\s*//" | \
   grep -v "^\s*\*" | \
   grep -v "// PILOT MODE" | \
   grep -v "PILOT MODE:" | \
   grep -v "DISABLED:" | \
   grep -v "removed from" | \
   grep -v "assertNoAiEnabledUsage" || true)

if [ -n "$ALL_PATTERNS" ] && [ "$ALL_PATTERNS" != "" ]; then
  echo "❌ ai_enabled DB column usage detected"
  echo ""
  echo "$ALL_PATTERNS"
  echo ""
  echo "Found references to ai_enabled DB column. In PILOT MODE, this column does not exist."
  echo "Please remove all references to ai_enabled from:"
  echo "  - SQL queries (SELECT, UPDATE, INSERT)"
  echo "  - TypeScript interfaces (except feature flags)"
  echo "  - Return objects"
  echo ""
  echo "Feature flags named 'ai_enabled' are OK (they refer to feature flags, not DB column)."
  exit 1
else
  echo "✅ ai_enabled DB column clean (no usage found)"
  echo ""
  echo "Note: Feature flags named 'ai_enabled' are OK and were excluded from this check."
  exit 0
fi
