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
import { registerDiffCommand } from '../../src/commands/diff.js';

describe('diff command', () => {
  let program: Command;
  let mockDoppler: { getSecrets: ReturnType<typeof vi.fn> };
  let mockFirebase: { diff: ReturnType<typeof vi.fn> };
  let mockCloudflare: { diff: ReturnType<typeof vi.fn> };
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    program = new Command();
    program.exitOverride();
    registerDiffCommand(program);

    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    mockDoppler = {
      getSecrets: vi.fn().mockResolvedValue({
        API_KEY: 'secret',
        NEW_KEY: 'new-value',
      }),
    };

    mockFirebase = {
      diff: vi.fn().mockResolvedValue({
        toAdd: ['new_key'],
        toUpdate: ['api_key'],
        toRemove: ['old_key'],
      }),
    };

    mockCloudflare = {
      diff: vi.fn().mockResolvedValue({
        toAdd: ['NEW_KEY'],
        existing: ['API_KEY'],
        toRemove: ['OLD_KEY'],
      }),
    };

    vi.mocked(loadConfig).mockResolvedValue({
      project: 'test',
      doppler: { project: 'test', configs: { dev: 'dev' } },
      platforms: {},
    });

    vi.mocked(createDopplerClient).mockReturnValue(mockDoppler as any);
  });

  describe('shows correct changes', () => {
    it('should show Firebase diff with additions, updates, and removals', async () => {
      vi.mocked(createPlatformClients).mockReturnValue({ firebase: mockFirebase as any });

      await program.parseAsync(['node', 'test', 'diff', 'firebase']);

      expect(mockFirebase.diff).toHaveBeenCalledWith({
        API_KEY: 'secret',
        NEW_KEY: 'new-value',
      });
      // Check for logged additions/updates/removals
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('+ new_key'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('~ api_key'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('- old_key'));
    });

    it('should show Cloudflare diff with additions, existing, and removals', async () => {
      vi.mocked(createPlatformClients).mockReturnValue({ cloudflare: mockCloudflare as any });

      await program.parseAsync(['node', 'test', 'diff', 'cloudflare']);

      expect(mockCloudflare.diff).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('+ NEW_KEY'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('= API_KEY'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('- OLD_KEY'));
    });

    it('should show "in sync" when no differences', async () => {
      mockFirebase.diff.mockResolvedValue({
        toAdd: [],
        toUpdate: [],
        toRemove: [],
      });
      vi.mocked(createPlatformClients).mockReturnValue({ firebase: mockFirebase as any });

      await program.parseAsync(['node', 'test', 'diff', 'firebase']);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('In sync'));
    });

    it('should check all platforms when none specified', async () => {
      vi.mocked(createPlatformClients).mockReturnValue({
        firebase: mockFirebase as any,
        cloudflare: mockCloudflare as any,
      });

      await program.parseAsync(['node', 'test', 'diff']);

      expect(mockFirebase.diff).toHaveBeenCalled();
      expect(mockCloudflare.diff).toHaveBeenCalled();
    });
  });

  describe('platform not configured', () => {
    it('should show "not configured" for missing platforms', async () => {
      vi.mocked(createPlatformClients).mockReturnValue({});

      await program.parseAsync(['node', 'test', 'diff', 'firebase']);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Not configured'));
    });
  });

  describe('config environment', () => {
    it('should use specified environment', async () => {
      vi.mocked(createPlatformClients).mockReturnValue({ firebase: mockFirebase as any });

      await program.parseAsync(['node', 'test', 'diff', '-c', 'staging']);

      expect(createDopplerClient).toHaveBeenCalledWith(expect.anything(), 'staging');
    });
  });
});
