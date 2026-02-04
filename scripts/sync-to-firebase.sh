#!/bin/bash
#
# Sync Doppler secrets to Firebase Functions environment config
#
# Usage: ./scripts/sync-to-firebase.sh [doppler-config]
# Example: ./scripts/sync-to-firebase.sh prd
#
set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

DOPPLER_CONFIG="${1:-dev}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

# Check prerequisites
command -v doppler &> /dev/null || { log_error "Doppler CLI not installed"; exit 1; }
command -v firebase &> /dev/null || { log_error "Firebase CLI not installed"; exit 1; }

log_info "Syncing Doppler secrets (config: $DOPPLER_CONFIG) to Firebase..."

# Fetch secrets from Doppler and set in Firebase
doppler secrets download \
    --config "$DOPPLER_CONFIG" \
    --no-file \
    --format json | \
    jq -r 'to_entries | .[] | "\(.key)=\(.value)"' | \
    while IFS='=' read -r key value; do
        # Convert KEY_NAME to firebase format: key.name
        firebase_key=$(echo "$key" | tr '[:upper:]_' '[:lower:].')
        log_info "Setting $firebase_key"
        firebase functions:config:set "$firebase_key=$value" --non-interactive 2>/dev/null || true
    done

log_info "Sync complete!"
log_info "Run 'firebase functions:config:get' to verify"
