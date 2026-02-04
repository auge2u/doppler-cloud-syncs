#!/bin/bash
#
# Firebase CLI Installation Script
#
set -euo pipefail

GREEN='\033[0;32m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }

log_info "Installing Firebase CLI..."

# Install via npm (recommended)
if command -v npm &> /dev/null; then
    npm install -g firebase-tools
    log_info "Firebase CLI installed via npm"
# Fallback to standalone install
else
    curl -sL https://firebase.tools | bash
    log_info "Firebase CLI installed via standalone script"
fi

# Verify installation
if command -v firebase &> /dev/null; then
    firebase --version
    log_info "Installation complete!"
    echo
    log_info "Next: Run 'firebase login' to authenticate"
else
    echo "Installation failed"
    exit 1
fi
