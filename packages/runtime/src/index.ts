/**
 * @auge2u/dcs-runtime
 *
 * Runtime secret injection for serverless platforms.
 * Fetches secrets from Doppler at cold start with caching and fallback support.
 *
 * @example
 * ```typescript
 * import { getSecrets } from '@auge2u/dcs-runtime';
 *
 * const secrets = await getSecrets({
 *   cache: { ttl: 300 },
 *   fallback: 'env',
 * });
 *
 * console.log(secrets.API_KEY);
 * ```
 *
 * For platform-specific adapters:
 * - Firebase: `import { withSecrets } from '@auge2u/dcs-runtime/firebase'`
 * - Cloudflare: `import { withSecrets } from '@auge2u/dcs-runtime/cloudflare'`
 * - Cloud Run: `import { withSecrets } from '@auge2u/dcs-runtime/cloudrun'`
 */

export { getSecrets, refreshSecretsBackground, clearSecretsCache } from './core.js';
export type { Secrets, SecretsConfig } from './types.js';
