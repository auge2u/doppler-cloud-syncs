import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Command } from 'commander';

vi.mock('child_process', () => ({
  spawn: vi.fn(),
}));

vi.mock('../../src/config/index.js', () => ({
  loadConfig: vi.fn(),
}));

vi.mock('../../src/platforms/index.js', () => ({
  createDopplerClient: vi.fn(),
}));

import { spawn } from 'child_process';
import { loadConfig } from '../../src/config/index.js';
import { createDopplerClient } from '../../src/platforms/index.js';
import { registerRunCommand } from '../../src/commands/run.js';

describe('run command', () => {
  let program: Command;
  let mockDoppler: { getSecrets: ReturnType<typeof vi.fn> };
  let mockChildProcess: {
    on: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    program = new Command();
    program.exitOverride();
    registerRunCommand(program);

    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    mockDoppler = {
      getSecrets: vi.fn().mockResolvedValue({
        API_KEY: 'secret-key',
        DATABASE_URL: 'postgres://localhost/db',
      }),
    };

    mockChildProcess = {
      on: vi.fn(),
    };

    vi.mocked(spawn).mockReturnValue(mockChildProcess as any);

    vi.mocked(loadConfig).mockResolvedValue({
      project: 'test',
      doppler: { project: 'test', configs: { dev: 'dev' } },
      platforms: {},
    });

    vi.mocked(createDopplerClient).mockReturnValue(mockDoppler as any);
  });

  describe('spawns process with secrets', () => {
    it('should spawn the command with secrets in environment', async () => {
      await program.parseAsync(['node', 'test', 'run', 'node', 'app.js']);

      expect(spawn).toHaveBeenCalledWith(
        'node',
        ['app.js'],
        expect.objectContaining({
          env: expect.objectContaining({
            API_KEY: 'secret-key',
            DATABASE_URL: 'postgres://localhost/db',
          }),
        })
      );
    });

    it('should inherit stdio', async () => {
      await program.parseAsync(['node', 'test', 'run', 'npm', 'start']);

      expect(spawn).toHaveBeenCalledWith(
        'npm',
        ['start'],
        expect.objectContaining({
          stdio: 'inherit',
        })
      );
    });

    it('should pass multiple arguments to spawned command', async () => {
      await program.parseAsync(['node', 'test', 'run', 'npm', 'run', 'test', '--watch']);

      expect(spawn).toHaveBeenCalledWith(
        'npm',
        ['run', 'test', '--watch'],
        expect.any(Object)
      );
    });

    it('should merge secrets with existing process.env', async () => {
      process.env.EXISTING_VAR = 'existing-value';

      await program.parseAsync(['node', 'test', 'run', 'echo', 'hello']);

      const spawnCall = vi.mocked(spawn).mock.calls[0];
      const envArg = spawnCall[2]?.env;

      expect(envArg).toHaveProperty('EXISTING_VAR', 'existing-value');
      expect(envArg).toHaveProperty('API_KEY', 'secret-key');
    });

    it('should override process.env with Doppler secrets', async () => {
      process.env.API_KEY = 'old-key';

      await program.parseAsync(['node', 'test', 'run', 'echo', 'test']);

      const spawnCall = vi.mocked(spawn).mock.calls[0];
      const envArg = spawnCall[2]?.env;

      expect(envArg).toHaveProperty('API_KEY', 'secret-key');
    });
  });

  describe('config environment', () => {
    it('should use specified environment', async () => {
      await program.parseAsync(['node', 'test', 'run', '-c', 'prod', 'npm', 'start']);

      expect(createDopplerClient).toHaveBeenCalledWith(expect.anything(), 'prod');
    });

    it('should default to dev environment', async () => {
      await program.parseAsync(['node', 'test', 'run', 'npm', 'start']);

      expect(createDopplerClient).toHaveBeenCalledWith(expect.anything(), 'dev');
    });
  });

  describe('exit handling', () => {
    it('should register exit handler on child process', async () => {
      await program.parseAsync(['node', 'test', 'run', 'node', 'app.js']);

      expect(mockChildProcess.on).toHaveBeenCalledWith('exit', expect.any(Function));
    });

    it('should register error handler on child process', async () => {
      await program.parseAsync(['node', 'test', 'run', 'node', 'app.js']);

      expect(mockChildProcess.on).toHaveBeenCalledWith('error', expect.any(Function));
    });
  });

  describe('error handling', () => {
    it('should handle config load errors', async () => {
      vi.mocked(loadConfig).mockRejectedValue(new Error('Config not found'));

      await program.parseAsync(['node', 'test', 'run', 'npm', 'start']);

      expect(console.error).toHaveBeenCalled();
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should handle Doppler fetch errors', async () => {
      mockDoppler.getSecrets.mockRejectedValue(new Error('Auth failed'));

      await program.parseAsync(['node', 'test', 'run', 'npm', 'start']);

      expect(console.error).toHaveBeenCalled();
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });
});
