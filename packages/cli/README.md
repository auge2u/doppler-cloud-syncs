# @auge2u/dcs

Doppler Cloud Sync CLI - Unified secret management across cloud platforms.

## Installation

```bash
npm install -g @auge2u/dcs
```

## Commands

### Initialize Project

```bash
dcs init                    # Interactive setup
dcs init -y --name my-app   # Quick setup with defaults
```

### Sync Secrets

```bash
dcs sync                    # Sync to all platforms
dcs sync firebase           # Sync to specific platform
dcs sync --dry-run          # Preview changes
dcs sync -c prod            # Sync prod environment
```

### Show Status

```bash
dcs status                  # Show status for dev
dcs status -c prod          # Show status for prod
```

### Show Diff

```bash
dcs diff                    # Diff all platforms
dcs diff cloudflare         # Diff specific platform
```

### Run with Secrets

```bash
dcs run -- npm start
dcs run -c prod -- node server.js
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

## Environment Variables

Use `${VAR_NAME}` syntax for environment variable interpolation:

```yaml
platforms:
  firebase:
    project_id: ${FIREBASE_PROJECT_ID}
```

## Supported Platforms

- [x] Firebase Functions
- [x] Cloudflare Workers
- [ ] Neon (Phase 2)
- [ ] GCP Cloud Run (Phase 2)
