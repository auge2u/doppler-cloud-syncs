#!/bin/bash
# dcs-dotfiles installation script
# This script helps set up shell integration for dcs

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}dcs-dotfiles installer${NC}"
echo "======================"
echo ""

# Detect shell
detect_shell() {
  if [[ -n "$ZSH_VERSION" ]]; then
    echo "zsh"
  elif [[ -n "$BASH_VERSION" ]]; then
    echo "bash"
  else
    basename "$SHELL"
  fi
}

DETECTED_SHELL=$(detect_shell)
echo -e "Detected shell: ${GREEN}$DETECTED_SHELL${NC}"

# Determine RC file
case "$DETECTED_SHELL" in
  zsh)
    RC_FILE="$HOME/.zshrc"
    SHELL_SCRIPT="$SCRIPT_DIR/shell/dcs.zsh"
    COMPLETION_FILE="$SCRIPT_DIR/completions/_dcs"
    ;;
  bash)
    RC_FILE="$HOME/.bashrc"
    SHELL_SCRIPT="$SCRIPT_DIR/shell/dcs.sh"
    COMPLETION_FILE="$SCRIPT_DIR/completions/dcs.bash"
    ;;
  *)
    echo -e "${YELLOW}Warning: Unknown shell '$DETECTED_SHELL'. Defaulting to bash.${NC}"
    RC_FILE="$HOME/.bashrc"
    SHELL_SCRIPT="$SCRIPT_DIR/shell/dcs.sh"
    COMPLETION_FILE="$SCRIPT_DIR/completions/dcs.bash"
    ;;
esac

echo -e "RC file: ${GREEN}$RC_FILE${NC}"
echo ""

# Check if already installed
SOURCE_LINE="source \"$SHELL_SCRIPT\""
if grep -q "dcs.sh\|dcs.zsh" "$RC_FILE" 2>/dev/null; then
  echo -e "${YELLOW}dcs shell integration appears to already be installed.${NC}"
  echo "Check $RC_FILE for existing dcs configuration."
  echo ""
  read -p "Reinstall anyway? [y/N] " -n 1 -r
  echo ""
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
  fi
fi

# Install shell integration
echo -e "${CYAN}Installing shell integration...${NC}"

# Add source line to RC file
{
  echo ""
  echo "# dcs (Doppler Cloud Sync) shell integration"
  echo "$SOURCE_LINE"
} >> "$RC_FILE"

echo -e "${GREEN}✓${NC} Added to $RC_FILE"

# Install zsh completions if using zsh
if [[ "$DETECTED_SHELL" == "zsh" ]]; then
  echo ""
  echo -e "${CYAN}Installing zsh completions...${NC}"

  # Try common completion directories
  ZSH_COMP_DIR=""
  if [[ -d "$HOME/.zsh/completions" ]]; then
    ZSH_COMP_DIR="$HOME/.zsh/completions"
  elif [[ -d "$HOME/.local/share/zsh/completions" ]]; then
    ZSH_COMP_DIR="$HOME/.local/share/zsh/completions"
  elif [[ -d "/usr/local/share/zsh/site-functions" ]] && [[ -w "/usr/local/share/zsh/site-functions" ]]; then
    ZSH_COMP_DIR="/usr/local/share/zsh/site-functions"
  else
    # Create user completions directory
    ZSH_COMP_DIR="$HOME/.zsh/completions"
    mkdir -p "$ZSH_COMP_DIR"

    # Add to fpath if not already there
    if ! grep -q "fpath=.*\.zsh/completions" "$RC_FILE" 2>/dev/null; then
      {
        echo ""
        echo "# dcs completions"
        echo "fpath=(~/.zsh/completions \$fpath)"
      } >> "$RC_FILE"
      echo -e "${GREEN}✓${NC} Added completions directory to fpath"
    fi
  fi

  # Copy completion file
  cp "$COMPLETION_FILE" "$ZSH_COMP_DIR/_dcs"
  echo -e "${GREEN}✓${NC} Installed completions to $ZSH_COMP_DIR/_dcs"
fi

# Install bash completions if using bash
if [[ "$DETECTED_SHELL" == "bash" ]]; then
  echo ""
  echo -e "${CYAN}Installing bash completions...${NC}"

  BASH_COMP_DIR=""
  if [[ -d "/etc/bash_completion.d" ]] && [[ -w "/etc/bash_completion.d" ]]; then
    BASH_COMP_DIR="/etc/bash_completion.d"
  elif [[ -d "$HOME/.local/share/bash-completion/completions" ]]; then
    BASH_COMP_DIR="$HOME/.local/share/bash-completion/completions"
  else
    # Just source from RC file
    {
      echo ""
      echo "# dcs bash completions"
      echo "source \"$COMPLETION_FILE\""
    } >> "$RC_FILE"
    echo -e "${GREEN}✓${NC} Added completion source to $RC_FILE"
    BASH_COMP_DIR=""
  fi

  if [[ -n "$BASH_COMP_DIR" ]]; then
    cp "$COMPLETION_FILE" "$BASH_COMP_DIR/dcs"
    echo -e "${GREEN}✓${NC} Installed completions to $BASH_COMP_DIR/dcs"
  fi
fi

echo ""
echo -e "${GREEN}Installation complete!${NC}"
echo ""
echo "To activate, either:"
echo "  1. Restart your shell"
echo "  2. Run: source $RC_FILE"
echo ""
echo "Available commands after activation:"
echo "  dcs          - Main CLI with auto-environment detection"
echo "  dcs-context  - Show current dcs context"
echo "  dcs-init     - Quick project initialization"
echo "  dcs-hooks    - Install git hooks"
echo "  dcs-dev      - Sync to dev environment"
echo "  dcs-stg      - Sync to staging environment"
echo "  dcs-prd      - Sync to production environment"
echo ""
echo "Shell aliases:"
echo "  dcss  - dcs sync"
echo "  dcst  - dcs status"
echo "  dcsr  - dcs run"
echo "  dcsd  - dcs diff"
