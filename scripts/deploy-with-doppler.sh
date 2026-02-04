#!/bin/bash
#
# Deploy Firebase Functions with Doppler secrets injected
#
# Usage: ./scripts/deploy-with-doppler.sh [doppler-config] [firebase-target]
# Example: ./scripts/deploy-with-doppler.sh prd production
#
set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }

DOPPLER_CONFIG="${1:-dev}"
FIREBASE_TARGET="${2:-}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

log_info "Deploying with Doppler config: $DOPPLER_CONFIG"

# Sync secrets first
"$SCRIPT_DIR/sync-to-firebase.sh" "$DOPPLER_CONFIG"

# Deploy
if [[ -n "$FIREBASE_TARGET" ]]; then
    log_info "Deploying to Firebase target: $FIREBASE_TARGET"
    doppler run --config "$DOPPLER_CONFIG" -- firebase deploy --only functions -P "$FIREBASE_TARGET"
else
    log_info "Deploying to default Firebase project"
    doppler run --config "$DOPPLER_CONFIG" -- firebase deploy --only functions
fi

log_info "Deployment complete!"
