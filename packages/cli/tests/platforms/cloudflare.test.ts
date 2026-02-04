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

    it('should return empty array on error', async () => {
      vi.mocked(execFileSync).mockImplementation(() => {
        throw new Error('wrangler not found');
      });

      const client = new CloudflareClient({ accountId: 'acc123', worker: 'my-worker' });
      const secrets = await client.listSecrets();

      expect(secrets).toEqual([]);
    });
  });

  describe('deleteSecret', () => {
    it('should delete a secret using wrangler', async () => {
      vi.mocked(execFileSync).mockReturnValue('');

      const client = new CloudflareClient({ accountId: 'acc123', worker: 'my-worker' });
      await client.deleteSecret('API_KEY');

      expect(execFileSync).toHaveBeenCalledWith(
        'wrangler',
        expect.arrayContaining(['secret', 'delete', 'API_KEY', '--force', '--name', 'my-worker']),
        expect.any(Object)
      );
    });
  });

  describe('diff', () => {
    it('should identify keys to add, remove, and existing', async () => {
      const currentSecrets = [
        { name: 'EXISTING', type: 'secret_text' },
        { name: 'TO_REMOVE', type: 'secret_text' },
      ];
      vi.mocked(execFileSync).mockReturnValue(JSON.stringify(currentSecrets));

      const client = new CloudflareClient({ accountId: 'acc123', worker: 'my-worker' });
      const result = await client.diff({
        EXISTING: 'value',
        NEW_KEY: 'new-value',
      });

      expect(result.toAdd).toEqual(['NEW_KEY']);
      expect(result.toRemove).toEqual(['TO_REMOVE']);
      expect(result.existing).toEqual(['EXISTING']);
    });

    it('should return empty arrays when in sync', async () => {
      const currentSecrets = [{ name: 'API_KEY', type: 'secret_text' }];
      vi.mocked(execFileSync).mockReturnValue(JSON.stringify(currentSecrets));

      const client = new CloudflareClient({ accountId: 'acc123', worker: 'my-worker' });
      const result = await client.diff({ API_KEY: 'value' });

      expect(result.toAdd).toEqual([]);
      expect(result.toRemove).toEqual([]);
      expect(result.existing).toEqual(['API_KEY']);
    });
  });

  describe('without worker name', () => {
    it('should work without specifying worker name', async () => {
      vi.mocked(execFileSync).mockReturnValue('[]');

      const client = new CloudflareClient({ accountId: 'acc123' });
      await client.listSecrets();

      const call = vi.mocked(execFileSync).mock.calls[0];
      expect(call[1]).not.toContain('--name');
    });
  });
});
