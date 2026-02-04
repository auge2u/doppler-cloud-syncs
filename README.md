# doppler-cloud-syncs

Unified secret management across cloud platforms using Doppler as the source of truth.

## Packages

- **@auge2u/dcs** - CLI for syncing secrets (`packages/cli`)
- **@auge2u/dcs-runtime** - Runtime adapters (Phase 3)

## Quick Start

```bash
# Install CLI
npm install -g @auge2u/dcs

# Initialize project
dcs init

# Sync secrets to platforms
dcs sync

# Run command with secrets
dcs run -- npm start
```

## Commands

```bash
dcs init              # Initialize a new dcs project
dcs sync              # Sync secrets from Doppler to platforms
dcs sync firebase     # Sync to specific platform
dcs sync --dry-run    # Preview changes
dcs status            # Show sync status
dcs diff              # Show differences between Doppler and platforms
dcs run -- <cmd>      # Run command with secrets injected
```

## Configuration

Create `dcs.yaml` in your project root:

```yaml
project: my-app
doppler:
  project: my-app
  configs:
    dev: dev
    staging: stg
    prod: prd

platforms:
  firebase:
    project_id: my-firebase-project
  cloudflare:
    account_id: abc123
    worker: my-worker
```

## Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test
```

## Documentation

- [Design Document](docs/plans/2026-02-04-dcs-cli-design.md)
- [Phase 1 Implementation](docs/plans/2026-02-04-phase1-core-cli.md)

## License

MIT
