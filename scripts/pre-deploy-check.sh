#!/usr/bin/env bash
# FrostDesk Pre-Deploy Verification Script
# Runs all code quality, security, and build checks before deployment
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

FAIL=0
WARNINGS=0

log_info() { echo -e "${BLUE}ℹ${NC} $1"; }
log_success() { echo -e "${GREEN}✓${NC} $1"; }
log_warning() { echo -e "${YELLOW}⚠${NC} $1"; WARNINGS=$((WARNINGS + 1)); }
log_error() { echo -e "${RED}✗${NC} $1"; FAIL=$((FAIL + 1)); }
log_section() { echo -e "\n${BLUE}━━━ $1 ━━━${NC}"; }

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║          FrostDesk Pre-Deploy Verification                ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# ------------------------------------------------------------------
# 1. Git Status Check
# ------------------------------------------------------------------
log_section "Git Status"

if [[ -n $(git status --porcelain) ]]; then
  log_warning "Working directory has uncommitted changes"
  git status --short
else
  log_success "Working directory is clean"
fi

CURRENT_BRANCH=$(git branch --show-current)
log_info "Current branch: $CURRENT_BRANCH"

# ------------------------------------------------------------------
# 2. Dependency Security Audit
# ------------------------------------------------------------------
log_section "Security Audit"

if pnpm audit --audit-level=high 2>/dev/null; then
  log_success "No high/critical vulnerabilities found"
else
  log_error "Security vulnerabilities detected (high/critical)"
fi

# ------------------------------------------------------------------
# 3. Unused Code Detection (knip)
# ------------------------------------------------------------------
log_section "Unused Code Detection"

if command -v pnpm >/dev/null 2>&1 && pnpm list knip --depth 0 >/dev/null 2>&1; then
  if pnpm knip --no-exit-code 2>/dev/null; then
    log_success "No unused exports/dependencies detected"
  else
    log_warning "Potential unused code detected (run 'pnpm knip' for details)"
  fi
else
  log_warning "knip not installed, skipping unused code check (run: pnpm add -D knip -w)"
fi

# ------------------------------------------------------------------
# 4. TypeScript Type Checking
# ------------------------------------------------------------------
log_section "TypeScript Type Checking"

log_info "Building packages (ai + db)..."
if pnpm --filter @frostdesk/ai build && pnpm --filter @frostdesk/db build; then
  log_success "Packages built successfully"
else
  log_error "Package build failed"
fi

log_info "Type checking API..."
if pnpm --filter @frostdesk/api exec tsc --noEmit 2>/dev/null; then
  log_success "API types OK"
else
  log_warning "API has type errors (non-blocking)"
fi

# ------------------------------------------------------------------
# 5. Linting
# ------------------------------------------------------------------
log_section "Linting"

log_info "Linting admin app..."
if pnpm --filter @frostdesk/admin lint 2>/dev/null; then
  log_success "Admin lint passed"
else
  log_error "Admin lint failed"
fi

log_info "Linting instructor app..."
if pnpm --filter @frostdesk/instructor lint 2>/dev/null; then
  log_success "Instructor lint passed"
else
  log_warning "Instructor lint has issues (pre-existing, non-blocking)"
fi

# ------------------------------------------------------------------
# 6. Security Pattern Check (Admin Routes)
# ------------------------------------------------------------------
log_section "Security Pattern Check"

ADMIN_ROUTES="apps/api/src/routes/admin"
if [ -d "$ADMIN_ROUTES" ] || [ -f "apps/api/src/routes/admin.ts" ]; then
  if rg -q "request\.query\.userId|request\.headers\[.x-user-id|x-user-id|getUserId\s*\(" \
    apps/api/src/routes/admin.ts apps/api/src/routes/admin/ \
    --glob '!*.test.ts' --glob '!*.spec.ts' --type-add 'ts:*.ts' -t ts 2>/dev/null; then
    log_error "Forbidden pattern found in admin routes (see docs/SECURITY_ADMIN_ROUTE_COVERAGE_AUDIT.md)"
  else
    log_success "No forbidden patterns in admin routes"
  fi
else
  log_info "Admin routes directory not found, skipping"
fi

# ------------------------------------------------------------------
# 7. Tests
# ------------------------------------------------------------------
log_section "Running Tests"

log_info "Testing DB package..."
if pnpm --filter @frostdesk/db test 2>/dev/null; then
  log_success "DB tests passed"
else
  log_error "DB tests failed"
fi

log_info "Testing API..."
if pnpm --filter @frostdesk/api test 2>/dev/null; then
  log_success "API tests passed"
else
  log_error "API tests failed"
fi

# ------------------------------------------------------------------
# 8. Build Verification
# ------------------------------------------------------------------
log_section "Build Verification"

log_info "Building API..."
if pnpm --filter @frostdesk/api build 2>/dev/null; then
  log_success "API build successful"
else
  log_error "API build failed"
fi

# ------------------------------------------------------------------
# Summary
# ------------------------------------------------------------------
log_section "Summary"

echo ""
if [ "$FAIL" -eq 0 ]; then
  if [ "$WARNINGS" -gt 0 ]; then
    echo -e "${YELLOW}═══ PASSED WITH $WARNINGS WARNING(S) ═══${NC}"
    echo "Review warnings above before deploying."
    exit 0
  else
    echo -e "${GREEN}═══ ALL CHECKS PASSED ═══${NC}"
    echo "Ready for deployment!"
    exit 0
  fi
else
  echo -e "${RED}═══ FAILED: $FAIL ERROR(S), $WARNINGS WARNING(S) ═══${NC}"
  echo "Fix errors before deploying."
  exit 1
fi
