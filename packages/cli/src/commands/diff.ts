import type { Command } from 'commander';
import chalk from 'chalk';
import { loadConfig } from '../config/index.js';
import { createDopplerClient, createPlatformClients, type Platform } from '../platforms/index.js';

export function registerDiffCommand(program: Command): void {
  program
    .command('diff [platform]')
    .description('Show differences between Doppler and platforms')
    .option('-c, --config <env>', 'Environment config', 'dev')
    .action(async (platform: Platform | undefined, options) => {
      try {
        const config = await loadConfig();
        const doppler = createDopplerClient(config, options.config);
        const clients = createPlatformClients(config);

        console.log(chalk.cyan('→'), `Fetching secrets from Doppler (${options.config})...`);
        const secrets = await doppler.getSecrets();

        const platformsToCheck = platform
          ? [platform]
          : Object.keys(clients) as Platform[];

        for (const p of platformsToCheck) {
          console.log('\n' + chalk.bold(`${p}:`));
          await showDiff(p, clients, secrets);
        }

        console.log('');
      } catch (err) {
        console.error(chalk.red('Error:'), (err as Error).message);
        process.exit(1);
      }
    });
}

async function showDiff(
  platform: Platform,
  clients: ReturnType<typeof createPlatformClients>,
  dopplerSecrets: Record<string, string>
): Promise<void> {
  switch (platform) {
    case 'firebase': {
      const client = clients.firebase;
      if (!client) {
        console.log(chalk.yellow('  Not configured'));
        return;
      }

      const diff = await client.diff(dopplerSecrets);

      if (diff.toAdd.length === 0 && diff.toUpdate.length === 0 && diff.toRemove.length === 0) {
        console.log(chalk.green('  ✓ In sync'));
        return;
      }

      for (const key of diff.toAdd) {
        console.log(chalk.green(`  + ${key}`));
      }
      for (const key of diff.toUpdate) {
        console.log(chalk.yellow(`  ~ ${key}`));
      }
      for (const key of diff.toRemove) {
        console.log(chalk.red(`  - ${key}`));
      }
      break;
    }

    case 'cloudflare': {
      const client = clients.cloudflare;
      if (!client) {
        console.log(chalk.yellow('  Not configured'));
        return;
      }

      const diff = await client.diff(dopplerSecrets);

      if (diff.toAdd.length === 0 && diff.toRemove.length === 0) {
        console.log(chalk.green('  ✓ In sync (cannot detect value changes)'));
        return;
      }

      for (const key of diff.toAdd) {
        console.log(chalk.green(`  + ${key}`));
      }
      for (const key of diff.existing) {
        console.log(chalk.gray(`  = ${key} (value unknown)`));
      }
      for (const key of diff.toRemove) {
        console.log(chalk.red(`  - ${key}`));
      }
      break;
    }

    default:
      console.log(chalk.yellow(`  Platform ${platform} not yet supported`));
  }
}
