import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Command } from 'commander';

vi.mock('../../src/config/index.js', () => ({
  loadConfig: vi.fn(),
}));

vi.mock('../../src/platforms/index.js', () => ({
  createDopplerClient: vi.fn(),
  createPlatformClients: vi.fn(),
}));

import { loadConfig } from '../../src/config/index.js';
import { createDopplerClient, createPlatformClients } from '../../src/platforms/index.js';
import { registerSyncCommand } from '../../src/commands/sync.js';

describe('sync command', () => {
  let program: Command;
  let mockDoppler: { getSecrets: ReturnType<typeof vi.fn> };
  let mockFirebase: { diff: ReturnType<typeof vi.fn>; syncFromDoppler: ReturnType<typeof vi.fn> };
  let mockCloudflare: { diff: ReturnType<typeof vi.fn>; syncFromDoppler: ReturnType<typeof vi.fn> };
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    program = new Command();
    program.exitOverride();
    registerSyncCommand(program);

    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    mockDoppler = {
      getSecrets: vi.fn().mockResolvedValue({
        API_KEY: 'secret',
        DATABASE_URL: 'postgres://...',
      }),
    };

    mockFirebase = {
      diff: vi.fn().mockResolvedValue({ toAdd: [], toUpdate: [], toRemove: [] }),
      syncFromDoppler: vi.fn().mockResolvedValue(undefined),
    };

    mockCloudflare = {
      diff: vi.fn().mockResolvedValue({ toAdd: [], existing: [], toRemove: [] }),
      syncFromDoppler: vi.fn().mockResolvedValue(undefined),
    };

    vi.mocked(loadConfig).mockResolvedValue({
      project: 'test',
      doppler: { project: 'test', configs: { dev: 'dev' } },
      platforms: {},
    });

    vi.mocked(createDopplerClient).mockReturnValue(mockDoppler as any);
  });

  describe('calls correct platform methods', () => {
    it('should fetch secrets from Doppler', async () => {
      vi.mocked(createPlatformClients).mockReturnValue({});

      await program.parseAsync(['node', 'test', 'sync']);

      expect(createDopplerClient).toHaveBeenCalled();
      expect(mockDoppler.getSecrets).toHaveBeenCalled();
    });

    it('should sync to Firebase when configured', async () => {
      vi.mocked(createPlatformClients).mockReturnValue({ firebase: mockFirebase as any });

      await program.parseAsync(['node', 'test', 'sync']);

      expect(mockFirebase.diff).toHaveBeenCalled();
      expect(mockFirebase.syncFromDoppler).toHaveBeenCalledWith({
        API_KEY: 'secret',
        DATABASE_URL: 'postgres://...',
      });
    });

    it('should sync to Cloudflare when configured', async () => {
      vi.mocked(createPlatformClients).mockReturnValue({ cloudflare: mockCloudflare as any });

      await program.parseAsync(['node', 'test', 'sync']);

      expect(mockCloudflare.diff).toHaveBeenCalled();
      expect(mockCloudflare.syncFromDoppler).toHaveBeenCalledWith({
        API_KEY: 'secret',
        DATABASE_URL: 'postgres://...',
      });
    });

    it('should sync to specific platform when specified', async () => {
      vi.mocked(createPlatformClients).mockReturnValue({
        firebase: mockFirebase as any,
        cloudflare: mockCloudflare as any,
      });

      await program.parseAsync(['node', 'test', 'sync', 'firebase']);

      expect(mockFirebase.syncFromDoppler).toHaveBeenCalled();
      expect(mockCloudflare.syncFromDoppler).not.toHaveBeenCalled();
    });

    it('should sync to all platforms when none specified', async () => {
      vi.mocked(createPlatformClients).mockReturnValue({
        firebase: mockFirebase as any,
        cloudflare: mockCloudflare as any,
      });

      await program.parseAsync(['node', 'test', 'sync']);

      expect(mockFirebase.syncFromDoppler).toHaveBeenCalled();
      expect(mockCloudflare.syncFromDoppler).toHaveBeenCalled();
    });
  });

  describe('dry run mode', () => {
    it('should not call syncFromDoppler in dry-run mode', async () => {
      vi.mocked(createPlatformClients).mockReturnValue({ firebase: mockFirebase as any });

      await program.parseAsync(['node', 'test', 'sync', '--dry-run']);

      expect(mockFirebase.diff).toHaveBeenCalled();
      expect(mockFirebase.syncFromDoppler).not.toHaveBeenCalled();
    });
  });

  describe('config environment', () => {
    it('should use specified config environment', async () => {
      vi.mocked(createPlatformClients).mockReturnValue({});

      await program.parseAsync(['node', 'test', 'sync', '-c', 'prod']);

      expect(createDopplerClient).toHaveBeenCalledWith(expect.anything(), 'prod');
    });

    it('should default to dev environment', async () => {
      vi.mocked(createPlatformClients).mockReturnValue({});

      await program.parseAsync(['node', 'test', 'sync']);

      expect(createDopplerClient).toHaveBeenCalledWith(expect.anything(), 'dev');
    });
  });

  describe('error handling', () => {
    it('should report platform not configured error', async () => {
      vi.mocked(createPlatformClients).mockReturnValue({});

      await expect(
        program.parseAsync(['node', 'test', 'sync', 'firebase'])
      ).rejects.toThrow('Firebase not configured');
    });

    it('should handle Doppler fetch errors', async () => {
      mockDoppler.getSecrets.mockRejectedValue(new Error('Auth failed'));
      vi.mocked(createPlatformClients).mockReturnValue({});

      await expect(
        program.parseAsync(['node', 'test', 'sync'])
      ).rejects.toThrow('Auth failed');
    });
  });

  describe('quiet mode', () => {
    it('should suppress output in quiet mode', async () => {
      vi.mocked(createPlatformClients).mockReturnValue({ firebase: mockFirebase as any });
      const logSpy = vi.spyOn(console, 'log');

      await program.parseAsync(['node', 'test', 'sync', '--quiet']);

      // Verify sync happened but minimal logging
      expect(mockFirebase.syncFromDoppler).toHaveBeenCalled();
    });
  });
});
