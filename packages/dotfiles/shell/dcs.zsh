#!/bin/zsh
# dcs - Doppler Cloud Sync zsh integration
# Source this file in your .zshrc:
#   source /path/to/dcs.zsh
#
# Or if installed via npm:
#   source "$(npm root -g)/@auge2u/dcs-dotfiles/shell/dcs.zsh"

# ============================================================================
# Configuration
# ============================================================================

# Default Doppler environment based on git branch
: ${DCS_AUTO_ENV:=1}

# Map git branches to Doppler configs
typeset -A DCS_BRANCH_MAP
DCS_BRANCH_MAP=(
  main        prd
  master      prd
  production  prd
  staging     stg
  develop     dev
  development dev
)

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
  if (( ${+DCS_BRANCH_MAP[$branch]} )); then
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
    dir="${dir:h}"
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
          print -P "%F{cyan}[dcs]%f Auto-detected environment: %F{green}$env%f (branch: $(_dcs_git_branch))"
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

alias dcss='dcs sync'
alias dcst='dcs status'
alias dcsr='dcs run'
alias dcsd='dcs diff'

# ============================================================================
# Environment-specific shortcuts
# ============================================================================

dcs-dev() { dcs sync --config dev "$@" }
dcs-stg() { dcs sync --config stg "$@" }
dcs-prd() { dcs sync --config prd "$@" }

# ============================================================================
# Project Navigation
# ============================================================================

dcs-root() {
  local config=$(_dcs_find_config)
  if [[ -n "$config" ]]; then
    cd "${config:h}"
  else
    print -P "%F{red}Not in a dcs project%f"
    return 1
  fi
}

# ============================================================================
# Quick Setup
# ============================================================================

dcs-init() {
  if _dcs_in_project; then
    print -P "%F{yellow}dcs.yaml already exists%f"
    return 1
  fi

  local project_name=""
  if [[ -f "package.json" ]]; then
    project_name=$(grep -o '"name": *"[^"]*"' package.json | head -1 | cut -d'"' -f4 | tr '/' '-')
  fi
  project_name="${project_name:-${PWD:t}}"

  print -P "Initializing dcs for project: %F{green}$project_name%f"
  dcs init --project "$project_name"
}

# ============================================================================
# Git Integration
# ============================================================================

dcs-hooks() {
  if ! _dcs_in_project; then
    print -P "%F{red}Not in a dcs project%f"
    return 1
  fi
  dcs hooks install
}

# ============================================================================
# Diagnostic Commands
# ============================================================================

dcs-context() {
  print -P "%F{cyan}DCS Context%f"
  print -P "%F{cyan}===========%f"
  echo ""

  local config=$(_dcs_find_config)
  if [[ -n "$config" ]]; then
    print -P "Config file: %F{green}$config%f"
  else
    print -P "Config file: %F{yellow}(not found)%f"
  fi

  local branch=$(_dcs_git_branch)
  if [[ -n "$branch" ]]; then
    print -P "Git branch:  %F{green}$branch%f"
    print -P "Environment: %F{green}$(_dcs_env_for_branch "$branch")%f"
  else
    print -P "Git branch:  %F{yellow}(not in git repo)%f"
  fi

  echo ""
  print -P "%F{cyan}Branch Mapping:%f"
  for key value in ${(kv)DCS_BRANCH_MAP}; do
    print -P "  %F{blue}$key%f -> %F{green}$value%f"
  done
}

# ============================================================================
# Zsh Completion
# ============================================================================

_dcs() {
  local -a commands
  commands=(
    'init:Initialize a new dcs project'
    'sync:Sync secrets from Doppler to platforms'
    'status:Show sync status across all platforms'
    'run:Run a command with secrets injected'
    'diff:Show differences between Doppler and platforms'
    'provision:Provision cloud resources'
    'neon:Neon database management'
    'hooks:Manage git hooks'
    'webhook:Manage Doppler webhooks'
    'help:Display help'
  )

  local -a platforms
  platforms=('firebase' 'cloudflare' 'neon' 'gcp')

  local -a environments
  environments=('dev' 'stg' 'prd')

  _arguments -C \
    '1: :->command' \
    '*:: :->args'

  case $state in
    command)
      _describe -t commands 'dcs command' commands
      ;;
    args)
      case $words[1] in
        sync|diff|status)
          _arguments \
            '-c[Environment config]:environment:($environments)' \
            '--config[Environment config]:environment:($environments)' \
            '--dry-run[Show what would be done]' \
            '-q[Quiet mode]' \
            '--quiet[Quiet mode]' \
            '1:platform:($platforms)'
          ;;
        run)
          _arguments \
            '-c[Environment config]:environment:($environments)' \
            '--config[Environment config]:environment:($environments)' \
            '*:command:_command_names'
          ;;
        hooks)
          local -a hook_commands
          hook_commands=('install' 'uninstall' 'status')
          _describe -t commands 'hooks command' hook_commands
          ;;
        webhook)
          local -a webhook_commands
          webhook_commands=('serve' 'handler' 'info')
          _describe -t commands 'webhook command' webhook_commands
          ;;
        neon)
          local -a neon_commands
          neon_commands=('branch' 'migrate')
          _describe -t commands 'neon command' neon_commands
          ;;
        provision)
          _describe -t platforms 'platform' platforms
          ;;
      esac
      ;;
  esac
}

compdef _dcs dcs

# ============================================================================
# Prompt Integration
# ============================================================================

# Add to RPROMPT or use in custom prompt
dcs_prompt_info() {
  if _dcs_in_project && [[ "$DCS_AUTO_ENV" == "1" ]]; then
    local env=$(_dcs_env_for_branch)
    echo "%F{242}[dcs:$env]%f "
  fi
}

# ============================================================================
# Initialization
# ============================================================================

if [[ "${DCS_QUIET:-0}" != "1" ]]; then
  print -P "%F{green}dcs%f shell integration loaded. Run %F{cyan}dcs-context%f for current context."
fi
