import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Command } from 'commander';

vi.mock('child_process', () => ({
  execFileSync: vi.fn(),
}));

vi.mock('fs', () => ({
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
  unlinkSync: vi.fn(),
  readFileSync: vi.fn(),
  chmodSync: vi.fn(),
}));

import { execFileSync } from 'child_process';
import { existsSync, writeFileSync, readFileSync, unlinkSync, chmodSync } from 'fs';
import { registerHooksCommand } from '../../src/commands/hooks.js';

describe('hooks command', () => {
  let program: Command;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    program = new Command();
    program.exitOverride();
    registerHooksCommand(program);

    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    // Mock git root detection
    vi.mocked(execFileSync).mockReturnValue('/home/user/project\n');
  });

  describe('hooks install', () => {
    it('should install git hooks', async () => {
      vi.mocked(existsSync).mockReturnValue(false);

      await program.parseAsync(['node', 'test', 'hooks', 'install']);

      expect(writeFileSync).toHaveBeenCalledTimes(2); // post-checkout and post-merge
      expect(chmodSync).toHaveBeenCalledWith(expect.any(String), 0o755);
    });

    it('should install specific hook when --hook specified', async () => {
      vi.mocked(existsSync).mockReturnValue(false);

      await program.parseAsync(['node', 'test', 'hooks', 'install', '--hook', 'post-checkout']);

      expect(writeFileSync).toHaveBeenCalledTimes(1);
      expect(writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('post-checkout'),
        expect.stringContaining('dcs-managed-hook')
      );
    });

    it('should update existing dcs hooks', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue('#!/bin/sh\n# dcs-managed-hook\nold content');

      await program.parseAsync(['node', 'test', 'hooks', 'install']);

      expect(writeFileSync).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Updated'));
    });

    it('should not overwrite non-dcs hooks without --force', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue('#!/bin/sh\ncustom hook content');

      await program.parseAsync(['node', 'test', 'hooks', 'install']);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Use --force'));
    });

    it('should backup and overwrite with --force', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue('#!/bin/sh\ncustom hook');

      await program.parseAsync(['node', 'test', 'hooks', 'install', '--force']);

      // Should backup then overwrite
      expect(writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('.backup'),
        '#!/bin/sh\ncustom hook'
      );
      expect(writeFileSync).toHaveBeenCalledWith(
        expect.not.stringContaining('.backup'),
        expect.stringContaining('dcs-managed-hook')
      );
    });

    it('should error when not in git repository', async () => {
      vi.mocked(execFileSync).mockImplementation(() => {
        throw new Error('not a git repo');
      });
      // Make process.exit throw to stop execution
      vi.spyOn(process, 'exit').mockImplementation((code) => {
        throw new Error(`process.exit(${code})`);
      });

      await expect(program.parseAsync(['node', 'test', 'hooks', 'install'])).rejects.toThrow('process.exit(1)');

      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('hooks uninstall', () => {
    it('should remove dcs-managed hooks', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue('#!/bin/sh\n# dcs-managed-hook\ncontent');

      await program.parseAsync(['node', 'test', 'hooks', 'uninstall']);

      expect(unlinkSync).toHaveBeenCalled();
    });

    it('should restore backup when removing hook', async () => {
      vi.mocked(existsSync).mockImplementation((path) => {
        if (typeof path === 'string' && path.includes('.backup')) return true;
        return true;
      });
      vi.mocked(readFileSync).mockImplementation((path) => {
        if (typeof path === 'string' && path.includes('.backup')) return '#!/bin/sh\noriginal';
        return '#!/bin/sh\n# dcs-managed-hook\ncontent';
      });

      await program.parseAsync(['node', 'test', 'hooks', 'uninstall']);

      expect(writeFileSync).toHaveBeenCalledWith(
        expect.not.stringContaining('.backup'),
        '#!/bin/sh\noriginal'
      );
    });

    it('should skip non-dcs hooks', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue('#!/bin/sh\ncustom hook');

      await program.parseAsync(['node', 'test', 'hooks', 'uninstall']);

      expect(unlinkSync).not.toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('not managed by dcs'));
    });

    it('should handle non-existent hooks gracefully', async () => {
      vi.mocked(existsSync).mockReturnValue(false);

      await program.parseAsync(['node', 'test', 'hooks', 'uninstall']);

      expect(unlinkSync).not.toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('not installed'));
    });
  });

  describe('hooks status', () => {
    it('should show installed dcs hooks', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue('#!/bin/sh\n# dcs-managed-hook\ncontent');

      await program.parseAsync(['node', 'test', 'hooks', 'status']);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('installed (dcs)'));
    });

    it('should show non-dcs hooks', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue('#!/bin/sh\ncustom');

      await program.parseAsync(['node', 'test', 'hooks', 'status']);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('exists (not dcs)'));
    });

    it('should show not installed hooks', async () => {
      vi.mocked(existsSync).mockReturnValue(false);

      await program.parseAsync(['node', 'test', 'hooks', 'status']);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('not installed'));
    });
  });
});
