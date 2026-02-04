/**
 * Secret values retrieved from Doppler
 */
export type Secrets = Record<string, string>;

/**
 * Configuration for secret retrieval
 */
export interface SecretsConfig {
  /**
   * Source of secrets: 'doppler' for API fetch, 'env' for process.env
   * @default 'doppler'
   */
  source?: 'doppler' | 'env';

  /**
   * Doppler service token. Required if source is 'doppler'.
   * Falls back to DOPPLER_TOKEN env var.
   */
  token?: string;

  /**
   * Doppler project name. Required if source is 'doppler'.
   * Falls back to DOPPLER_PROJECT env var.
   */
  project?: string;

  /**
   * Doppler config name. Required if source is 'doppler'.
   * Falls back to DOPPLER_CONFIG env var.
   */
  config?: string;

  /**
   * Cache configuration
   */
  cache?: {
    /**
     * Time-to-live in seconds. Set to 0 to disable caching.
     * @default 300 (5 minutes)
     */
    ttl?: number;
  };

  /**
   * Fallback source if primary fails
   * @default 'env'
   */
  fallback?: 'env' | 'none';

  /**
   * Specific keys to retrieve. If not specified, all secrets are returned.
   */
  keys?: string[];
}

/**
 * Cache entry with expiration
 */
export interface CacheEntry {
  secrets: Secrets;
  expiresAt: number;
  refreshing: boolean;
}

/**
 * Internal fetcher interface
 */
export interface SecretsFetcher {
  fetch(config: SecretsConfig): Promise<Secrets>;
}
