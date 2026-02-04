/**
 * Firebase Functions adapter for dcs-runtime
 *
 * @example
 * ```typescript
 * import { onRequest } from 'firebase-functions/v2/https';
 * import { withSecrets } from '@auge2u/dcs-runtime/firebase';
 *
 * export const api = onRequest(
 *   withSecrets({ keys: ['API_KEY', 'DATABASE_URL'] },
 *   async (secrets, req, res) => {
 *     const apiKey = secrets.API_KEY;
 *     res.json({ status: 'ok' });
 *   })
 * );
 * ```
 */

import { getSecrets, type Secrets, type SecretsConfig } from '../index.js';

/**
 * Firebase HTTP request handler with secrets
 */
export type FirebaseHttpHandler = (
  secrets: Secrets,
  req: Request,
  res: Response
) => void | Promise<void>;

/**
 * Firebase callable handler with secrets
 */
export type FirebaseCallableHandler<T = unknown, R = unknown> = (
  secrets: Secrets,
  data: T,
  context: unknown
) => R | Promise<R>;

/**
 * Options for withSecrets wrapper
 */
export interface WithSecretsOptions extends Omit<SecretsConfig, 'source'> {
  /**
   * Pre-fetch secrets at module load time (recommended for cold start optimization)
   * @default true
   */
  prefetch?: boolean;
}

// Module-level cache for prefetched secrets
let prefetchedSecrets: Secrets | null = null;
let prefetchPromise: Promise<Secrets> | null = null;

/**
 * Wrap a Firebase HTTP function to inject secrets
 *
 * @example
 * ```typescript
 * export const api = onRequest(
 *   withSecrets({ keys: ['API_KEY'] },
 *   async (secrets, req, res) => {
 *     res.json({ key: secrets.API_KEY });
 *   })
 * );
 * ```
 */
export function withSecrets(
  options: WithSecretsOptions,
  handler: FirebaseHttpHandler
): (req: Request, res: Response) => Promise<void> {
  const config: SecretsConfig = {
    ...options,
    source: 'doppler',
  };

  // Start prefetch if enabled
  if (options.prefetch !== false && !prefetchPromise) {
    prefetchPromise = getSecrets(config).then((secrets) => {
      prefetchedSecrets = secrets;
      return secrets;
    });
  }

  return async (req: Request, res: Response): Promise<void> => {
    let secrets: Secrets;

    // Use prefetched secrets if available
    if (prefetchedSecrets) {
      secrets = prefetchedSecrets;
    } else if (prefetchPromise) {
      secrets = await prefetchPromise;
    } else {
      secrets = await getSecrets(config);
    }

    // Filter to requested keys if specified
    if (options.keys && options.keys.length > 0) {
      const filtered: Secrets = {};
      for (const key of options.keys) {
        if (key in secrets) {
          filtered[key] = secrets[key];
        }
      }
      secrets = filtered;
    }

    await handler(secrets, req, res);
  };
}

/**
 * Wrap a Firebase callable function to inject secrets
 *
 * @example
 * ```typescript
 * export const processData = onCall(
 *   withSecretsCallable({ keys: ['API_KEY'] },
 *   async (secrets, data, context) => {
 *     return { processed: true };
 *   })
 * );
 * ```
 */
export function withSecretsCallable<T = unknown, R = unknown>(
  options: WithSecretsOptions,
  handler: FirebaseCallableHandler<T, R>
): (data: T, context: unknown) => Promise<R> {
  const config: SecretsConfig = {
    ...options,
    source: 'doppler',
  };

  // Start prefetch if enabled
  if (options.prefetch !== false && !prefetchPromise) {
    prefetchPromise = getSecrets(config).then((secrets) => {
      prefetchedSecrets = secrets;
      return secrets;
    });
  }

  return async (data: T, context: unknown): Promise<R> => {
    let secrets: Secrets;

    if (prefetchedSecrets) {
      secrets = prefetchedSecrets;
    } else if (prefetchPromise) {
      secrets = await prefetchPromise;
    } else {
      secrets = await getSecrets(config);
    }

    // Filter to requested keys
    if (options.keys && options.keys.length > 0) {
      const filtered: Secrets = {};
      for (const key of options.keys) {
        if (key in secrets) {
          filtered[key] = secrets[key];
        }
      }
      secrets = filtered;
    }

    return handler(secrets, data, context);
  };
}

/**
 * Prefetch secrets at module load time
 * Call this at the top of your functions file for optimal cold start performance
 *
 * @example
 * ```typescript
 * import { prefetchSecrets } from '@auge2u/dcs-runtime/firebase';
 *
 * // Start fetching immediately on module load
 * prefetchSecrets({ keys: ['API_KEY', 'DATABASE_URL'] });
 *
 * // Later, secrets will be ready
 * export const api = onRequest(withSecrets(...));
 * ```
 */
export function prefetchSecrets(options: WithSecretsOptions = {}): void {
  if (prefetchPromise) return;

  const config: SecretsConfig = {
    ...options,
    source: 'doppler',
  };

  prefetchPromise = getSecrets(config).then((secrets) => {
    prefetchedSecrets = secrets;
    return secrets;
  });
}

/**
 * Get prefetched secrets (throws if not yet loaded)
 */
export function getPrefetchedSecrets(): Secrets {
  if (!prefetchedSecrets) {
    throw new Error('Secrets not yet prefetched. Call prefetchSecrets() first or use withSecrets().');
  }
  return prefetchedSecrets;
}

/**
 * Wait for prefetched secrets to be ready
 */
export async function waitForSecrets(): Promise<Secrets> {
  if (prefetchedSecrets) {
    return prefetchedSecrets;
  }
  if (prefetchPromise) {
    return prefetchPromise;
  }
  throw new Error('No prefetch in progress. Call prefetchSecrets() first.');
}
