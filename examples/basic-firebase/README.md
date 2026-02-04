# Basic Firebase Example

This example demonstrates syncing Doppler secrets to Firebase Functions.

## Prerequisites

- [Doppler CLI](https://docs.doppler.com/docs/cli) installed and authenticated
- [Firebase CLI](https://firebase.google.com/docs/cli) installed and authenticated
- A Doppler project with secrets configured
- A Firebase project

## Setup

1. **Configure Doppler project:**

   ```bash
   doppler setup
   ```

2. **Update dcs.yaml with your project IDs:**

   ```yaml
   project: my-app
   doppler:
     project: my-app
     configs:
       dev: dev
       prod: prd
   platforms:
     firebase:
       project_id: YOUR_FIREBASE_PROJECT_ID
   ```

3. **Initialize dcs in your project:**

   ```bash
   dcs init
   ```

## Usage

### Sync secrets to Firebase

```bash
# Sync dev environment
dcs sync

# Sync production
dcs sync -c prod

# Preview changes without syncing
dcs sync --dry-run
```

### Check sync status

```bash
dcs status
```

### Show differences

```bash
dcs diff firebase
```

## Runtime Usage

In your Firebase Functions, use the runtime adapter:

```typescript
import { withSecrets } from '@auge2u/dcs-runtime/firebase';
import { onRequest } from 'firebase-functions/v2/https';

export const api = withSecrets(
  { keys: ['API_KEY', 'DATABASE_URL'] },
  (req, res, secrets) => {
    // Access secrets
    const apiKey = secrets.API_KEY;
    const dbUrl = secrets.DATABASE_URL;

    res.json({ status: 'ok' });
  }
);
```

## File Structure

```
basic-firebase/
├── dcs.yaml           # DCS configuration
├── functions/
│   ├── src/
│   │   └── index.ts   # Cloud Functions with withSecrets
│   └── package.json
└── README.md
```
