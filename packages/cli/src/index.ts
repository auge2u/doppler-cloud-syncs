import { Command } from 'commander';
import chalk from 'chalk';
import { registerCommands } from './commands/index.js';

const program = new Command();

program
  .name('dcs')
  .description('Doppler Cloud Sync - Unified secret management across cloud platforms')
  .version('0.1.0');

registerCommands(program);

program.parseAsync(process.argv).catch((err) => {
  console.error(chalk.red('Error:'), err.message);
  process.exit(1);
});
