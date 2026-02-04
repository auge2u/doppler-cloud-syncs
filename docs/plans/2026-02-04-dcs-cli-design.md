# DCS (Doppler Cloud Sync) CLI Design

**Date:** 2026-02-04
**Status:** Draft
**Author:** Agustin M. (auge2u)

## Overview

`dcs` is a CLI that treats Doppler as the single source of truth and orchestrates secrets across cloud infrastructure. It provides full lifecycle management: project bootstrap, ongoing sync, and runtime injection.

### Goals

- Unified secret management across Neon, Firebase, Cloudflare, and GCP
- Efficient per-project onboarding with single command
- Runtime secret injection for serverless platforms
- Integration with `auge2u/dotfiles` for context-aware workflows

### Distribution

- **Standalone**: `npm install -g @auge2u/dcs` or `brew install auge2u/tap/dcs`
- **Dotfiles integration**: Shell functions that wrap `dcs` with identity/context awareness

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Doppler (Source of Truth)                │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                         dcs CLI                                 │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐    │
│  │ Bootstrap │  │   Sync    │  │  Runtime  │  │   Neon    │    │
│  │  Engine   │  │  Engine   │  │  Adapters │  │  Manager  │    │
│  └───────────┘  └───────────┘  └───────────┘  └───────────┘    │
└─────────────────────────────────────────────────────────────────┘
          │              │              │              │
          ▼              ▼              ▼              ▼
   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
   │ Firebase │   │Cloudflare│   │   GCP    │   │   Neon   │
   │Functions │   │ Workers  │   │Cloud Run │   │ Postgres │
   └──────────┘   └──────────┘   └──────────┘   └──────────┘
```

## CLI Commands

### Bootstrap

```bash
dcs init                      # Interactive project setup (detects existing services)
dcs init --from-dotfiles      # Use dotfiles templates + identity registry
dcs provision <platform>      # Create resources and populate Doppler
  dcs provision neon          # Create Neon project/branch, store creds in Doppler
  dcs provision firebase      # Link Firebase project, sync initial config
  dcs provision cloudflare    # Link CF account, set up Workers secrets
```

### Sync

```bash
dcs sync                      # Push Doppler → all configured platforms
dcs sync <platform>           # Push to specific platform
dcs sync --dry-run            # Preview changes without applying
dcs diff                      # Show drift between Doppler and platforms
```

### Runtime

```bash
dcs run -- <command>          # Inject secrets and run (like doppler run)
dcs serve                     # Local dev server with live secret reload
dcs env                       # Print secrets as export statements
```

### Neon

```bash
dcs neon branch create <name> # Create branch, update Doppler with new connection
dcs neon branch switch <name> # Switch active branch in current env
dcs neon migrate              # Run migrations on current branch
dcs neon migrate --promote    # Run migrations then promote branch to main
```

### Hooks & Automation

```bash
dcs hooks install             # Install git hooks for auto-sync
dcs webhook setup <platform>  # Configure Doppler webhook → platform
dcs status                    # Show sync state across all platforms
```

## Configuration

### Project Config (`dcs.yaml`)

```yaml
project: my-app
doppler:
  project: my-app
  configs:
    dev: dev
    staging: stg
    prod: prd

platforms:
  neon:
    project_id: ${NEON_PROJECT_ID}
    branch_mapping:
      dev: dev-branch
      staging: staging-branch
      prod: main

  firebase:
    project_id: ${FIREBASE_PROJECT_ID}

  cloudflare:
    account_id: ${CF_ACCOUNT_ID}
    worker: my-worker

sync:
  triggers:
    - type: git-hook
      branch: main
      target: prod
    - type: webhook
      platforms: [cloudflare, firebase]
```

### Global Config (`~/.config/dcs/config.yaml`)

```yaml
defaults:
  doppler_project_prefix: "auge2u"

identity_mappings:
  auge2u:
    doppler_token_env: DOPPLER_TOKEN_AUGE2U
    neon_org: auge2u
    cloudflare_account: ${CF_ACCOUNT_AUGE2U}
  habitusnet:
    doppler_token_env: DOPPLER_TOKEN_HABITUSNET
    neon_org: habitusnet-org
    cloudflare_account: ${CF_ACCOUNT_HABITUSNET}

templates_dir: ~/github/auge2u/dotfiles/templates/dcs
```

## Neon Integration

### Branch-Environment Mapping

```
Doppler Config    →    Neon Branch    →    DATABASE_URL in Doppler
─────────────────────────────────────────────────────────────────
dev               →    dev-branch     →    postgres://...neon.tech/dev
stg               →    staging-branch →    postgres://...neon.tech/staging
prd               →    main           →    postgres://...neon.tech/main
```

### Provisioning Flow

```bash
$ dcs provision neon

→ Creating Neon project "my-app"...
→ Creating branches: dev-branch, staging-branch
→ Generating connection strings...
→ Populating Doppler secrets:
    dev:  DATABASE_URL, NEON_HOST, NEON_USER, NEON_PASSWORD
    stg:  DATABASE_URL, NEON_HOST, NEON_USER, NEON_PASSWORD
    prd:  DATABASE_URL, NEON_HOST, NEON_USER, NEON_PASSWORD
✓ Done. Run `dcs neon migrate` to initialize schema.
```

### Migration Workflow

```bash
# Development: iterate on dev branch
dcs neon migrate                    # Runs against dev-branch

# Ready for staging: promote schema
dcs neon branch reset staging       # Reset staging from main
dcs neon migrate --config stg       # Apply migrations to staging

# Production deploy with safety
dcs neon migrate --config prd --dry-run   # Preview
dcs neon migrate --config prd             # Apply
```

### Schema Coordination (Optional)

Store migration state in Doppler:

```yaml
NEON_MIGRATION_VERSION: "20240215_001"
NEON_SCHEMA_CHECKSUM: "a1b2c3..."
```

`dcs neon migrate` checks these before running, preventing drift.

## Runtime Adapters

### Package: `@auge2u/dcs-runtime`

```typescript
// Universal interface
import { getSecrets } from '@auge2u/dcs-runtime';

const secrets = await getSecrets({
  source: 'doppler',
  cache: { ttl: 300 },
  fallback: 'env',
});
```

### Firebase Functions

```typescript
import { onRequest } from 'firebase-functions/v2/https';
import { withSecrets } from '@auge2u/dcs-runtime/firebase';

export const api = onRequest(
  withSecrets({ keys: ['API_KEY', 'DATABASE_URL'] },
  async (secrets, req, res) => {
    // secrets.API_KEY available here
  })
);
```

### Cloudflare Workers

```typescript
import { withSecrets } from '@auge2u/dcs-runtime/cloudflare';

export default withSecrets({
  async fetch(request, env, secrets) {
    // secrets populated from Doppler at cold start
  }
});
```

### Caching Strategy

- Cold start: Fetch from Doppler, cache in memory
- Warm invocations: Use cached values
- TTL expiry: Background refresh (non-blocking)
- Doppler outage: Use cached values, log warning

## Sync Triggers

### Git Hooks

```bash
$ dcs hooks install

→ Installing pre-push hook...
→ Created .git/hooks/pre-push
✓ Sync will run before push to: main, staging
```

Generated hook:

```bash
#!/bin/bash
branch=$(git symbolic-ref --short HEAD)
config=$(dcs config get "sync.git_hooks.$branch.config" 2>/dev/null)

if [[ -n "$config" ]]; then
  echo "→ Syncing secrets for $branch ($config)..."
  dcs sync --config "$config" || exit 1
fi
```

### Doppler Webhooks

```bash
$ dcs webhook setup cloudflare

→ Registering webhook with Doppler...
→ Webhook URL: https://api.doppler.com/webhooks/xxx
→ Target: Cloudflare Workers (my-worker)
→ Trigger: On secret change in prd config
✓ Webhook active. Changes to prd will auto-sync.
```

### GitHub Actions Receiver (Recommended)

```yaml
# .github/workflows/doppler-sync.yml
name: Doppler Secret Sync
on:
  repository_dispatch:
    types: [doppler-secret-change]

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dopplerhq/cli-action@v3
      - run: npm install -g @auge2u/dcs
      - run: dcs sync --config ${{ github.event.client_payload.config }}
        env:
          DOPPLER_TOKEN: ${{ secrets.DOPPLER_TOKEN }}
          CF_API_TOKEN: ${{ secrets.CF_API_TOKEN }}
```

## Dotfiles Integration

### Shell Wrappers (`dotfiles/shell/dcs.zsh`)

```bash
# Auto-detect project and run dcs with context
dcs() {
  local config_dir="${DCS_CONFIG_DIR:-$HOME/.config/dcs}"

  if [[ -f "$HOME/.dotfiles.local/identity-registry.conf" ]]; then
    local org=$(detect-org-from-git)
    # Export relevant credentials for dcs
  fi

  command dcs "$@"
}

# Quick sync for current project
dsync() {
  dcs sync --config "$(dcs-detect-env)" "$@"
}

# Run command with secrets from detected environment
drun() {
  dcs run --config "$(dcs-detect-env)" -- "$@"
}

# Initialize new project with dotfiles defaults
dnew() {
  local name="$1"
  dcs init --from-dotfiles --name "$name"
}
```

### Integration Points

| Existing System | DCS Integration |
|-----------------|-----------------|
| `identity-registry.conf` | Maps org → Doppler project/config defaults |
| `project-init` | Calls `dcs init` when Doppler detected |
| `init-stack` skill | Orchestrates `dcs provision` for each platform |
| `.envrc` templates | Include `eval "$(dcs env)"` for direnv |

## Project Structure

```
dcs/
├── packages/
│   ├── cli/                    # @auge2u/dcs
│   │   ├── src/
│   │   │   ├── commands/
│   │   │   │   ├── init.ts
│   │   │   │   ├── sync.ts
│   │   │   │   ├── provision.ts
│   │   │   │   ├── neon.ts
│   │   │   │   ├── hooks.ts
│   │   │   │   └── webhook.ts
│   │   │   ├── platforms/
│   │   │   │   ├── doppler.ts
│   │   │   │   ├── neon.ts
│   │   │   │   ├── firebase.ts
│   │   │   │   ├── cloudflare.ts
│   │   │   │   └── gcp.ts
│   │   │   ├── config/
│   │   │   │   ├── loader.ts
│   │   │   │   └── dotfiles.ts
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── runtime/                # @auge2u/dcs-runtime
│       ├── src/
│       │   ├── core.ts
│       │   ├── adapters/
│       │   │   ├── firebase.ts
│       │   │   ├── cloudflare.ts
│       │   │   └── cloudrun.ts
│       │   └── index.ts
│       └── package.json
│
├── templates/
│   ├── dcs.yaml.template
│   ├── github-actions/
│   │   └── doppler-sync.yml
│   └── envrc.template
│
├── docs/
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

### Tech Stack

- **CLI**: TypeScript, Commander.js, Inquirer
- **Runtime**: TypeScript, zero dependencies (platform SDKs as peer deps)
- **Build**: tsup, pnpm workspaces
- **Test**: Vitest

## Implementation Phases

### Phase 1: Core CLI + Doppler

- `dcs init` - Interactive setup, detect existing services
- `dcs sync` - Push Doppler → platforms (Firebase, Cloudflare)
- `dcs run` - Inject secrets and run commands
- `dcs diff` / `dcs status` - Show drift
- Config file loader (`dcs.yaml`)

### Phase 2: Neon Integration

- `dcs provision neon` - Create project/branches, populate Doppler
- `dcs neon branch` - Create, switch, reset branches
- `dcs neon migrate` - Run migrations with environment awareness
- Branch-to-config mapping

### Phase 3: Runtime Adapters

- `@auge2u/dcs-runtime` package
- Firebase Functions adapter
- Cloudflare Workers adapter
- GCP Cloud Run adapter
- Caching and fallback logic

### Phase 4: Automation

- `dcs hooks install` - Git hooks for deploy-time sync
- `dcs webhook setup` - Doppler webhook configuration
- GitHub Actions templates
- `dcs serve` - Local dev with live reload

### Phase 5: Dotfiles Integration

- Shell wrappers (`dcs.zsh`)
- Identity registry integration
- Update `init-stack` skill to use `dcs`
- Templates in dotfiles repo

## References

- [Doppler Cloudflare Workers Docs](https://docs.doppler.com/docs/cloudflare-workers)
- [Doppler Firebase Docs](https://docs.doppler.com/docs/firebase-installation)
- [Neon API](https://api-docs.neon.tech/)
- [auge2u/dotfiles](https://github.com/auge2u/dotfiles)
