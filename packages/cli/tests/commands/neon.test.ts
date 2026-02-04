import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Command } from 'commander';

vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn(),
  },
}));

vi.mock('child_process', () => ({
  execFileSync: vi.fn(),
}));

vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readdirSync: vi.fn(),
  readFileSync: vi.fn(),
}));

vi.mock('../../src/config/index.js', () => ({
  loadConfig: vi.fn(),
}));

vi.mock('../../src/platforms/index.js', () => ({
  createDopplerClient: vi.fn(),
  createNeonClient: vi.fn(),
}));

import inquirer from 'inquirer';
import { execFileSync } from 'child_process';
import { existsSync, readdirSync } from 'fs';
import { loadConfig } from '../../src/config/index.js';
import { createDopplerClient, createNeonClient } from '../../src/platforms/index.js';
import { registerNeonCommand } from '../../src/commands/neon.js';

describe('neon command', () => {
  let program: Command;
  let mockNeon: {
    listBranches: ReturnType<typeof vi.fn>;
    createBranch: ReturnType<typeof vi.fn>;
    deleteBranch: ReturnType<typeof vi.fn>;
    resetBranch: ReturnType<typeof vi.fn>;
    findBranchByName: ReturnType<typeof vi.fn>;
    getMainBranch: ReturnType<typeof vi.fn>;
    getConnectionInfo: ReturnType<typeof vi.fn>;
    getProject: ReturnType<typeof vi.fn>;
  };
  let mockDoppler: { getSecrets: ReturnType<typeof vi.fn>; setSecrets: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();
    program = new Command();
    program.exitOverride();
    registerNeonCommand(program);

    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    process.env.NEON_API_KEY = 'test-api-key';

    mockNeon = {
      listBranches: vi.fn().mockResolvedValue([
        { id: 'br-main', name: 'main', project_id: 'proj-1' },
        { id: 'br-dev', name: 'dev', project_id: 'proj-1', parent_id: 'br-main' },
      ]),
      createBranch: vi.fn().mockResolvedValue({
        branch: { id: 'br-new', name: 'feature', project_id: 'proj-1' },
        endpoints: [{ id: 'ep-1', host: 'ep-xyz.neon.tech' }],
      }),
      deleteBranch: vi.fn().mockResolvedValue({}),
      resetBranch: vi.fn().mockResolvedValue({ name: 'dev' }),
      findBranchByName: vi.fn().mockImplementation((name) => {
        if (name === 'main') return Promise.resolve({ id: 'br-main', name: 'main' });
        if (name === 'dev') return Promise.resolve({ id: 'br-dev', name: 'dev', parent_id: 'br-main' });
        return Promise.resolve(null);
      }),
      getMainBranch: vi.fn().mockResolvedValue({ id: 'br-main', name: 'main' }),
      getConnectionInfo: vi.fn().mockResolvedValue({
        host: 'ep-xyz.neon.tech',
        database: 'neondb',
        role: 'neondb_owner',
        password: 'secret',
        connectionString: 'postgresql://...',
      }),
      getProject: vi.fn().mockResolvedValue({ id: 'proj-1', name: 'test-project' }),
    };

    mockDoppler = {
      getSecrets: vi.fn().mockResolvedValue({ DATABASE_URL: 'postgresql://...' }),
      setSecrets: vi.fn().mockResolvedValue(undefined),
    };

    vi.mocked(loadConfig).mockResolvedValue({
      project: 'test',
      doppler: { project: 'test', configs: { dev: 'dev' } },
      platforms: { neon: { project_id: 'proj-1' } },
    });

    vi.mocked(createNeonClient).mockReturnValue(mockNeon as any);
    vi.mocked(createDopplerClient).mockReturnValue(mockDoppler as any);
  });

  describe('branch list', () => {
    it('should list all branches', async () => {
      await program.parseAsync(['node', 'test', 'neon', 'branch', 'list']);

      expect(mockNeon.listBranches).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Branches'));
    });

    it('should require API key', async () => {
      delete process.env.NEON_API_KEY;

      await program.parseAsync(['node', 'test', 'neon', 'branch', 'list']);

      expect(console.error).toHaveBeenCalledWith(
        expect.anything(),
        'NEON_API_KEY required'
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });

  describe('branch create', () => {
    it('should create a new branch', async () => {
      await program.parseAsync(['node', 'test', 'neon', 'branch', 'create', 'feature-branch']);

      expect(mockNeon.createBranch).toHaveBeenCalledWith('feature-branch', expect.any(Object));
      expect(console.log).toHaveBeenCalledWith(expect.anything(), expect.stringContaining('Created branch'));
    });

    it('should create branch from specified parent', async () => {
      mockNeon.findBranchByName.mockResolvedValue({ id: 'br-dev', name: 'dev' });

      await program.parseAsync(['node', 'test', 'neon', 'branch', 'create', 'hotfix', '--parent', 'dev']);

      expect(mockNeon.createBranch).toHaveBeenCalledWith(
        'hotfix',
        expect.objectContaining({ parentId: 'br-dev' })
      );
    });

    it('should sync connection string to Doppler when --config specified', async () => {
      await program.parseAsync(['node', 'test', 'neon', 'branch', 'create', 'feature', '-c', 'dev']);

      expect(mockNeon.getConnectionInfo).toHaveBeenCalled();
      expect(mockDoppler.setSecrets).toHaveBeenCalledWith(
        expect.objectContaining({ DATABASE_URL: expect.any(String) })
      );
    });
  });

  describe('branch delete', () => {
    it('should delete a branch with confirmation', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({ confirm: true });

      await program.parseAsync(['node', 'test', 'neon', 'branch', 'delete', 'dev']);

      expect(inquirer.prompt).toHaveBeenCalled();
      expect(mockNeon.deleteBranch).toHaveBeenCalledWith('br-dev');
    });

    it('should skip confirmation with --yes flag', async () => {
      await program.parseAsync(['node', 'test', 'neon', 'branch', 'delete', 'dev', '--yes']);

      expect(inquirer.prompt).not.toHaveBeenCalled();
      expect(mockNeon.deleteBranch).toHaveBeenCalled();
    });

    it('should not delete when user cancels', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({ confirm: false });

      await program.parseAsync(['node', 'test', 'neon', 'branch', 'delete', 'dev']);

      expect(mockNeon.deleteBranch).not.toHaveBeenCalled();
    });

    it('should prevent deletion of main branch', async () => {
      mockNeon.findBranchByName.mockResolvedValue({ id: 'br-main', name: 'main', parent_id: null });

      await program.parseAsync(['node', 'test', 'neon', 'branch', 'delete', 'main', '--yes']);

      expect(console.error).toHaveBeenCalledWith(
        expect.anything(),
        'Cannot delete main branch'
      );
    });
  });

  describe('branch reset', () => {
    it('should reset a branch with confirmation', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({ confirm: true });

      await program.parseAsync(['node', 'test', 'neon', 'branch', 'reset', 'dev']);

      expect(mockNeon.resetBranch).toHaveBeenCalledWith('br-dev', expect.any(Object));
    });

    it('should skip confirmation with --yes flag', async () => {
      await program.parseAsync(['node', 'test', 'neon', 'branch', 'reset', 'dev', '--yes']);

      expect(inquirer.prompt).not.toHaveBeenCalled();
      expect(mockNeon.resetBranch).toHaveBeenCalled();
    });
  });

  describe('branch switch', () => {
    it('should update Doppler with new branch connection info', async () => {
      await program.parseAsync(['node', 'test', 'neon', 'branch', 'switch', 'dev', '-c', 'dev']);

      expect(mockNeon.getConnectionInfo).toHaveBeenCalledWith('br-dev', expect.any(Object));
      expect(mockDoppler.setSecrets).toHaveBeenCalledWith(
        expect.objectContaining({
          DATABASE_URL: expect.any(String),
          NEON_HOST: 'ep-xyz.neon.tech',
        })
      );
    });
  });

  describe('migrate', () => {
    it('should run SQL migrations', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readdirSync).mockReturnValue(['001_init.sql', '002_users.sql'] as any);
      vi.mocked(execFileSync).mockReturnValue('');

      await program.parseAsync(['node', 'test', 'neon', 'migrate', '-c', 'dev']);

      expect(execFileSync).toHaveBeenCalledWith(
        'psql',
        expect.arrayContaining(['-f']),
        expect.any(Object)
      );
    });

    it('should show migrations in dry-run mode', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readdirSync).mockReturnValue(['001_init.sql'] as any);

      await program.parseAsync(['node', 'test', 'neon', 'migrate', '--dry-run']);

      expect(execFileSync).not.toHaveBeenCalledWith('psql', expect.any(Array), expect.any(Object));
    });

    it('should error if migrations directory not found', async () => {
      vi.mocked(existsSync).mockReturnValue(false);

      await program.parseAsync(['node', 'test', 'neon', 'migrate']);

      expect(console.error).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('Migrations directory not found')
      );
    });
  });

  describe('status', () => {
    it('should show project status', async () => {
      await program.parseAsync(['node', 'test', 'neon', 'status']);

      expect(mockNeon.getProject).toHaveBeenCalledWith('proj-1');
      expect(mockNeon.listBranches).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Project'));
    });
  });
});
