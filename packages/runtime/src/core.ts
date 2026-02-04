import type { Secrets, SecretsConfig } from './types.js';
import { secretsCache } from './cache.js';
import { fetchFromDoppler, fetchFromEnv } from './fetcher.js';

/**
 * Get secrets with caching and fallback support
 *
 * @example
 * ```typescript
 * // Basic usage - fetches from Doppler
 * const secrets = await getSecrets();
 *
 * // With configuration
 * const secrets = await getSecrets({
 *   source: 'doppler',
 *   cache: { ttl: 600 },
 *   fallback: 'env',
 * });
 *
 * // Get specific keys only
 * const secrets = await getSecrets({
 *   keys: ['API_KEY', 'DATABASE_URL'],
 * });
 *
 * // Local development - use env vars
 * const secrets = await getSecrets({ source: 'env' });
 * ```
 */
export async function getSecrets(config: SecretsConfig = {}): Promise<Secrets> {
  const source = config.source ?? 'doppler';
  const fallback = config.fallback ?? 'env';
  const ttl = config.cache?.ttl ?? 300;

  // If source is env, just return env vars
  if (source === 'env') {
    return fetchFromEnv(config);
  }

  // Get project/config for cache key
  const project = config.project || process.env.DOPPLER_PROJECT || 'default';
  const configName = config.config || process.env.DOPPLER_CONFIG || 'default';

  // Check cache first
  if (ttl > 0) {
    const cached = secretsCache.get(project, configName);
    if (cached) {
      // If we have specific keys, filter the cached result
      if (config.keys && config.keys.length > 0) {
        return filterKeys(cached, config.keys);
      }
      return cached;
    }
  }

  // Try to fetch from Doppler
  try {
    const secrets = await fetchFromDoppler(config);

    // Cache the result
    if (ttl > 0) {
      secretsCache.set(project, configName, secrets, ttl);
    }

    // Filter keys if specified
    if (config.keys && config.keys.length > 0) {
      return filterKeys(secrets, config.keys);
    }

    return secrets;
  } catch (error) {
    // Try stale cache first
    const stale = secretsCache.getStale(project, configName);
    if (stale) {
      console.warn('[dcs-runtime] Using stale cached secrets due to fetch error');
      if (config.keys && config.keys.length > 0) {
        return filterKeys(stale, config.keys);
      }
      return stale;
    }

    // Try fallback
    if (fallback === 'env') {
      console.warn('[dcs-runtime] Falling back to environment variables');
      return fetchFromEnv(config);
    }

    // No fallback available
    throw error;
  }
}

/**
 * Refresh secrets in background (non-blocking)
 * Useful for warming cache or proactive refresh
 */
export function refreshSecretsBackground(config: SecretsConfig = {}): void {
  const project = config.project || process.env.DOPPLER_PROJECT || 'default';
  const configName = config.config || process.env.DOPPLER_CONFIG || 'default';

  // Don't start multiple refreshes
  if (secretsCache.isRefreshing(project, configName)) {
    return;
  }

  secretsCache.setRefreshing(project, configName, true);

  fetchFromDoppler(config)
    .then((secrets) => {
      const ttl = config.cache?.ttl ?? 300;
      secretsCache.set(project, configName, secrets, ttl);
    })
    .catch((error) => {
      console.warn('[dcs-runtime] Background refresh failed:', error.message);
    })
    .finally(() => {
      secretsCache.setRefreshing(project, configName, false);
    });
}

/**
 * Clear the secrets cache
 */
export function clearSecretsCache(): void {
  secretsCache.clear();
}

/**
 * Filter secrets to only include specified keys
 */
function filterKeys(secrets: Secrets, keys: string[]): Secrets {
  const filtered: Secrets = {};
  for (const key of keys) {
    if (key in secrets) {
      filtered[key] = secrets[key];
    }
  }
  return filtered;
}
