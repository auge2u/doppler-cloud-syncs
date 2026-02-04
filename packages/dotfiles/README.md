# @auge2u/dcs-dotfiles

Shell integration and completions for [dcs](https://github.com/auge2u/doppler-cloud-syncs) (Doppler Cloud Sync).

## Features

- **Auto-environment detection**: Automatically selects Doppler config based on git branch
- **Shell completions**: Full tab completion for bash and zsh
- **Convenience aliases**: Quick shortcuts for common commands
- **Prompt integration**: Show current dcs environment in your prompt
- **Project navigation**: Jump to project root with `dcs-root`

## Installation

### Via npm (recommended)

```bash
npm install -g @auge2u/dcs-dotfiles

# Run the installer
dcs-dotfiles-install
```

### Manual Installation

1. Clone or download this package
2. Add to your shell RC file:

```bash
# For bash (~/.bashrc)
source /path/to/dcs-dotfiles/shell/dcs.sh

# For zsh (~/.zshrc)
source /path/to/dcs-dotfiles/shell/dcs.zsh
```

3. For completions:

```bash
# Bash: copy to completion directory
cp completions/dcs.bash /etc/bash_completion.d/dcs
# Or source directly
source /path/to/dcs-dotfiles/completions/dcs.bash

# Zsh: copy to fpath directory
cp completions/_dcs ~/.zsh/completions/_dcs
```

## Usage

### Auto-Environment Detection

When you run `dcs sync`, `dcs diff`, `dcs status`, or `dcs run`, the shell integration automatically detects your environment based on the current git branch:

| Branch Pattern | Environment |
|---------------|-------------|
| `main`, `master`, `production` | `prd` |
| `staging` | `stg` |
| `develop`, `development` | `dev` |
| `feature/*`, `fix/*`, `bugfix/*` | `dev` |
| `release/*` | `stg` |

```bash
# On 'main' branch, automatically uses --config prd
$ dcs sync
[dcs] Auto-detected environment: prd (branch: main)
```

### Customize Branch Mapping

Add to your RC file before sourcing dcs.sh/dcs.zsh:

```bash
# Bash
DCS_BRANCH_MAP[qa]=stg
DCS_BRANCH_MAP[test]=dev

# Zsh
DCS_BRANCH_MAP[qa]=stg
DCS_BRANCH_MAP[test]=dev
```

### Disable Auto-Detection

```bash
export DCS_AUTO_ENV=0
```

## Commands

### Shell Wrapper

The `dcs` function wraps the CLI with auto-environment detection:

```bash
dcs sync            # Auto-detects environment
dcs sync --config dev  # Explicit environment (no auto-detection)
```

### Convenience Functions

| Function | Description |
|----------|-------------|
| `dcs-dev` | Sync to dev environment |
| `dcs-stg` | Sync to staging environment |
| `dcs-prd` | Sync to production environment |
| `dcs-init` | Initialize dcs in current directory |
| `dcs-hooks` | Install git hooks |
| `dcs-root` | cd to project root (where dcs.yaml is) |
| `dcs-context` | Show current dcs context |

### Aliases

| Alias | Command |
|-------|---------|
| `dcss` | `dcs sync` |
| `dcst` | `dcs status` |
| `dcsr` | `dcs run` |
| `dcsd` | `dcs diff` |

## Prompt Integration

Add dcs environment to your prompt:

```bash
# Bash
PS1='$(dcs_prompt_info)'"$PS1"

# Zsh (in RPROMPT)
RPROMPT='$(dcs_prompt_info)'
```

This shows `[dcs:dev]` when in a dcs project.

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `DCS_AUTO_ENV` | `1` | Enable auto-environment detection |
| `DCS_QUIET` | `0` | Suppress startup message |
| `DCS_BRANCH_MAP` | (see above) | Branch to environment mapping |

## Completions

Both bash and zsh completions are provided:

- Commands: `init`, `sync`, `status`, `run`, `diff`, `provision`, `neon`, `hooks`, `webhook`
- Platforms: `firebase`, `cloudflare`, `neon`, `gcp`
- Environments: `dev`, `stg`, `prd`
- Subcommands for `neon`, `hooks`, `webhook`

## License

MIT
