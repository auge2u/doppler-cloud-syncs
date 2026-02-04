/**
 * Git hooks management for automatic secret syncing
 *
 * Installs hooks that run `dcs sync` on:
 * - post-checkout: After switching branches
 * - post-merge: After pulling/merging
 */

import type { Command } from 'commander';
import { existsSync, mkdirSync, writeFileSync, unlinkSync, readFileSync, chmodSync } from 'fs';
import { join } from 'path';
import { execFileSync } from 'child_process';

const HOOK_MARKER = '# dcs-managed-hook';

const HOOKS = {
  'post-checkout': `#!/bin/sh
${HOOK_MARKER}
# Sync secrets after branch checkout
# Args: $1=prev HEAD, $2=new HEAD, $3=branch flag (1=branch, 0=file)

# Only run on branch checkouts, not file checkouts
if [ "$3" = "1" ]; then
  if command -v dcs >/dev/null 2>&1; then
    echo "[dcs] Syncing secrets for new branch..."
    dcs sync --quiet || echo "[dcs] Warning: Secret sync failed"
  fi
fi
`,

  'post-merge': `#!/bin/sh
${HOOK_MARKER}
# Sync secrets after merge/pull

if command -v dcs >/dev/null 2>&1; then
  echo "[dcs] Syncing secrets after merge..."
  dcs sync --quiet || echo "[dcs] Warning: Secret sync failed"
fi
`,
};

type HookName = keyof typeof HOOKS;

function getGitRoot(): string | null {
  try {
    return execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

function getHooksDir(): string | null {
  const gitRoot = getGitRoot();
  if (!gitRoot) return null;
  return join(gitRoot, '.git', 'hooks');
}

function isDcsHook(hookPath: string): boolean {
  if (!existsSync(hookPath)) return false;
  const content = readFileSync(hookPath, 'utf8');
  return content.includes(HOOK_MARKER);
}

function installHook(hooksDir: string, hookName: HookName, force: boolean): { success: boolean; message: string } {
  const hookPath = join(hooksDir, hookName);
  const hookContent = HOOKS[hookName];

  if (existsSync(hookPath)) {
    if (isDcsHook(hookPath)) {
      // Already our hook, update it
      writeFileSync(hookPath, hookContent);
      chmodSync(hookPath, 0o755);
      return { success: true, message: `Updated ${hookName}` };
    }

    if (!force) {
      return {
        success: false,
        message: `${hookName} already exists (not managed by dcs). Use --force to overwrite.`,
      };
    }

    // Backup existing hook
    const backupPath = `${hookPath}.backup`;
    const existing = readFileSync(hookPath, 'utf8');
    writeFileSync(backupPath, existing);
  }

  writeFileSync(hookPath, hookContent);
  chmodSync(hookPath, 0o755);
  return { success: true, message: `Installed ${hookName}` };
}

function uninstallHook(hooksDir: string, hookName: HookName): { success: boolean; message: string } {
  const hookPath = join(hooksDir, hookName);
  const backupPath = `${hookPath}.backup`;

  if (!existsSync(hookPath)) {
    return { success: true, message: `${hookName} not installed` };
  }

  if (!isDcsHook(hookPath)) {
    return { success: false, message: `${hookName} not managed by dcs, skipping` };
  }

  unlinkSync(hookPath);

  // Restore backup if exists
  if (existsSync(backupPath)) {
    const backup = readFileSync(backupPath, 'utf8');
    writeFileSync(hookPath, backup);
    chmodSync(hookPath, 0o755);
    unlinkSync(backupPath);
    return { success: true, message: `Removed ${hookName}, restored backup` };
  }

  return { success: true, message: `Removed ${hookName}` };
}

export function registerHooksCommand(program: Command): void {
  const hooks = program
    .command('hooks')
    .description('Manage git hooks for automatic secret syncing');

  hooks
    .command('install')
    .description('Install git hooks for automatic secret syncing')
    .option('-f, --force', 'Overwrite existing hooks')
    .option('--hook <name>', 'Install specific hook (post-checkout, post-merge)', 'all')
    .action((options) => {
      const hooksDir = getHooksDir();
      if (!hooksDir) {
        console.error('Error: Not in a git repository');
        process.exit(1);
      }

      // Ensure hooks directory exists
      if (!existsSync(hooksDir)) {
        mkdirSync(hooksDir, { recursive: true });
      }

      const hooksToInstall: HookName[] =
        options.hook === 'all'
          ? (Object.keys(HOOKS) as HookName[])
          : [options.hook as HookName];

      console.log('Installing git hooks...\n');

      let hasErrors = false;
      for (const hookName of hooksToInstall) {
        if (!HOOKS[hookName]) {
          console.error(`  Unknown hook: ${hookName}`);
          hasErrors = true;
          continue;
        }

        const result = installHook(hooksDir, hookName, options.force);
        const icon = result.success ? '\u2713' : '\u2717';
        console.log(`  ${icon} ${result.message}`);
        if (!result.success) hasErrors = true;
      }

      console.log('');
      if (hasErrors) {
        console.log('Some hooks could not be installed.');
        process.exit(1);
      } else {
        console.log('Hooks installed. Secrets will sync automatically on:');
        console.log('  - Branch checkout (git checkout, git switch)');
        console.log('  - Pull/merge (git pull, git merge)');
      }
    });

  hooks
    .command('uninstall')
    .description('Remove dcs git hooks')
    .option('--hook <name>', 'Remove specific hook', 'all')
    .action((options) => {
      const hooksDir = getHooksDir();
      if (!hooksDir) {
        console.error('Error: Not in a git repository');
        process.exit(1);
      }

      const hooksToRemove: HookName[] =
        options.hook === 'all'
          ? (Object.keys(HOOKS) as HookName[])
          : [options.hook as HookName];

      console.log('Removing git hooks...\n');

      for (const hookName of hooksToRemove) {
        if (!HOOKS[hookName]) {
          console.error(`  Unknown hook: ${hookName}`);
          continue;
        }

        const result = uninstallHook(hooksDir, hookName);
        const icon = result.success ? '\u2713' : '-';
        console.log(`  ${icon} ${result.message}`);
      }

      console.log('\nHooks removed.');
    });

  hooks
    .command('status')
    .description('Show installed hook status')
    .action(() => {
      const hooksDir = getHooksDir();
      if (!hooksDir) {
        console.error('Error: Not in a git repository');
        process.exit(1);
      }

      console.log('Git hooks status:\n');

      for (const hookName of Object.keys(HOOKS) as HookName[]) {
        const hookPath = join(hooksDir, hookName);
        let status: string;

        if (!existsSync(hookPath)) {
          status = 'not installed';
        } else if (isDcsHook(hookPath)) {
          status = 'installed (dcs)';
        } else {
          status = 'exists (not dcs)';
        }

        console.log(`  ${hookName}: ${status}`);
      }
    });
}
