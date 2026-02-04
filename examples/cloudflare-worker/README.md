# Cloudflare Worker Example

This example demonstrates syncing Doppler secrets to Cloudflare Workers.

## Prerequisites

- [Doppler CLI](https://docs.doppler.com/docs/cli) installed and authenticated
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) installed and authenticated
- A Doppler project with secrets configured
- A Cloudflare account

## Setup

1. **Configure Doppler project:**

   ```bash
   doppler setup
   ```

2. **Authenticate with Cloudflare:**

   ```bash
   wrangler login
   ```

3. **Update dcs.yaml with your Cloudflare details:**

   ```yaml
   project: my-worker
   doppler:
     project: my-worker
     configs:
       dev: dev
       prod: prd
   platforms:
     cloudflare:
       account_id: YOUR_ACCOUNT_ID
       worker: my-worker
   ```

## Usage

### Sync secrets to Cloudflare

```bash
# Sync dev environment
dcs sync

# Sync production
dcs sync -c prod

# Preview changes
dcs sync --dry-run
```

### Check status

```bash
dcs status
dcs diff cloudflare
```

## Runtime Usage

In your Cloudflare Worker, use the runtime adapter:

```typescript
import { withSecrets } from '@auge2u/dcs-runtime/cloudflare';

export default withSecrets(
  { keys: ['API_KEY', 'DATABASE_URL'] },
  {
    async fetch(request, env, secrets, ctx) {
      // Access secrets
      const apiKey = secrets.API_KEY;
      const dbUrl = secrets.DATABASE_URL;

      return new Response(JSON.stringify({
        status: 'ok',
        hasApiKey: !!apiKey
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
);
```

## File Structure

```
cloudflare-worker/
├── dcs.yaml           # DCS configuration
├── wrangler.toml      # Wrangler configuration
├── src/
│   └── index.ts       # Worker with withSecrets
├── package.json
└── README.md
```

## Notes

- Secrets are synced to Cloudflare's encrypted secrets storage
- Workers access secrets via environment bindings
- The runtime adapter falls back to Doppler API if secrets are not found in env
