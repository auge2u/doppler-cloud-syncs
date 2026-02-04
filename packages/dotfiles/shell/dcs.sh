#!/bin/bash
# dcs - Doppler Cloud Sync shell integration
# Source this file in your .bashrc or .zshrc:
#   source /path/to/dcs.sh
#
# Or if installed via npm:
#   source "$(npm root -g)/@auge2u/dcs-dotfiles/shell/dcs.sh"

# ============================================================================
# Configuration
# ============================================================================

# Default Doppler environment based on git branch
DCS_AUTO_ENV=${DCS_AUTO_ENV:-1}

# Map git branches to Doppler configs
declare -A DCS_BRANCH_MAP
DCS_BRANCH_MAP[main]=prd
DCS_BRANCH_MAP[master]=prd
DCS_BRANCH_MAP[production]=prd
DCS_BRANCH_MAP[staging]=stg
DCS_BRANCH_MAP[develop]=dev
DCS_BRANCH_MAP[development]=dev

# ============================================================================
# Helper Functions
# ============================================================================

# Get the current git branch
_dcs_git_branch() {
  git rev-parse --abbrev-ref HEAD 2>/dev/null
}

# Get the Doppler config for current branch
_dcs_env_for_branch() {
  local branch="${1:-$(_dcs_git_branch)}"

  # Check explicit mapping first
  if [[ -n "${DCS_BRANCH_MAP[$branch]}" ]]; then
    echo "${DCS_BRANCH_MAP[$branch]}"
    return
  fi

  # Pattern matching for feature branches
  case "$branch" in
    feature/*|feat/*|fix/*|bugfix/*|hotfix/*)
      echo "dev"
      ;;
    release/*)
      echo "stg"
      ;;
    *)
      echo "dev"
      ;;
  esac
}

# Check if we're in a dcs project
_dcs_in_project() {
  [[ -f "dcs.yaml" ]] || [[ -f "dcs.yml" ]]
}

# Find the dcs config file
_dcs_find_config() {
  local dir="$PWD"
  while [[ "$dir" != "/" ]]; do
    if [[ -f "$dir/dcs.yaml" ]]; then
      echo "$dir/dcs.yaml"
      return 0
    elif [[ -f "$dir/dcs.yml" ]]; then
      echo "$dir/dcs.yml"
      return 0
    fi
    dir="$(dirname "$dir")"
  done
  return 1
}

# ============================================================================
# Main dcs wrapper function
# ============================================================================

dcs() {
  local cmd="${1:-}"

  # If no command, show help
  if [[ -z "$cmd" ]]; then
    command dcs --help
    return
  fi

  # Auto-detect environment for certain commands
  if [[ "$DCS_AUTO_ENV" == "1" ]] && _dcs_in_project; then
    case "$cmd" in
      sync|diff|status|run)
        # Check if -c/--config is already provided
        if [[ ! " $* " =~ " -c " ]] && [[ ! " $* " =~ " --config " ]]; then
          local env=$(_dcs_env_for_branch)
          echo "[dcs] Auto-detected environment: $env (branch: $(_dcs_git_branch))"
          shift
          command dcs "$cmd" --config "$env" "$@"
          return
        fi
        ;;
    esac
  fi

  command dcs "$@"
}

# ============================================================================
# Convenience Aliases
# ============================================================================

# Quick sync for current environment
alias dcss='dcs sync'

# Quick status check
alias dcst='dcs status'

# Run with secrets
alias dcsr='dcs run'

# Show diff
alias dcsd='dcs diff'

# ============================================================================
# Environment-specific shortcuts
# ============================================================================

# Sync to dev environment
dcs-dev() {
  dcs sync --config dev "$@"
}

# Sync to staging environment
dcs-stg() {
  dcs sync --config stg "$@"
}

# Sync to production environment
dcs-prd() {
  dcs sync --config prd "$@"
}

# ============================================================================
# Project Navigation
# ============================================================================

# cd to project root (where dcs.yaml is)
dcs-root() {
  local config=$(_dcs_find_config)
  if [[ -n "$config" ]]; then
    cd "$(dirname "$config")"
  else
    echo "Not in a dcs project"
    return 1
  fi
}

# ============================================================================
# Quick Setup
# ============================================================================

# Initialize dcs in current directory with sensible defaults
dcs-init() {
  if _dcs_in_project; then
    echo "dcs.yaml already exists"
    return 1
  fi

  # Try to detect project name from package.json or directory
  local project_name=""
  if [[ -f "package.json" ]]; then
    project_name=$(grep -o '"name": *"[^"]*"' package.json | head -1 | cut -d'"' -f4 | tr '/' '-')
  fi
  project_name="${project_name:-$(basename "$PWD")}"

  echo "Initializing dcs for project: $project_name"
  dcs init --project "$project_name"
}

# ============================================================================
# Git Integration
# ============================================================================

# Install git hooks for auto-sync
dcs-hooks() {
  if ! _dcs_in_project; then
    echo "Not in a dcs project"
    return 1
  fi

  dcs hooks install
}

# ============================================================================
# Diagnostic Commands
# ============================================================================

# Show current dcs context
dcs-context() {
  echo "DCS Context"
  echo "==========="
  echo ""

  local config=$(_dcs_find_config)
  if [[ -n "$config" ]]; then
    echo "Config file: $config"
  else
    echo "Config file: (not found)"
  fi

  local branch=$(_dcs_git_branch)
  if [[ -n "$branch" ]]; then
    echo "Git branch:  $branch"
    echo "Environment: $(_dcs_env_for_branch "$branch")"
  else
    echo "Git branch:  (not in git repo)"
  fi

  echo ""
  echo "Branch Mapping:"
  for key in "${!DCS_BRANCH_MAP[@]}"; do
    echo "  $key -> ${DCS_BRANCH_MAP[$key]}"
  done
}

# ============================================================================
# Completion Setup (if not using generated completions)
# ============================================================================

# Basic completion for bash
if [[ -n "$BASH_VERSION" ]]; then
  _dcs_completions() {
    local cur="${COMP_WORDS[COMP_CWORD]}"
    local commands="init sync status run diff provision neon hooks webhook help"

    if [[ ${COMP_CWORD} -eq 1 ]]; then
      COMPREPLY=($(compgen -W "$commands" -- "$cur"))
    fi
  }
  complete -F _dcs_completions dcs
fi

# ============================================================================
# Prompt Integration (optional)
# ============================================================================

# Add dcs environment to prompt
# Usage: PS1='$(dcs_prompt_info)'"$PS1"
dcs_prompt_info() {
  if _dcs_in_project && [[ "$DCS_AUTO_ENV" == "1" ]]; then
    local env=$(_dcs_env_for_branch)
    echo "[dcs:$env] "
  fi
}

# ============================================================================
# Initialization Message
# ============================================================================

if [[ "${DCS_QUIET:-0}" != "1" ]]; then
  echo "dcs shell integration loaded. Run 'dcs-context' for current context."
fi
