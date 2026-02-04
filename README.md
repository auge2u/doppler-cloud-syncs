# doppler-cloud-syncs

Unified secret management across cloud platforms using Doppler as the source of truth.

## Packages

| Package | Description |
|---------|-------------|
| **@auge2u/dcs** | CLI for syncing secrets |
| **@auge2u/dcs-runtime** | Runtime adapters for serverless platforms |
| **@auge2u/dcs-dotfiles** | Shell integration and completions |

## Quick Start

```bash
# Install CLI and shell integration
npm install -g @auge2u/dcs @auge2u/dcs-dotfiles

# Set up shell integration
dcs-dotfiles-install

# Initialize project
dcs init

# Provision Neon database
export NEON_API_KEY=your-key
dcs provision neon

# Install git hooks for auto-sync
dcs hooks install

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

### Git Hooks

```bash
dcs hooks install     # Install post-checkout & post-merge hooks
dcs hooks uninstall   # Remove dcs-managed hooks
dcs hooks status      # Show hook installation status
```

### Webhooks

```bash
dcs webhook serve     # Start local webhook server for testing
dcs webhook handler   # Generate handler code for deployment
dcs webhook info      # Show setup instructions
```

## Runtime Adapters

Use `@auge2u/dcs-runtime` for serverless platforms:

### Firebase Functions

```typescript
import { withSecrets } from '@auge2u/dcs-runtime/firebase';

export const api = withSecrets(
  { keys: ['API_KEY', 'DATABASE_URL'] },
  (req, res, secrets) => {
    const apiKey = secrets.API_KEY;
    res.json({ status: 'ok' });
  }
);
```

### Cloudflare Workers

```typescript
import { withSecrets } from '@auge2u/dcs-runtime/cloudflare';

export default withSecrets(
  { keys: ['API_KEY'] },
  {
    async fetch(request, env, secrets, ctx) {
      return new Response(`Key: ${secrets.API_KEY}`);
    }
  }
);
```

### Cloud Run / Express

```typescript
import { initSecrets, getSecret } from '@auge2u/dcs-runtime/cloudrun';

await initSecrets({ keys: ['API_KEY', 'DATABASE_URL'] });

app.get('/api', (req, res) => {
  const apiKey = getSecret('API_KEY');
  res.json({ status: 'ok' });
});
```

## Shell Integration

Install `@auge2u/dcs-dotfiles` for enhanced shell features:

- **Auto-environment detection**: Selects Doppler config based on git branch
- **Shell completions**: Full tab completion for bash and zsh
- **Aliases**: `dcss` (sync), `dcst` (status), `dcsr` (run), `dcsd` (diff)
- **Quick commands**: `dcs-dev`, `dcs-stg`, `dcs-prd`, `dcs-context`

### Branch to Environment Mapping

| Branch | Environment |
|--------|-------------|
| `main`, `master`, `production` | `prd` |
| `staging` | `stg` |
| `develop`, `development` | `dev` |
| `feature/*`, `fix/*` | `dev` |
| `release/*` | `stg` |

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

| Variable | Description |
|----------|-------------|
| `NEON_API_KEY` | Neon API key for database operations |
| `DOPPLER_TOKEN` | Doppler service token (optional, uses CLI auth by default) |
| `DOPPLER_WEBHOOK_SECRET` | Secret for verifying Doppler webhook signatures |

## Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test
```

## License

MIT
