#!/usr/bin/env bash
# FrostDesk Deploy Pipeline
# Syncs branches, runs verification, and pushes for deployment
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info() { echo -e "${BLUE}ℹ${NC} $1"; }
log_success() { echo -e "${GREEN}✓${NC} $1"; }
log_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
log_error() { echo -e "${RED}✗${NC} $1"; }
log_step() { echo -e "\n${CYAN}▶ $1${NC}"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"

# Default values
TARGET_BRANCH="${1:-main}"
SKIP_VERIFICATION="${SKIP_VERIFICATION:-false}"
DRY_RUN="${DRY_RUN:-false}"
MERGE_BRANCHES="${MERGE_BRANCHES:-}"

usage() {
  cat << EOF
FrostDesk Deploy Pipeline

Usage: ./scripts/deploy.sh [target-branch] [options]

Arguments:
  target-branch     Branch to deploy (default: main)

Environment Variables:
  SKIP_VERIFICATION=true    Skip pre-deploy checks
  DRY_RUN=true              Show what would be done without executing
  MERGE_BRANCHES="b1 b2"    Space-separated branches to merge before push

Examples:
  ./scripts/deploy.sh                           # Deploy main
  ./scripts/deploy.sh staging                   # Deploy staging
  MERGE_BRANCHES="feature/new-ui" ./scripts/deploy.sh main
  DRY_RUN=true ./scripts/deploy.sh main         # Preview changes
  SKIP_VERIFICATION=true ./scripts/deploy.sh    # Quick deploy (dangerous!)

EOF
  exit 0
}

if [[ "$1" == "-h" || "$1" == "--help" ]]; then
  usage
fi

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║              FrostDesk Deploy Pipeline                    ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo "  Target Branch:     $TARGET_BRANCH"
echo "  Skip Verification: $SKIP_VERIFICATION"
echo "  Dry Run:           $DRY_RUN"
echo "  Merge Branches:    ${MERGE_BRANCHES:-none}"
echo ""

cd "$REPO_ROOT"

# ------------------------------------------------------------------
# Step 1: Check working directory
# ------------------------------------------------------------------
log_step "Step 1: Checking working directory"

if [[ -n $(git status --porcelain) ]]; then
  log_error "Working directory is not clean!"
  echo ""
  git status --short
  echo ""
  read -p "Do you want to stash changes and continue? (y/N) " -n 1 -r
  echo ""
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    git stash push -m "deploy-script-auto-stash-$(date +%Y%m%d-%H%M%S)"
    log_success "Changes stashed"
  else
    log_error "Aborting. Commit or stash your changes first."
    exit 1
  fi
fi

log_success "Working directory is clean"

# ------------------------------------------------------------------
# Step 2: Fetch latest from remote
# ------------------------------------------------------------------
log_step "Step 2: Fetching latest from remote"

if [[ "$DRY_RUN" == "true" ]]; then
  log_info "[DRY RUN] Would run: git fetch origin"
else
  git fetch origin
  log_success "Fetched latest from origin"
fi

# ------------------------------------------------------------------
# Step 3: Checkout and update target branch
# ------------------------------------------------------------------
log_step "Step 3: Updating target branch ($TARGET_BRANCH)"

CURRENT_BRANCH=$(git branch --show-current)

if [[ "$DRY_RUN" == "true" ]]; then
  log_info "[DRY RUN] Would checkout $TARGET_BRANCH and pull"
else
  if [[ "$CURRENT_BRANCH" != "$TARGET_BRANCH" ]]; then
    git checkout "$TARGET_BRANCH"
    log_info "Switched to $TARGET_BRANCH"
  fi
  
  if git rev-parse --verify "origin/$TARGET_BRANCH" >/dev/null 2>&1; then
    git pull origin "$TARGET_BRANCH" --ff-only || {
      log_error "Cannot fast-forward. Remote has diverged."
      log_info "Consider: git pull origin $TARGET_BRANCH --rebase"
      exit 1
    }
    log_success "Branch updated from origin/$TARGET_BRANCH"
  else
    log_warning "Remote branch origin/$TARGET_BRANCH doesn't exist yet"
  fi
fi

# ------------------------------------------------------------------
# Step 4: Merge feature branches (if specified)
# ------------------------------------------------------------------
if [[ -n "$MERGE_BRANCHES" ]]; then
  log_step "Step 4: Merging feature branches"
  
  for branch in $MERGE_BRANCHES; do
    log_info "Merging $branch..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
      log_info "[DRY RUN] Would merge: $branch"
    else
      if git rev-parse --verify "$branch" >/dev/null 2>&1; then
        git merge --no-ff "$branch" -m "Merge $branch into $TARGET_BRANCH"
        log_success "Merged $branch"
      elif git rev-parse --verify "origin/$branch" >/dev/null 2>&1; then
        git merge --no-ff "origin/$branch" -m "Merge origin/$branch into $TARGET_BRANCH"
        log_success "Merged origin/$branch"
      else
        log_error "Branch $branch not found locally or on remote"
        exit 1
      fi
    fi
  done
else
  log_step "Step 4: Skipping merge (no branches specified)"
fi

# ------------------------------------------------------------------
# Step 5: Run pre-deploy verification
# ------------------------------------------------------------------
log_step "Step 5: Running pre-deploy verification"

if [[ "$SKIP_VERIFICATION" == "true" ]]; then
  log_warning "Skipping verification (SKIP_VERIFICATION=true)"
else
  if [[ "$DRY_RUN" == "true" ]]; then
    log_info "[DRY RUN] Would run: ./scripts/pre-deploy-check.sh"
  else
    if [[ -x "$SCRIPT_DIR/pre-deploy-check.sh" ]]; then
      "$SCRIPT_DIR/pre-deploy-check.sh"
      log_success "Pre-deploy verification passed"
    else
      log_warning "pre-deploy-check.sh not found or not executable"
      log_info "Run: chmod +x scripts/pre-deploy-check.sh"
    fi
  fi
fi

# ------------------------------------------------------------------
# Step 6: Push to remote
# ------------------------------------------------------------------
log_step "Step 6: Pushing to origin/$TARGET_BRANCH"

if [[ "$DRY_RUN" == "true" ]]; then
  log_info "[DRY RUN] Would run: git push origin $TARGET_BRANCH"
else
  read -p "Push to origin/$TARGET_BRANCH? (Y/n) " -n 1 -r
  echo ""
  if [[ ! $REPLY =~ ^[Nn]$ ]]; then
    git push origin "$TARGET_BRANCH"
    log_success "Pushed to origin/$TARGET_BRANCH"
  else
    log_warning "Push cancelled by user"
    exit 0
  fi
fi

# ------------------------------------------------------------------
# Step 7: Summary
# ------------------------------------------------------------------
echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                   Deploy Complete!                        ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
log_success "Branch: $TARGET_BRANCH"
log_success "Commit: $(git rev-parse --short HEAD)"
echo ""
log_info "Vercel/deployment should trigger automatically."
log_info "Monitor deployment at: https://vercel.com/dashboard"
echo ""
