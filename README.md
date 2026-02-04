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

# Provision Neon database
export NEON_API_KEY=your-key
dcs provision neon

# Sync secrets to platforms
dcs sync

# Run command with secrets
dcs run -- npm start
```

## Commands

### Core Commands

```bash
dcs init              # Initialize a new dcs project
dcs sync              # Sync secrets from Doppler to platforms
dcs sync firebase     # Sync to specific platform
dcs sync --dry-run    # Preview changes
dcs status            # Show sync status
dcs diff              # Show differences between Doppler and platforms
dcs run -- <cmd>      # Run command with secrets injected
```

### Neon Database Commands

```bash
# Provision new Neon project
dcs provision neon --project-name my-app

# Branch management
dcs neon branch list
dcs neon branch create feature-x
dcs neon branch delete feature-x
dcs neon branch reset dev-branch
dcs neon branch switch feature-x -c dev

# Migrations
dcs neon migrate              # Run migrations on dev
dcs neon migrate -c prod      # Run on production
dcs neon migrate --dry-run    # Preview migrations

# Status
dcs neon status
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
  neon:
    project_id: your-neon-project-id
    database: neondb
    migrations_dir: ./migrations
    branch_mapping:
      dev: dev-branch
      staging: staging-branch
      prod: main

  firebase:
    project_id: my-firebase-project

  cloudflare:
    account_id: abc123
    worker: my-worker
```

## Environment Variables

- `NEON_API_KEY` - Neon API key for database operations
- `DOPPLER_TOKEN` - Doppler service token (optional, uses CLI auth by default)

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
- [Phase 1: Core CLI](docs/plans/2026-02-04-phase1-core-cli.md)
- [Phase 2: Neon Integration](docs/plans/2026-02-04-phase2-neon-integration.md)

## License

MIT
