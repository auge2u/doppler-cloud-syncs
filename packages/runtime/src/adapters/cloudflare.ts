/**
 * Cloudflare Workers adapter for dcs-runtime
 *
 * @example
 * ```typescript
 * import { withSecrets } from '@auge2u/dcs-runtime/cloudflare';
 *
 * export default withSecrets({
 *   keys: ['API_KEY', 'DATABASE_URL'],
 * }, {
 *   async fetch(request, env, secrets, ctx) {
 *     const apiKey = secrets.API_KEY;
 *     return new Response('Hello!');
 *   }
 * });
 * ```
 */

import { getSecrets, type Secrets, type SecretsConfig } from '../index.js';

/**
 * Cloudflare Worker environment bindings
 */
export interface CloudflareEnv {
  DOPPLER_TOKEN?: string;
  DOPPLER_PROJECT?: string;
  DOPPLER_CONFIG?: string;
  [key: string]: unknown;
}

/**
 * Cloudflare Worker execution context
 */
export interface CloudflareContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

/**
 * Cloudflare Worker fetch handler with secrets
 */
export interface CloudflareHandlerWithSecrets {
  fetch(
    request: Request,
    env: CloudflareEnv,
    secrets: Secrets,
    ctx: CloudflareContext
  ): Response | Promise<Response>;

  scheduled?(
    event: ScheduledEvent,
    env: CloudflareEnv,
    secrets: Secrets,
    ctx: CloudflareContext
  ): void | Promise<void>;
}

/**
 * Scheduled event type
 */
interface ScheduledEvent {
  cron: string;
  scheduledTime: number;
}

/**
 * Standard Cloudflare Worker export
 */
export interface CloudflareWorker {
  fetch(
    request: Request,
    env: CloudflareEnv,
    ctx: CloudflareContext
  ): Response | Promise<Response>;

  scheduled?(
    event: ScheduledEvent,
    env: CloudflareEnv,
    ctx: CloudflareContext
  ): void | Promise<void>;
}

/**
 * Options for withSecrets wrapper
 */
export interface WithSecretsOptions extends Omit<SecretsConfig, 'source' | 'token' | 'project' | 'config'> {
  /**
   * Whether to use env bindings for Doppler credentials
   * If true, reads DOPPLER_TOKEN, DOPPLER_PROJECT, DOPPLER_CONFIG from env
   * @default true
   */
  useEnvBindings?: boolean;
}

// Module-level cache
let cachedSecrets: Secrets | null = null;
let cacheExpiry: number = 0;

/**
 * Wrap a Cloudflare Worker to inject secrets
 *
 * Secrets are fetched from Doppler on first request and cached.
 * The worker's env bindings should include DOPPLER_TOKEN, DOPPLER_PROJECT, and DOPPLER_CONFIG.
 *
 * @example
 * ```typescript
 * export default withSecrets({
 *   keys: ['API_KEY'],
 *   cache: { ttl: 300 },
 * }, {
 *   async fetch(request, env, secrets, ctx) {
 *     return new Response(`Key: ${secrets.API_KEY}`);
 *   }
 * });
 * ```
 */
export function withSecrets(
  options: WithSecretsOptions,
  handler: CloudflareHandlerWithSecrets
): CloudflareWorker {
  const ttl = options.cache?.ttl ?? 300;

  async function loadSecrets(env: CloudflareEnv): Promise<Secrets> {
    // Check cache
    if (cachedSecrets && Date.now() < cacheExpiry) {
      return cachedSecrets;
    }

    // Build config from env bindings
    const config: SecretsConfig = {
      ...options,
      source: 'doppler',
      token: env.DOPPLER_TOKEN as string,
      project: env.DOPPLER_PROJECT as string,
      config: env.DOPPLER_CONFIG as string,
    };

    const secrets = await getSecrets(config);

    // Update cache
    cachedSecrets = secrets;
    cacheExpiry = Date.now() + ttl * 1000;

    return secrets;
  }

  return {
    async fetch(request, env, ctx) {
      const secrets = await loadSecrets(env);
      return handler.fetch(request, env, secrets, ctx);
    },

    async scheduled(event, env, ctx) {
      if (!handler.scheduled) return;
      const secrets = await loadSecrets(env);
      return handler.scheduled(event, env, secrets, ctx);
    },
  };
}

/**
 * Create a fetch handler with secrets injection
 * Simpler API for workers that only need fetch
 *
 * @example
 * ```typescript
 * export default {
 *   fetch: createFetchHandler({
 *     keys: ['API_KEY'],
 *   }, async (request, env, secrets) => {
 *     return new Response(secrets.API_KEY);
 *   })
 * };
 * ```
 */
export function createFetchHandler(
  options: WithSecretsOptions,
  handler: (
    request: Request,
    env: CloudflareEnv,
    secrets: Secrets,
    ctx: CloudflareContext
  ) => Response | Promise<Response>
): (request: Request, env: CloudflareEnv, ctx: CloudflareContext) => Promise<Response> {
  const wrapped = withSecrets(options, { fetch: handler });
  return async (request, env, ctx) => wrapped.fetch(request, env, ctx);
}

/**
 * Manual secret loading for advanced use cases
 *
 * @example
 * ```typescript
 * export default {
 *   async fetch(request, env, ctx) {
 *     const secrets = await loadSecretsFromEnv(env, { keys: ['API_KEY'] });
 *     return new Response(secrets.API_KEY);
 *   }
 * };
 * ```
 */
export async function loadSecretsFromEnv(
  env: CloudflareEnv,
  options: WithSecretsOptions = {}
): Promise<Secrets> {
  const config: SecretsConfig = {
    ...options,
    source: 'doppler',
    token: env.DOPPLER_TOKEN as string,
    project: env.DOPPLER_PROJECT as string,
    config: env.DOPPLER_CONFIG as string,
  };

  return getSecrets(config);
}
