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
});
