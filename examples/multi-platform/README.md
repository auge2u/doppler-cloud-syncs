# Multi-Platform Example

This example demonstrates syncing Doppler secrets to multiple platforms simultaneously: Firebase, Cloudflare, and Neon.

## Prerequisites

- [Doppler CLI](https://docs.doppler.com/docs/cli) installed and authenticated
- [Firebase CLI](https://firebase.google.com/docs/cli) installed and authenticated
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) installed and authenticated
- [Neon API key](https://neon.tech/docs/manage/api-keys)
- A Doppler project with secrets configured

## Setup

1. **Set environment variables:**

   ```bash
   export NEON_API_KEY=your-neon-api-key
   ```

2. **Configure Doppler:**

   ```bash
   doppler setup
   ```

3. **Provision Neon database:**

   ```bash
   dcs provision neon --project-name my-fullstack-app
   ```

4. **Update dcs.yaml with your project IDs:**

   Update the configuration with your actual project IDs from Firebase, Cloudflare, and Neon.

## Usage

### Sync all platforms at once

```bash
# Sync dev environment to all platforms
dcs sync

# Sync production
dcs sync -c prod

# Preview all changes
dcs sync --dry-run
```

### Sync specific platform

```bash
dcs sync firebase
dcs sync cloudflare
# Neon syncs via branch operations
```

### Check status across platforms

```bash
dcs status
```

### Show differences

```bash
# All platforms
dcs diff

# Specific platform
dcs diff firebase
```

### Neon branch workflow

```bash
# Create dev branch
dcs neon branch create dev-branch
dcs neon branch switch dev-branch -c dev

# Run migrations
dcs neon migrate

# Check status
dcs neon status
```

## Architecture

```
                    ┌──────────────┐
                    │   Doppler    │
                    │ (Source of   │
                    │   Truth)     │
                    └──────┬───────┘
                           │
              dcs sync     │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
         ▼                 ▼                 ▼
   ┌──────────┐     ┌──────────┐     ┌──────────┐
   │ Firebase │     │Cloudflare│     │   Neon   │
   │Functions │     │ Workers  │     │ Database │
   └──────────┘     └──────────┘     └──────────┘
```

## File Structure

```
multi-platform/
├── dcs.yaml           # Full multi-platform configuration
├── functions/         # Firebase Functions
│   └── src/
│       └── index.ts
├── worker/            # Cloudflare Worker
│   └── src/
│       └── index.ts
├── migrations/        # Database migrations
│   ├── 001_init.sql
│   └── 002_users.sql
└── README.md
```

## Git Hooks Integration

Install git hooks to automatically sync secrets on branch changes:

```bash
dcs hooks install
```

This installs:
- `post-checkout`: Syncs secrets when switching branches
- `post-merge`: Syncs secrets after merging

## Webhook Integration

For automatic sync when Doppler secrets change:

```bash
# Start local webhook server for testing
dcs webhook serve --port 3000

# Generate handler for deployment
dcs webhook handler --platform cloudflare -o webhook-handler.ts
```

## Best Practices

1. **Use environment-specific configs:**
   - `dev` for development
   - `staging` for pre-production
   - `prod` for production

2. **Branch mapping for Neon:**
   - Map git branches to database branches
   - Each developer can have isolated data

3. **Git hooks for consistency:**
   - Auto-sync on checkout ensures secrets match branch

4. **Dry-run before production:**
   - Always preview changes with `--dry-run` first
