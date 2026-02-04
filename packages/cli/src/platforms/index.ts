export { DopplerClient, type DopplerConfig, type DopplerSecret } from './doppler.js';
export { FirebaseClient, type FirebaseConfig } from './firebase.js';
export { CloudflareClient, type CloudflareConfig } from './cloudflare.js';

import type { DcsConfig } from '../config/index.js';
import { DopplerClient } from './doppler.js';
import { FirebaseClient } from './firebase.js';
import { CloudflareClient } from './cloudflare.js';

export type Platform = 'firebase' | 'cloudflare' | 'neon' | 'gcp';

export interface SyncResult {
  platform: Platform;
  success: boolean;
  added: number;
  updated: number;
  removed: number;
  error?: string;
}

export function createDopplerClient(config: DcsConfig, environment: string): DopplerClient {
  const dopplerConfig = config.doppler.configs[environment];
  if (!dopplerConfig) {
    throw new Error(`Unknown environment: ${environment}`);
  }
  return new DopplerClient({
    project: config.doppler.project,
    config: dopplerConfig,
  });
}

export function createPlatformClients(config: DcsConfig): {
  firebase?: FirebaseClient;
  cloudflare?: CloudflareClient;
} {
  const clients: { firebase?: FirebaseClient; cloudflare?: CloudflareClient } = {};

  if (config.platforms.firebase) {
    clients.firebase = new FirebaseClient({
      projectId: config.platforms.firebase.project_id,
    });
  }

  if (config.platforms.cloudflare) {
    clients.cloudflare = new CloudflareClient({
      accountId: config.platforms.cloudflare.account_id,
      worker: config.platforms.cloudflare.worker,
    });
  }

  return clients;
}
