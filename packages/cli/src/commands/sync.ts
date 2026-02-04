import type { Command } from 'commander';
import chalk from 'chalk';
import { loadConfig } from '../config/index.js';
import { createDopplerClient, createPlatformClients, type Platform, type SyncResult } from '../platforms/index.js';

export function registerSyncCommand(program: Command): void {
  program
    .command('sync [platform]')
    .description('Sync secrets from Doppler to platforms')
    .option('-c, --config <env>', 'Environment config to sync', 'dev')
    .option('--dry-run', 'Show what would be synced without making changes')
    .option('-q, --quiet', 'Minimal output (for use in scripts/hooks)')
    .action(async (platform: Platform | undefined, options) => {
      const log = options.quiet ? () => {} : console.log;

      try {
        const config = await loadConfig();
        const doppler = createDopplerClient(config, options.config);
        const clients = createPlatformClients(config);

        log(chalk.cyan('→'), `Fetching secrets from Doppler (${options.config})...`);
        const secrets = await doppler.getSecrets();
        const secretCount = Object.keys(secrets).length;
        log(chalk.green('✓'), `Found ${secretCount} secrets`);

        if (options.dryRun) {
          log(chalk.yellow('\n[DRY RUN] Would sync to:'));
        }

        const results: SyncResult[] = [];

        const platformsToSync = platform
          ? [platform]
          : Object.keys(clients) as Platform[];

        for (const p of platformsToSync) {
          const result = await syncPlatform(p, clients, secrets, options.dryRun, options.quiet);
          results.push(result);
        }

        log('\n' + chalk.cyan('Summary:'));
        for (const r of results) {
          const status = r.success ? chalk.green('✓') : chalk.red('✗');
          const details = r.success
            ? `+${r.added} ~${r.updated} -${r.removed}`
            : r.error;
          log(`  ${status} ${r.platform}: ${details}`);
        }

        const failed = results.filter(r => !r.success);
        if (failed.length > 0) {
          process.exit(1);
        }
      } catch (err) {
        console.error(chalk.red('Error:'), (err as Error).message);
        process.exit(1);
      }
    });
}

async function syncPlatform(
  platform: Platform,
  clients: ReturnType<typeof createPlatformClients>,
  secrets: Record<string, string>,
  dryRun: boolean,
  quiet: boolean = false
): Promise<SyncResult> {
  const log = quiet ? () => {} : console.log;
  const result: SyncResult = {
    platform,
    success: false,
    added: 0,
    updated: 0,
    removed: 0,
  };

  try {
    switch (platform) {
      case 'firebase': {
        const client = clients.firebase;
        if (!client) {
          result.error = 'Firebase not configured';
          return result;
        }

        const diff = await client.diff(secrets);
        result.added = diff.toAdd.length;
        result.updated = diff.toUpdate.length;
        result.removed = diff.toRemove.length;

        if (!dryRun) {
          log(chalk.cyan('→'), `Syncing to Firebase...`);
          await client.syncFromDoppler(secrets);
        }
        result.success = true;
        break;
      }

      case 'cloudflare': {
        const client = clients.cloudflare;
        if (!client) {
          result.error = 'Cloudflare not configured';
          return result;
        }

        const diff = await client.diff(secrets);
        result.added = diff.toAdd.length;
        result.updated = diff.existing.length;
        result.removed = diff.toRemove.length;

        if (!dryRun) {
          log(chalk.cyan('→'), `Syncing to Cloudflare Workers...`);
          await client.syncFromDoppler(secrets);
        }
        result.success = true;
        break;
      }

      default:
        result.error = `Platform ${platform} not yet supported`;
    }
  } catch (err) {
    result.error = (err as Error).message;
  }

  return result;
}
