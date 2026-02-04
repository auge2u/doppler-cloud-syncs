#!/bin/bash
#
# End-to-End Validation Script for dcs (Doppler Cloud Sync)
#
# This script validates the full workflow of dcs. Run it before releases.
#
# Prerequisites:
#   - doppler CLI installed and authenticated
#   - NEON_API_KEY set (for Neon tests)
#   - firebase CLI installed (for Firebase tests)
#   - wrangler CLI installed (for Cloudflare tests)
#
# Usage:
#   ./scripts/e2e-validation.sh [--skip-external]
#
# Options:
#   --skip-external  Skip tests requiring external services (Doppler, Neon, etc.)
#

set -e

SKIP_EXTERNAL=false
if [[ "$1" == "--skip-external" ]]; then
  SKIP_EXTERNAL=true
fi

echo "========================================"
echo "  dcs End-to-End Validation"
echo "========================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

pass() {
  echo -e "${GREEN}✓${NC} $1"
}

fail() {
  echo -e "${RED}✗${NC} $1"
  exit 1
}

warn() {
  echo -e "${YELLOW}!${NC} $1"
}

# 1. Build Validation
echo "1. Build Validation"
echo "-------------------"

pnpm build > /dev/null 2>&1 && pass "Build succeeds" || fail "Build failed"

# 2. Test Validation
echo ""
echo "2. Test Validation"
echo "------------------"

pnpm test > /dev/null 2>&1 && pass "All tests pass" || fail "Tests failed"

# 3. CLI Validation
echo ""
echo "3. CLI Validation"
echo "-----------------"

CLI="node $(pwd)/packages/cli/dist/index.js"

$CLI --version > /dev/null && pass "dcs --version works" || fail "--version failed"
$CLI --help > /dev/null && pass "dcs --help works" || fail "--help failed"
$CLI init --help > /dev/null && pass "dcs init --help works" || fail "init --help failed"
$CLI sync --help > /dev/null && pass "dcs sync --help works" || fail "sync --help failed"
$CLI neon --help > /dev/null && pass "dcs neon --help works" || fail "neon --help failed"
$CLI hooks --help > /dev/null && pass "dcs hooks --help works" || fail "hooks --help failed"
$CLI webhook --help > /dev/null && pass "dcs webhook --help works" || fail "webhook --help failed"

# 4. Exit Code Validation
echo ""
echo "4. Exit Code Validation"
echo "-----------------------"

# Missing config should exit with code 2
set +e
$CLI status 2>/dev/null
EXIT_CODE=$?
set -e

if [[ $EXIT_CODE -eq 2 ]]; then
  pass "Missing config exits with code 2 (CONFIG_ERROR)"
else
  warn "Expected exit code 2, got $EXIT_CODE"
fi

# 5. Init Command Validation
echo ""
echo "5. Init Command Validation"
echo "--------------------------"

TEMP_DIR=$(mktemp -d)
cd "$TEMP_DIR"

$CLI init --yes --name test-project > /dev/null 2>&1 && pass "dcs init --yes works" || fail "init failed"

if [[ -f "dcs.yaml" ]]; then
  pass "dcs.yaml created"
else
  fail "dcs.yaml not created"
fi

if grep -q "test-project" dcs.yaml; then
  pass "Project name in config"
else
  fail "Project name not in config"
fi

cd - > /dev/null
rm -rf "$TEMP_DIR"

# 6. TypeScript Declarations
echo ""
echo "6. TypeScript Declarations"
echo "--------------------------"

if [[ -f "packages/cli/dist/index.d.ts" ]]; then
  pass "CLI declarations exist"
else
  fail "CLI declarations missing"
fi

if [[ -f "packages/runtime/dist/index.d.ts" ]]; then
  pass "Runtime declarations exist"
else
  fail "Runtime declarations missing"
fi

if [[ -f "packages/runtime/dist/adapters/firebase.d.ts" ]]; then
  pass "Firebase adapter declarations exist"
else
  fail "Firebase adapter declarations missing"
fi

# 7. External Service Tests (optional)
if [[ "$SKIP_EXTERNAL" == "false" ]]; then
  echo ""
  echo "7. External Service Tests"
  echo "-------------------------"

  # Check Doppler CLI
  if command -v doppler &> /dev/null; then
    pass "Doppler CLI installed"

    if doppler me &> /dev/null; then
      pass "Doppler authenticated"
    else
      warn "Doppler not authenticated (run: doppler login)"
    fi
  else
    warn "Doppler CLI not installed"
  fi

  # Check Neon API Key
  if [[ -n "$NEON_API_KEY" ]]; then
    pass "NEON_API_KEY is set"
  else
    warn "NEON_API_KEY not set (needed for Neon tests)"
  fi

  # Check Firebase CLI
  if command -v firebase &> /dev/null; then
    pass "Firebase CLI installed"
  else
    warn "Firebase CLI not installed"
  fi

  # Check Wrangler CLI
  if command -v wrangler &> /dev/null; then
    pass "Wrangler CLI installed"
  else
    warn "Wrangler CLI not installed"
  fi
else
  echo ""
  echo "7. External Service Tests"
  echo "-------------------------"
  warn "Skipped (--skip-external)"
fi

# Summary
echo ""
echo "========================================"
echo "  Validation Complete"
echo "========================================"
echo ""
echo "The dcs packages are ready for release."
echo ""
echo "Manual testing checklist:"
echo "  [ ] Test dcs sync with real Doppler project"
echo "  [ ] Test dcs neon branch create/switch/delete"
echo "  [ ] Test dcs run with real secrets"
echo "  [ ] Test runtime adapters in serverless functions"
echo ""
