/**
 * GCP Cloud Run adapter for dcs-runtime
 *
 * Cloud Run services can use Doppler in two ways:
 * 1. Inject secrets at deploy time via Cloud Build
 * 2. Fetch secrets at runtime using this adapter
 *
 * This adapter supports runtime fetching with caching.
 *
 * @example
 * ```typescript
 * import { initSecrets, getSecret } from '@auge2u/dcs-runtime/cloudrun';
 *
 * // Initialize at startup
 * await initSecrets({
 *   keys: ['API_KEY', 'DATABASE_URL'],
 * });
 *
 * // Use in handlers
 * app.get('/api', (req, res) => {
 *   const apiKey = getSecret('API_KEY');
 *   res.json({ status: 'ok' });
 * });
 * ```
 */

import { getSecrets, type Secrets, type SecretsConfig } from '../index.js';

// Module-level secret storage
let secrets: Secrets | null = null;
let initialized = false;
let initPromise: Promise<void> | null = null;

/**
 * Options for Cloud Run secrets initialization
 */
export interface CloudRunSecretsOptions extends Omit<SecretsConfig, 'source'> {
  /**
   * Refresh interval in seconds. Set to 0 to disable auto-refresh.
   * @default 0 (disabled)
   */
  refreshInterval?: number;

  /**
   * Callback when secrets are refreshed
   */
  onRefresh?: (secrets: Secrets) => void;

  /**
   * Callback when refresh fails
   */
  onRefreshError?: (error: Error) => void;
}

let refreshTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Initialize secrets for Cloud Run service
 * Call this once at service startup, before handling requests.
 *
 * @example
 * ```typescript
 * // In your main entry point
 * import { initSecrets } from '@auge2u/dcs-runtime/cloudrun';
 *
 * async function main() {
 *   await initSecrets({
 *     keys: ['API_KEY', 'DATABASE_URL'],
 *     cache: { ttl: 300 },
 *   });
 *
 *   // Start your server
 *   app.listen(process.env.PORT || 8080);
 * }
 *
 * main().catch(console.error);
 * ```
 */
export async function initSecrets(options: CloudRunSecretsOptions = {}): Promise<void> {
  // Prevent multiple initializations
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    const config: SecretsConfig = {
      ...options,
      source: 'doppler',
    };

    secrets = await getSecrets(config);
    initialized = true;

    // Set up auto-refresh if configured
    if (options.refreshInterval && options.refreshInterval > 0) {
      refreshTimer = setInterval(async () => {
        try {
          secrets = await getSecrets({ ...config, cache: { ttl: 0 } });
          options.onRefresh?.(secrets);
        } catch (error) {
          options.onRefreshError?.(error as Error);
        }
      }, options.refreshInterval * 1000);
    }
  })();

  return initPromise;
}

/**
 * Get a single secret value
 * Must call initSecrets() first.
 *
 * @example
 * ```typescript
 * const apiKey = getSecret('API_KEY');
 * ```
 */
export function getSecret(key: string): string | undefined {
  if (!initialized || !secrets) {
    throw new Error('Secrets not initialized. Call initSecrets() first.');
  }
  return secrets[key];
}

/**
 * Get a secret value, throwing if not found
 *
 * @example
 * ```typescript
 * const apiKey = requireSecret('API_KEY'); // Throws if missing
 * ```
 */
export function requireSecret(key: string): string {
  const value = getSecret(key);
  if (value === undefined) {
    throw new Error(`Required secret '${key}' not found`);
  }
  return value;
}

/**
 * Get all initialized secrets
 */
export function getAllSecrets(): Secrets {
  if (!initialized || !secrets) {
    throw new Error('Secrets not initialized. Call initSecrets() first.');
  }
  return { ...secrets };
}

/**
 * Check if secrets are initialized
 */
export function isInitialized(): boolean {
  return initialized;
}

/**
 * Manually refresh secrets
 * Returns the new secrets object.
 */
export async function refreshSecrets(options: CloudRunSecretsOptions = {}): Promise<Secrets> {
  const config: SecretsConfig = {
    ...options,
    source: 'doppler',
    cache: { ttl: 0 }, // Force fresh fetch
  };

  secrets = await getSecrets(config);
  return secrets;
}

/**
 * Stop auto-refresh timer
 */
export function stopAutoRefresh(): void {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
}

/**
 * Reset module state (mainly for testing)
 */
export function reset(): void {
  stopAutoRefresh();
  secrets = null;
  initialized = false;
  initPromise = null;
}

/**
 * Express/Koa middleware to ensure secrets are loaded
 *
 * @example
 * ```typescript
 * import express from 'express';
 * import { secretsMiddleware } from '@auge2u/dcs-runtime/cloudrun';
 *
 * const app = express();
 *
 * // Apply middleware
 * app.use(secretsMiddleware({ keys: ['API_KEY'] }));
 *
 * // Secrets available in handlers
 * app.get('/api', (req, res) => {
 *   const apiKey = getSecret('API_KEY');
 *   res.json({ status: 'ok' });
 * });
 * ```
 */
export function secretsMiddleware(
  options: CloudRunSecretsOptions = {}
): (req: unknown, res: unknown, next: () => void) => Promise<void> {
  return async (_req, _res, next) => {
    if (!initialized) {
      await initSecrets(options);
    }
    next();
  };
}
