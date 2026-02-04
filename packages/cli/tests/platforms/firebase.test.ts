import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FirebaseClient } from '../../src/platforms/firebase.js';

vi.mock('child_process', () => ({
  execFileSync: vi.fn(),
}));

import { execFileSync } from 'child_process';

describe('FirebaseClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getConfig', () => {
    it('should fetch current Firebase functions config', async () => {
      const mockConfig = { doppler: { api_key: 'xxx' } };
      vi.mocked(execFileSync).mockReturnValue(JSON.stringify(mockConfig));

      const client = new FirebaseClient({ projectId: 'test-project' });
      const config = await client.getConfig();

      expect(execFileSync).toHaveBeenCalledWith(
        'firebase',
        ['functions:config:get', '--project', 'test-project'],
        expect.any(Object)
      );
      expect(config).toEqual(mockConfig);
    });
  });

  describe('setConfig', () => {
    it('should set Firebase functions config', async () => {
      vi.mocked(execFileSync).mockReturnValue('');

      const client = new FirebaseClient({ projectId: 'test-project' });
      await client.setConfig({ api_key: 'new-key', db_url: 'postgres://...' });

      expect(execFileSync).toHaveBeenCalledWith(
        'firebase',
        expect.arrayContaining(['functions:config:set']),
        expect.any(Object)
      );
    });
  });

  describe('syncFromDoppler', () => {
    it('should sync secrets from Doppler format to Firebase format', async () => {
      vi.mocked(execFileSync).mockReturnValue('');

      const client = new FirebaseClient({ projectId: 'test-project' });
      await client.syncFromDoppler({
        API_KEY: 'secret',
        DATABASE_URL: 'postgres://...',
      });

      expect(execFileSync).toHaveBeenCalledWith(
        'firebase',
        expect.arrayContaining(['doppler.api_key=secret']),
        expect.any(Object)
      );
    });
  });
});
