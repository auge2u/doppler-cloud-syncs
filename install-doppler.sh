#!/bin/bash
#
# Doppler CLI Installation Script
# Supports: Ubuntu 22.04+, Debian 11+
#
set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check if running as root or with sudo
check_sudo() {
    if [[ $EUID -ne 0 ]]; then
        if ! command -v sudo &> /dev/null; then
            log_error "This script requires root privileges. Please run as root."
            exit 1
        fi
        SUDO="sudo"
    else
        SUDO=""
    fi
}

# Detect OS version
detect_os() {
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        OS_ID="${ID:-unknown}"
        OS_VERSION_ID="${VERSION_ID:-0}"
    else
        log_error "Cannot detect OS. /etc/os-release not found."
        exit 1
    fi

    log_info "Detected: $PRETTY_NAME"
}

# Check if Doppler is already installed
check_existing() {
    if command -v doppler &> /dev/null; then
        local version
        version=$(doppler --version 2>/dev/null | head -n1)
        log_warn "Doppler is already installed: $version"
        read -p "Do you want to reinstall/upgrade? [y/N] " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Installation cancelled."
            exit 0
        fi
    fi
}

# Install using modern method (Ubuntu 22.04+, Debian 11+)
install_modern() {
    log_info "Using modern installation method (signed-by keyring)"

    # Install prerequisites
    log_info "Installing prerequisites..."
    $SUDO apt-get update
    $SUDO apt-get install -y apt-transport-https ca-certificates curl gnupg

    # Add GPG key
    log_info "Adding Doppler GPG key..."
    curl -sLf --retry 3 --tlsv1.2 --proto "=https" \
        'https://packages.doppler.com/public/cli/gpg.DE2A7741A397C129.key' | \
        $SUDO gpg --dearmor -o /usr/share/keyrings/doppler-archive-keyring.gpg

    # Add repository
    log_info "Adding Doppler repository..."
    echo "deb [signed-by=/usr/share/keyrings/doppler-archive-keyring.gpg] https://packages.doppler.com/public/cli/deb/debian any-version main" | \
        $SUDO tee /etc/apt/sources.list.d/doppler-cli.list > /dev/null

    # Install Doppler
    log_info "Installing Doppler CLI..."
    $SUDO apt-get update
    $SUDO apt-get install -y doppler
}

# Install using legacy method (older Debian/Ubuntu)
install_legacy() {
    log_info "Using legacy installation method (apt-key)"

    # Install prerequisites
    log_info "Installing prerequisites..."
    $SUDO apt-get update
    $SUDO apt-get install -y apt-transport-https ca-certificates curl gnupg

    # Add GPG key (legacy method)
    log_info "Adding Doppler GPG key..."
    curl -sLf --retry 3 --tlsv1.2 --proto "=https" \
        'https://packages.doppler.com/public/cli/gpg.DE2A7741A397C129.key' | \
        $SUDO apt-key add -

    # Add repository
    log_info "Adding Doppler repository..."
    echo "deb https://packages.doppler.com/public/cli/deb/debian any-version main" | \
        $SUDO tee /etc/apt/sources.list.d/doppler-cli.list > /dev/null

    # Install Doppler
    log_info "Installing Doppler CLI..."
    $SUDO apt-get update
    $SUDO apt-get install -y doppler
}

# Verify installation
verify_install() {
    if command -v doppler &> /dev/null; then
        local version
        version=$(doppler --version 2>/dev/null | head -n1)
        log_info "Doppler installed successfully: $version"
        echo
        log_info "Next steps:"
        echo "  1. Run 'doppler login' to authenticate"
        echo "  2. Run 'doppler setup' in your project directory"
        echo "  3. Run 'doppler secrets' to view your secrets"
    else
        log_error "Installation failed. Doppler command not found."
        exit 1
    fi
}

# Main
main() {
    echo "======================================"
    echo "  Doppler CLI Installation Script"
    echo "======================================"
    echo

    check_sudo
    detect_os
    check_existing

    # Determine installation method based on OS version
    case "$OS_ID" in
        ubuntu)
            if [[ "${OS_VERSION_ID%%.*}" -ge 22 ]]; then
                install_modern
            else
                install_legacy
            fi
            ;;
        debian)
            if [[ "${OS_VERSION_ID%%.*}" -ge 11 ]]; then
                install_modern
            else
                install_legacy
            fi
            ;;
        *)
            log_warn "Unknown OS '$OS_ID'. Attempting modern installation method..."
            install_modern
            ;;
    esac

    verify_install
}

main "$@"
