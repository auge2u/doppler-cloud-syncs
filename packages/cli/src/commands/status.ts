import type { Command } from 'commander';
import chalk from 'chalk';
import { loadConfig, findConfigFile } from '../config/index.js';
import { createDopplerClient, createPlatformClients } from '../platforms/index.js';

export function registerStatusCommand(program: Command): void {
  program
    .command('status')
    .description('Show sync status across all platforms')
    .option('-c, --config <env>', 'Environment to check', 'dev')
    .action(async (options) => {
      try {
        const configPath = findConfigFile();
        if (!configPath) {
          console.log(chalk.yellow('No dcs.yaml found. Run `dcs init` to create one.'));
          return;
        }

        const config = await loadConfig();

        console.log(chalk.bold('\nProject:'), config.project);
        console.log(chalk.bold('Config:'), configPath);
        console.log(chalk.bold('Environment:'), options.config);

        console.log('\n' + chalk.cyan('Doppler:'));
        try {
          const doppler = createDopplerClient(config, options.config);
          const secrets = await doppler.getSecrets();
          console.log(chalk.green('  ✓'), `Connected (${Object.keys(secrets).length} secrets)`);
        } catch (err) {
          console.log(chalk.red('  ✗'), `Not connected: ${(err as Error).message}`);
        }

        const clients = createPlatformClients(config);

        if (clients.firebase) {
          console.log('\n' + chalk.cyan('Firebase:'));
          try {
            const fbConfig = await clients.firebase.getConfig();
            const dopplerSecrets = Object.keys((fbConfig.doppler || {}) as object);
            console.log(chalk.green('  ✓'), `Connected (${dopplerSecrets.length} synced secrets)`);
          } catch (err) {
            console.log(chalk.red('  ✗'), `Error: ${(err as Error).message}`);
          }
        }

        if (clients.cloudflare) {
          console.log('\n' + chalk.cyan('Cloudflare:'));
          try {
            const cfSecrets = await clients.cloudflare.listSecrets();
            console.log(chalk.green('  ✓'), `Connected (${cfSecrets.length} secrets)`);
          } catch (err) {
            console.log(chalk.red('  ✗'), `Error: ${(err as Error).message}`);
          }
        }

        console.log('');
      } catch (err) {
        console.error(chalk.red('Error:'), (err as Error).message);
        process.exit(1);
      }
    });
}
