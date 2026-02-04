import type { Secrets, SecretsConfig } from './types.js';

const DOPPLER_API_URL = 'https://api.doppler.com/v3/configs/config/secrets/download';

/**
 * Fetch secrets from Doppler API
 */
export async function fetchFromDoppler(config: SecretsConfig): Promise<Secrets> {
  const token = config.token || process.env.DOPPLER_TOKEN;
  const project = config.project || process.env.DOPPLER_PROJECT;
  const configName = config.config || process.env.DOPPLER_CONFIG;

  if (!token) {
    throw new Error('Doppler token required. Set DOPPLER_TOKEN or pass token in config.');
  }

  if (!project || !configName) {
    throw new Error('Doppler project and config required. Set DOPPLER_PROJECT and DOPPLER_CONFIG or pass in config.');
  }

  const url = new URL(DOPPLER_API_URL);
  url.searchParams.set('project', project);
  url.searchParams.set('config', configName);
  url.searchParams.set('format', 'json');

  // Add keys filter if specified
  if (config.keys && config.keys.length > 0) {
    url.searchParams.set('keys', config.keys.join(','));
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Doppler API error (${response.status}): ${error}`);
  }

  const data = await response.json() as Secrets;
  return data;
}

/**
 * Get secrets from environment variables
 */
export function fetchFromEnv(config: SecretsConfig): Secrets {
  const secrets: Secrets = {};

  if (config.keys && config.keys.length > 0) {
    // Only get specified keys
    for (const key of config.keys) {
      const value = process.env[key];
      if (value !== undefined) {
        secrets[key] = value;
      }
    }
  } else {
    // Get all env vars (filtered to likely secrets - uppercase with underscores)
    for (const [key, value] of Object.entries(process.env)) {
      if (value !== undefined && /^[A-Z][A-Z0-9_]*$/.test(key)) {
        secrets[key] = value;
      }
    }
  }

  return secrets;
}
