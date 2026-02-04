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

  describe('unsetConfig', () => {
    it('should unset Firebase config keys', async () => {
      vi.mocked(execFileSync).mockReturnValue('');

      const client = new FirebaseClient({ projectId: 'test-project' });
      await client.unsetConfig(['doppler.api_key', 'doppler.db_url']);

      expect(execFileSync).toHaveBeenCalledWith(
        'firebase',
        expect.arrayContaining(['functions:config:unset', 'doppler.api_key', 'doppler.db_url']),
        expect.any(Object)
      );
    });

    it('should not call CLI if no keys provided', async () => {
      const client = new FirebaseClient({ projectId: 'test-project' });
      await client.unsetConfig([]);

      expect(execFileSync).not.toHaveBeenCalled();
    });
  });

  describe('diff', () => {
    it('should identify keys to add, remove, and update', async () => {
      const currentConfig = {
        doppler: {
          existing: 'old-value',
          to_remove: 'remove-me',
          unchanged: 'same',
        },
      };
      vi.mocked(execFileSync).mockReturnValue(JSON.stringify(currentConfig));

      const client = new FirebaseClient({ projectId: 'test-project' });
      const result = await client.diff({
        EXISTING: 'new-value',
        UNCHANGED: 'same',
        NEW_KEY: 'added',
      });

      expect(result.toAdd).toContain('new_key');
      expect(result.toRemove).toContain('to_remove');
      expect(result.toUpdate).toContain('existing');
    });

    it('should return empty arrays when in sync', async () => {
      const currentConfig = {
        doppler: {
          api_key: 'secret',
        },
      };
      vi.mocked(execFileSync).mockReturnValue(JSON.stringify(currentConfig));

      const client = new FirebaseClient({ projectId: 'test-project' });
      const result = await client.diff({ API_KEY: 'secret' });

      expect(result.toAdd).toEqual([]);
      expect(result.toRemove).toEqual([]);
      expect(result.toUpdate).toEqual([]);
    });

    it('should handle empty current config', async () => {
      vi.mocked(execFileSync).mockReturnValue('{}');

      const client = new FirebaseClient({ projectId: 'test-project' });
      const result = await client.diff({ API_KEY: 'secret' });

      expect(result.toAdd).toContain('api_key');
      expect(result.toRemove).toEqual([]);
      expect(result.toUpdate).toEqual([]);
    });
  });

  describe('with token', () => {
    it('should include token in CLI arguments', async () => {
      vi.mocked(execFileSync).mockReturnValue('{}');

      const client = new FirebaseClient({ projectId: 'test-project', token: 'fb-token' });
      await client.getConfig();

      expect(execFileSync).toHaveBeenCalledWith(
        'firebase',
        expect.arrayContaining(['--token', 'fb-token']),
        expect.any(Object)
      );
    });
  });
});
