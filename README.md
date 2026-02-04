# doppler-cloud-syncs

[![CI](https://github.com/auge2u/doppler-cloud-syncs/actions/workflows/ci.yml/badge.svg)](https://github.com/auge2u/doppler-cloud-syncs/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@auge2u/dcs.svg)](https://www.npmjs.com/package/@auge2u/dcs)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Unified secret management across cloud platforms using Doppler as the source of truth.

## Packages

| Package | Description |
|---------|-------------|
| **@auge2u/dcs** | CLI for syncing secrets |
| **@auge2u/dcs-runtime** | Runtime adapters for serverless platforms |
| **@auge2u/dcs-dotfiles** | Shell integration and completions |

## Quick Start

```bash
# Install CLI
npm install -g @auge2u/dcs

# Initialize project
dcs init

# Authenticate with Doppler (if not already)
doppler login

# Sync secrets to platforms
dcs sync

# Run command with secrets injected
dcs run -- npm start
```

## Command Reference

### Global Options

| Option | Description |
|--------|-------------|
| `--verbose` | Show detailed error information including stack traces |
| `-V, --version` | Output version number |
| `-h, --help` | Display help |

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General error |
| 2 | Configuration error (missing/invalid dcs.yaml) |
| 3 | Authentication error (invalid credentials) |
| 4 | Platform error (Firebase, Cloudflare, Neon issues) |

---

### `dcs init`

Initialize a new dcs project by creating a `dcs.yaml` configuration file.

```bash
dcs init [options]
```

**Options:**

| Option | Description |
|--------|-------------|
| `--from-dotfiles` | Use dotfiles templates and identity registry |
| `-y, --yes` | Accept defaults without prompting |
| `--name <name>` | Project name |

**Examples:**

```bash
# Interactive initialization
dcs init

# Non-interactive with defaults
dcs init --yes

# Specify project name
dcs init --name my-app
```

---

### `dcs sync`

Sync secrets from Doppler to configured platforms.

```bash
dcs sync [platform] [options]
```

**Arguments:**

| Argument | Description |
|----------|-------------|
| `platform` | Optional. Sync to specific platform only (firebase, cloudflare) |

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `-c, --config <env>` | Environment config to sync | `dev` |
| `--dry-run` | Show what would be synced without making changes | - |
| `-q, --quiet` | Minimal output (for use in scripts/hooks) | - |

**Examples:**

```bash
# Sync to all platforms (dev environment)
dcs sync

# Sync to production
dcs sync -c prod

# Sync only to Firebase
dcs sync firebase

# Preview changes without syncing
dcs sync --dry-run

# Quiet mode for scripts
dcs sync --quiet
```

---

### `dcs status`

Show sync status across all configured platforms.

```bash
dcs status [options]
```

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `-c, --config <env>` | Environment to check | `dev` |

**Examples:**

```bash
# Check dev environment status
dcs status

# Check production status
dcs status -c prod
```

---

### `dcs diff`

Show differences between Doppler secrets and platform secrets.

```bash
dcs diff [platform] [options]
```

**Arguments:**

| Argument | Description |
|----------|-------------|
| `platform` | Optional. Check specific platform only |

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `-c, --config <env>` | Environment config | `dev` |

**Examples:**

```bash
# Show all differences
dcs diff

# Check Firebase only
dcs diff firebase

# Check production environment
dcs diff -c prod
```

---

### `dcs run`

Run a command with secrets injected as environment variables.

```bash
dcs run [options] -- <command...>
```

**Arguments:**

| Argument | Description |
|----------|-------------|
| `command` | Command to run (after `--`) |

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `-c, --config <env>` | Environment config | `dev` |

**Examples:**

```bash
# Run npm start with dev secrets
dcs run -- npm start

# Run with production secrets
dcs run -c prod -- npm start

# Run any command
dcs run -- node scripts/migrate.js
```

---

### `dcs provision neon`

Provision a new Neon database project and sync credentials to Doppler.

```bash
dcs provision neon [options]
```

**Options:**

| Option | Description |
|--------|-------------|
| `--project-name <name>` | Name for the new Neon project |
| `--api-key <key>` | Neon API key (or set NEON_API_KEY) |
| `-c, --config <env>` | Environment to sync credentials to |

**Examples:**

```bash
# Provision with API key from environment
export NEON_API_KEY=your-key
dcs provision neon --project-name my-app

# Specify API key directly
dcs provision neon --api-key neon_key_xxx --project-name my-app
```

---

### `dcs neon branch`

Manage Neon database branches.

#### `dcs neon branch list`

```bash
dcs neon branch list [options]
```

**Options:**

| Option | Description |
|--------|-------------|
| `--api-key <key>` | Neon API key (or set NEON_API_KEY) |

#### `dcs neon branch create`

```bash
dcs neon branch create <name> [options]
```

**Options:**

| Option | Description |
|--------|-------------|
| `--api-key <key>` | Neon API key |
| `--parent <name>` | Parent branch name (default: main) |
| `-c, --config <env>` | Environment to sync connection string to |

**Examples:**

```bash
# Create branch from main
dcs neon branch create feature-auth

# Create branch from specific parent
dcs neon branch create hotfix --parent staging

# Create and sync connection to dev environment
dcs neon branch create feature-x -c dev
```

#### `dcs neon branch delete`

```bash
dcs neon branch delete <name> [options]
```

**Options:**

| Option | Description |
|--------|-------------|
| `--api-key <key>` | Neon API key |
| `-y, --yes` | Skip confirmation |

#### `dcs neon branch reset`

Reset a branch to its parent state (destructive).

```bash
dcs neon branch reset <name> [options]
```

**Options:**

| Option | Description |
|--------|-------------|
| `--api-key <key>` | Neon API key |
| `-y, --yes` | Skip confirmation |

#### `dcs neon branch switch`

Switch active branch for an environment by updating Doppler with new connection info.

```bash
dcs neon branch switch <name> [options]
```

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `--api-key <key>` | Neon API key | - |
| `-c, --config <env>` | Environment config | `dev` |

**Examples:**

```bash
# Switch dev environment to feature branch
dcs neon branch switch feature-auth -c dev

# Switch staging to release branch
dcs neon branch switch release-v2 -c staging
```

---

### `dcs neon migrate`

Run SQL migrations against the Neon database.

```bash
dcs neon migrate [options]
```

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `--api-key <key>` | Neon API key | - |
| `-c, --config <env>` | Environment config | `dev` |
| `--dry-run` | Show migrations without running | - |
| `--dir <path>` | Migrations directory | `./migrations` |

**Examples:**

```bash
# Run migrations on dev
dcs neon migrate

# Run migrations on production
dcs neon migrate -c prod

# Preview migrations
dcs neon migrate --dry-run

# Use custom migrations directory
dcs neon migrate --dir ./db/migrations
```

---

### `dcs neon status`

Show Neon project status including branches and environment mapping.

```bash
dcs neon status [options]
```

**Options:**

| Option | Description |
|--------|-------------|
| `--api-key <key>` | Neon API key (or set NEON_API_KEY) |

---

### `dcs hooks`

Manage git hooks for automatic secret syncing.

#### `dcs hooks install`

Install git hooks that automatically sync secrets on checkout and merge.

```bash
dcs hooks install [options]
```

**Options:**

| Option | Description |
|--------|-------------|
| `-c, --config <env>` | Environment config for sync |

#### `dcs hooks uninstall`

Remove dcs-managed git hooks.

```bash
dcs hooks uninstall [options]
```

**Options:**

| Option | Description |
|--------|-------------|
| `--all` | Remove all hooks (not just dcs-managed) |

#### `dcs hooks status`

Show installed hook status.

```bash
dcs hooks status
```

---

### `dcs webhook`

Manage Doppler webhooks for automatic sync.

#### `dcs webhook serve`

Start a local webhook server for testing.

```bash
dcs webhook serve [options]
```

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `-p, --port <port>` | Port to listen on | `3000` |
| `--secret <secret>` | Webhook secret for signature verification | - |

#### `dcs webhook handler`

Generate webhook handler code for deployment.

```bash
dcs webhook handler [options]
```

**Options:**

| Option | Description |
|--------|-------------|
| `--platform <platform>` | Target platform (express, cloudflare, firebase) |
| `-o, --output <path>` | Output file path |

#### `dcs webhook info`

Show webhook configuration instructions.

```bash
dcs webhook info
```

---

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

---

## Shell Integration

Install `@auge2u/dcs-dotfiles` for enhanced shell features:

```bash
npm install -g @auge2u/dcs-dotfiles
dcs-dotfiles-install
```

**Features:**
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

---

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

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NEON_API_KEY` | Neon API key for database operations |
| `DOPPLER_TOKEN` | Doppler service token (optional, uses CLI auth by default) |
| `DOPPLER_WEBHOOK_SECRET` | Secret for verifying Doppler webhook signatures |

---

## Troubleshooting

### Configuration Errors (Exit Code 2)

**"No dcs.yaml found in current directory or parents"**
- Run `dcs init` to create a configuration file
- Ensure you're in the correct project directory

**"Invalid YAML in dcs.yaml"**
- Check for syntax errors (missing colons, improper indentation)
- Use a YAML linter to validate the file

**"Configuration validation failed"**
- Ensure all required fields are present
- Check that platform configurations match the expected schema

### Authentication Errors (Exit Code 3)

**"Not authenticated with Doppler"**
- Run `doppler login` to authenticate
- Or set `DOPPLER_TOKEN` environment variable

**"Neon API key not found"**
- Set `NEON_API_KEY` environment variable
- Or pass `--api-key` flag to the command

**"Not authenticated with Firebase"**
- Run `firebase login` to authenticate
- Ensure you have access to the project

**"Not authenticated with Cloudflare"**
- Run `wrangler login` to authenticate
- Or set `CLOUDFLARE_API_TOKEN` environment variable

### Platform Errors (Exit Code 4)

**"Platform not configured"**
- Add the platform configuration to `dcs.yaml`
- Run `dcs provision <platform>` if available

**"Branch not found"**
- Check branch name with `dcs neon branch list`
- Create the branch with `dcs neon branch create <name>`

**"Cannot delete main branch"**
- Main/default branches cannot be deleted
- Delete feature branches instead

### Network Errors

**"Failed to connect to [service]"**
- Check your internet connection
- Verify the service is not down

**"Request timed out"**
- The service may be slow or unavailable
- Try again later

### Debug Mode

Use `--verbose` flag to see detailed error information:

```bash
dcs sync --verbose
```

This shows stack traces and additional context for debugging.

---

## Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Run in watch mode
pnpm test:watch
```

---

## License

MIT
