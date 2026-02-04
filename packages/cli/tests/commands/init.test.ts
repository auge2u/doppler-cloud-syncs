import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Command } from 'commander';

vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn(),
  },
}));

vi.mock('fs', () => ({
  writeFileSync: vi.fn(),
  existsSync: vi.fn(),
}));

vi.mock('yaml', () => ({
  stringify: vi.fn((obj) => JSON.stringify(obj, null, 2)),
}));

import inquirer from 'inquirer';
import { writeFileSync, existsSync } from 'fs';
import { registerInitCommand } from '../../src/commands/init.js';

describe('init command', () => {
  let program: Command;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    program = new Command();
    program.exitOverride();
    registerInitCommand(program);
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  describe('creates config file', () => {
    it('should create dcs.yaml with default values when --yes flag is used', async () => {
      vi.mocked(existsSync).mockReturnValue(false);

      await program.parseAsync(['node', 'test', 'init', '--yes', '--name', 'my-app']);

      expect(writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('dcs.yaml'),
        expect.stringContaining('my-app')
      );
    });

    it('should create config with correct structure', async () => {
      vi.mocked(existsSync).mockReturnValue(false);

      await program.parseAsync(['node', 'test', 'init', '--yes', '--name', 'test-project']);

      const writeCall = vi.mocked(writeFileSync).mock.calls[0];
      const configContent = JSON.parse(writeCall[1] as string);

      expect(configContent.project).toBe('test-project');
      expect(configContent.doppler.project).toBe('test-project');
      expect(configContent.doppler.configs).toEqual({
        dev: 'dev',
        staging: 'stg',
        prod: 'prd',
      });
    });

    it('should prompt for overwrite if config exists', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(inquirer.prompt).mockResolvedValue({ overwrite: false });

      await program.parseAsync(['node', 'test', 'init']);

      expect(inquirer.prompt).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'confirm',
            name: 'overwrite',
          }),
        ])
      );
      expect(writeFileSync).not.toHaveBeenCalled();
    });

    it('should overwrite config when user confirms', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ overwrite: true })
        .mockResolvedValueOnce({
          projectName: 'new-project',
          dopplerProject: 'new-project',
          environments: ['dev', 'prod'],
          platforms: [],
        });

      await program.parseAsync(['node', 'test', 'init']);

      expect(writeFileSync).toHaveBeenCalled();
    });
  });

  describe('interactive prompts', () => {
    it('should prompt for all required fields', async () => {
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(inquirer.prompt).mockResolvedValue({
        projectName: 'interactive-project',
        dopplerProject: 'interactive-project',
        environments: ['dev', 'staging'],
        platforms: [],
      });

      await program.parseAsync(['node', 'test', 'init']);

      expect(inquirer.prompt).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ name: 'projectName' }),
          expect.objectContaining({ name: 'dopplerProject' }),
          expect.objectContaining({ name: 'environments' }),
          expect.objectContaining({ name: 'platforms' }),
        ])
      );
    });

    it('should prompt for Firebase project ID when Firebase is selected', async () => {
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(inquirer.prompt).mockResolvedValue({
        projectName: 'fb-project',
        dopplerProject: 'fb-project',
        environments: ['dev'],
        platforms: ['firebase'],
        firebaseProjectId: 'my-firebase-id',
      });

      await program.parseAsync(['node', 'test', 'init']);

      const writeCall = vi.mocked(writeFileSync).mock.calls[0];
      const configContent = JSON.parse(writeCall[1] as string);

      expect(configContent.platforms.firebase.project_id).toBe('my-firebase-id');
    });

    it('should prompt for Cloudflare account when Cloudflare is selected', async () => {
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(inquirer.prompt).mockResolvedValue({
        projectName: 'cf-project',
        dopplerProject: 'cf-project',
        environments: ['dev'],
        platforms: ['cloudflare'],
        cloudflareAccountId: 'cf-account-123',
        cloudflareWorker: 'my-worker',
      });

      await program.parseAsync(['node', 'test', 'init']);

      const writeCall = vi.mocked(writeFileSync).mock.calls[0];
      const configContent = JSON.parse(writeCall[1] as string);

      expect(configContent.platforms.cloudflare.account_id).toBe('cf-account-123');
      expect(configContent.platforms.cloudflare.worker).toBe('my-worker');
    });
  });

  describe('config mapping', () => {
    it('should map environment names to Doppler config names', async () => {
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(inquirer.prompt).mockResolvedValue({
        projectName: 'test',
        dopplerProject: 'test',
        environments: ['dev', 'staging', 'prod'],
        platforms: [],
      });

      await program.parseAsync(['node', 'test', 'init']);

      const writeCall = vi.mocked(writeFileSync).mock.calls[0];
      const configContent = JSON.parse(writeCall[1] as string);

      expect(configContent.doppler.configs.dev).toBe('dev');
      expect(configContent.doppler.configs.staging).toBe('stg');
      expect(configContent.doppler.configs.prod).toBe('prd');
    });
  });
});
