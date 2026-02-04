import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Command } from 'commander';

vi.mock('../../src/config/index.js', () => ({
  loadConfig: vi.fn(),
  findConfigFile: vi.fn(),
}));

vi.mock('../../src/platforms/index.js', () => ({
  createDopplerClient: vi.fn(),
  createPlatformClients: vi.fn(),
}));

import { loadConfig, findConfigFile } from '../../src/config/index.js';
import { createDopplerClient, createPlatformClients } from '../../src/platforms/index.js';
import { registerStatusCommand } from '../../src/commands/status.js';

describe('status command', () => {
  let program: Command;
  let mockDoppler: { getSecrets: ReturnType<typeof vi.fn> };
  let mockFirebase: { getConfig: ReturnType<typeof vi.fn> };
  let mockCloudflare: { listSecrets: ReturnType<typeof vi.fn> };
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    program = new Command();
    program.exitOverride();
    registerStatusCommand(program);

    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    mockDoppler = {
      getSecrets: vi.fn().mockResolvedValue({ API_KEY: 'secret' }),
    };

    mockFirebase = {
      getConfig: vi.fn().mockResolvedValue({ doppler: { api_key: 'xxx' } }),
    };

    mockCloudflare = {
      listSecrets: vi.fn().mockResolvedValue(['API_KEY', 'DB_URL']),
    };

    vi.mocked(loadConfig).mockResolvedValue({
      project: 'test-project',
      doppler: { project: 'test', configs: { dev: 'dev' } },
      platforms: {},
    });

    vi.mocked(createDopplerClient).mockReturnValue(mockDoppler as any);
  });

  describe('displays platform states', () => {
    it('should show no config message when dcs.yaml not found', async () => {
      vi.mocked(findConfigFile).mockReturnValue(null);

      await program.parseAsync(['node', 'test', 'status']);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('No dcs.yaml found')
      );
    });

    it('should display project info when config exists', async () => {
      vi.mocked(findConfigFile).mockReturnValue('/path/to/dcs.yaml');
      vi.mocked(createPlatformClients).mockReturnValue({});

      await program.parseAsync(['node', 'test', 'status']);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.anything(),
        'test-project'
      );
    });

    it('should show Doppler connection status', async () => {
      vi.mocked(findConfigFile).mockReturnValue('/path/to/dcs.yaml');
      vi.mocked(createPlatformClients).mockReturnValue({});

      await program.parseAsync(['node', 'test', 'status']);

      expect(mockDoppler.getSecrets).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('Connected')
      );
    });

    it('should show Doppler error when connection fails', async () => {
      vi.mocked(findConfigFile).mockReturnValue('/path/to/dcs.yaml');
      vi.mocked(createPlatformClients).mockReturnValue({});
      mockDoppler.getSecrets.mockRejectedValue(new Error('Auth failed'));

      await program.parseAsync(['node', 'test', 'status']);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('Not connected')
      );
    });

    it('should show Firebase status when configured', async () => {
      vi.mocked(findConfigFile).mockReturnValue('/path/to/dcs.yaml');
      vi.mocked(createPlatformClients).mockReturnValue({ firebase: mockFirebase as any });

      await program.parseAsync(['node', 'test', 'status']);

      expect(mockFirebase.getConfig).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('Connected')
      );
    });

    it('should show Cloudflare status when configured', async () => {
      vi.mocked(findConfigFile).mockReturnValue('/path/to/dcs.yaml');
      vi.mocked(createPlatformClients).mockReturnValue({ cloudflare: mockCloudflare as any });

      await program.parseAsync(['node', 'test', 'status']);

      expect(mockCloudflare.listSecrets).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('Connected')
      );
    });

    it('should show platform error when platform fails', async () => {
      vi.mocked(findConfigFile).mockReturnValue('/path/to/dcs.yaml');
      mockFirebase.getConfig.mockRejectedValue(new Error('Firebase error'));
      vi.mocked(createPlatformClients).mockReturnValue({ firebase: mockFirebase as any });

      await program.parseAsync(['node', 'test', 'status']);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('Error')
      );
    });
  });

  describe('config environment option', () => {
    it('should use specified environment', async () => {
      vi.mocked(findConfigFile).mockReturnValue('/path/to/dcs.yaml');
      vi.mocked(createPlatformClients).mockReturnValue({});

      await program.parseAsync(['node', 'test', 'status', '-c', 'prod']);

      expect(createDopplerClient).toHaveBeenCalledWith(expect.anything(), 'prod');
    });
  });
});
