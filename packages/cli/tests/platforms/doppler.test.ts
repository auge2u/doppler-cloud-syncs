import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DopplerClient } from '../../src/platforms/doppler.js';

vi.mock('child_process', () => ({
  execFileSync: vi.fn(),
}));

import { execFileSync } from 'child_process';

describe('DopplerClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getSecrets', () => {
    it('should fetch secrets from Doppler CLI', async () => {
      const mockSecrets = {
        API_KEY: 'secret-key',
        DATABASE_URL: 'postgres://...',
      };
      vi.mocked(execFileSync).mockReturnValue(JSON.stringify(mockSecrets));

      const client = new DopplerClient({ project: 'test', config: 'dev' });
      const secrets = await client.getSecrets();

      expect(execFileSync).toHaveBeenCalledWith(
        'doppler',
        ['secrets', 'download', '--no-file', '--format', 'json', '--project', 'test', '--config', 'dev'],
        expect.any(Object)
      );
      expect(secrets).toEqual(mockSecrets);
    });
  });

  describe('setSecret', () => {
    it('should set a secret via Doppler CLI', async () => {
      vi.mocked(execFileSync).mockReturnValue('');

      const client = new DopplerClient({ project: 'test', config: 'dev' });
      await client.setSecret('NEW_KEY', 'new-value');

      expect(execFileSync).toHaveBeenCalledWith(
        'doppler',
        ['secrets', 'set', 'NEW_KEY=new-value', '--project', 'test', '--config', 'dev'],
        expect.any(Object)
      );
    });
  });

  describe('listConfigs', () => {
    it('should list available configs', async () => {
      const mockConfigs = [
        { name: 'dev', environment: 'dev' },
        { name: 'prd', environment: 'prd' },
      ];
      vi.mocked(execFileSync).mockReturnValue(JSON.stringify(mockConfigs));

      const client = new DopplerClient({ project: 'test', config: 'dev' });
      const configs = await client.listConfigs();

      expect(configs).toEqual(mockConfigs);
    });
  });

  describe('setSecrets', () => {
    it('should set multiple secrets via Doppler CLI', async () => {
      vi.mocked(execFileSync).mockReturnValue('');

      const client = new DopplerClient({ project: 'test', config: 'dev' });
      await client.setSecrets({
        KEY_ONE: 'value1',
        KEY_TWO: 'value2',
      });

      expect(execFileSync).toHaveBeenCalledWith(
        'doppler',
        expect.arrayContaining(['secrets', 'set', 'KEY_ONE=value1', 'KEY_TWO=value2']),
        expect.any(Object)
      );
    });
  });

  describe('diff', () => {
    it('should identify added, removed, and changed secrets', async () => {
      const currentSecrets = {
        EXISTING: 'old-value',
        TO_REMOVE: 'remove-me',
        UNCHANGED: 'same',
      };
      vi.mocked(execFileSync).mockReturnValue(JSON.stringify(currentSecrets));

      const client = new DopplerClient({ project: 'test', config: 'dev' });
      const result = await client.diff({
        EXISTING: 'new-value',
        UNCHANGED: 'same',
        NEW_KEY: 'added',
      });

      expect(result.added).toEqual(['NEW_KEY']);
      expect(result.removed).toEqual(['TO_REMOVE']);
      expect(result.changed).toEqual(['EXISTING']);
    });

    it('should return empty arrays when secrets match', async () => {
      const currentSecrets = { KEY: 'value' };
      vi.mocked(execFileSync).mockReturnValue(JSON.stringify(currentSecrets));

      const client = new DopplerClient({ project: 'test', config: 'dev' });
      const result = await client.diff({ KEY: 'value' });

      expect(result.added).toEqual([]);
      expect(result.removed).toEqual([]);
      expect(result.changed).toEqual([]);
    });
  });

  describe('with token', () => {
    it('should include token in CLI arguments', async () => {
      vi.mocked(execFileSync).mockReturnValue('{}');

      const client = new DopplerClient({ project: 'test', config: 'dev', token: 'dp.token.xxx' });
      await client.getSecrets();

      expect(execFileSync).toHaveBeenCalledWith(
        'doppler',
        expect.arrayContaining(['--token', 'dp.token.xxx']),
        expect.any(Object)
      );
    });
  });
});
