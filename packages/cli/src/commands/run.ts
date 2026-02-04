import type { Command } from 'commander';
import { spawn } from 'child_process';
import chalk from 'chalk';
import { loadConfig } from '../config/index.js';
import { createDopplerClient } from '../platforms/index.js';

export function registerRunCommand(program: Command): void {
  program
    .command('run')
    .description('Run a command with secrets injected')
    .option('-c, --config <env>', 'Environment config', 'dev')
    .argument('<command...>', 'Command to run')
    .allowUnknownOption()
    .action(async (command: string[], options) => {
      try {
        const config = await loadConfig();
        const doppler = createDopplerClient(config, options.config);

        console.log(chalk.cyan('→'), `Loading secrets (${options.config})...`);
        const secrets = await doppler.getSecrets();

        const [cmd, ...args] = command;

        console.log(chalk.cyan('→'), `Running: ${cmd} ${args.join(' ')}`);
        console.log('');

        const child = spawn(cmd, args, {
          stdio: 'inherit',
          env: {
            ...process.env,
            ...secrets,
          },
        });

        child.on('exit', (code) => {
          process.exit(code ?? 0);
        });

        child.on('error', (err) => {
          console.error(chalk.red('Error:'), err.message);
          process.exit(1);
        });
      } catch (err) {
        console.error(chalk.red('Error:'), (err as Error).message);
        process.exit(1);
      }
    });
}
