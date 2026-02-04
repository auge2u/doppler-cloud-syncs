import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CloudflareClient } from '../../src/platforms/cloudflare.js';

vi.mock('child_process', () => ({
  execFileSync: vi.fn(),
}));

vi.mock('fs', () => ({
  writeFileSync: vi.fn(),
  unlinkSync: vi.fn(),
}));

import { execFileSync } from 'child_process';

describe('CloudflareClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('syncFromDoppler', () => {
    it('should sync secrets using wrangler secret bulk', async () => {
      vi.mocked(execFileSync).mockReturnValue('');

      const client = new CloudflareClient({ accountId: 'acc123', worker: 'my-worker' });
      await client.syncFromDoppler({
        API_KEY: 'secret',
        DATABASE_URL: 'postgres://...',
      });

      expect(execFileSync).toHaveBeenCalledWith(
        'wrangler',
        expect.arrayContaining(['secret', 'bulk']),
        expect.any(Object)
      );
    });
  });

  describe('listSecrets', () => {
    it('should list worker secrets', async () => {
      const mockSecrets = [{ name: 'API_KEY', type: 'secret_text' }];
      vi.mocked(execFileSync).mockReturnValue(JSON.stringify(mockSecrets));

      const client = new CloudflareClient({ accountId: 'acc123', worker: 'my-worker' });
      const secrets = await client.listSecrets();

      expect(secrets).toEqual(['API_KEY']);
    });
  });
});
