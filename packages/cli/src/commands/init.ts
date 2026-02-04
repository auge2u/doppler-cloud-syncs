import type { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { stringify as yamlStringify } from 'yaml';
import type { DcsConfig } from '../config/index.js';

interface InitAnswers {
  projectName: string;
  dopplerProject: string;
  environments: string[];
  platforms: string[];
  firebaseProjectId?: string;
  cloudflareAccountId?: string;
  cloudflareWorker?: string;
}

export function registerInitCommand(program: Command): void {
  program
    .command('init')
    .description('Initialize a new dcs project')
    .option('--from-dotfiles', 'Use dotfiles templates and identity registry')
    .option('-y, --yes', 'Accept defaults without prompting')
    .option('--name <name>', 'Project name')
    .action(async (options) => {
      const cwd = process.cwd();
      const configPath = join(cwd, 'dcs.yaml');

      if (existsSync(configPath) && !options.yes) {
        const { overwrite } = await inquirer.prompt([{
          type: 'confirm',
          name: 'overwrite',
          message: 'dcs.yaml already exists. Overwrite?',
          default: false,
        }]);
        if (!overwrite) {
          console.log(chalk.yellow('Aborted.'));
          return;
        }
      }

      const answers = await promptForConfig(options);
      const config = buildConfig(answers);

      writeFileSync(configPath, yamlStringify(config));
      console.log(chalk.green('✓'), 'Created dcs.yaml');

      console.log('\n' + chalk.cyan('Next steps:'));
      console.log('  1. Run', chalk.bold('doppler login'), 'if not authenticated');
      console.log('  2. Run', chalk.bold('doppler setup'), 'to link Doppler project');
      console.log('  3. Run', chalk.bold('dcs sync'), 'to sync secrets to platforms');
    });
}

async function promptForConfig(options: { name?: string; yes?: boolean }): Promise<InitAnswers> {
  const defaultName = options.name || process.cwd().split('/').pop() || 'my-app';

  if (options.yes) {
    return {
      projectName: defaultName,
      dopplerProject: defaultName,
      environments: ['dev', 'staging', 'prod'],
      platforms: [],
    };
  }

  return inquirer.prompt([
    {
      type: 'input',
      name: 'projectName',
      message: 'Project name:',
      default: defaultName,
    },
    {
      type: 'input',
      name: 'dopplerProject',
      message: 'Doppler project name:',
      default: (answers: { projectName: string }) => answers.projectName,
    },
    {
      type: 'checkbox',
      name: 'environments',
      message: 'Environments to configure:',
      choices: [
        { name: 'dev', checked: true },
        { name: 'staging', checked: true },
        { name: 'prod', checked: true },
      ],
    },
    {
      type: 'checkbox',
      name: 'platforms',
      message: 'Platforms to sync:',
      choices: [
        { name: 'Firebase Functions', value: 'firebase' },
        { name: 'Cloudflare Workers', value: 'cloudflare' },
        { name: 'Neon (coming soon)', value: 'neon', disabled: true },
        { name: 'GCP Cloud Run (coming soon)', value: 'gcp', disabled: true },
      ],
    },
    {
      type: 'input',
      name: 'firebaseProjectId',
      message: 'Firebase project ID:',
      when: (answers: { platforms: string[] }) => answers.platforms.includes('firebase'),
    },
    {
      type: 'input',
      name: 'cloudflareAccountId',
      message: 'Cloudflare account ID:',
      when: (answers: { platforms: string[] }) => answers.platforms.includes('cloudflare'),
    },
    {
      type: 'input',
      name: 'cloudflareWorker',
      message: 'Cloudflare Worker name (optional):',
      when: (answers: { platforms: string[] }) => answers.platforms.includes('cloudflare'),
    },
  ]);
}

function buildConfig(answers: InitAnswers): DcsConfig {
  const envMap: Record<string, string> = {
    dev: 'dev',
    staging: 'stg',
    prod: 'prd',
  };

  const configs: Record<string, string> = {};
  for (const env of answers.environments) {
    configs[env] = envMap[env] || env;
  }

  const config: DcsConfig = {
    project: answers.projectName,
    doppler: {
      project: answers.dopplerProject,
      configs,
    },
    platforms: {},
  };

  if (answers.platforms.includes('firebase') && answers.firebaseProjectId) {
    config.platforms.firebase = {
      project_id: answers.firebaseProjectId,
    };
  }

  if (answers.platforms.includes('cloudflare') && answers.cloudflareAccountId) {
    config.platforms.cloudflare = {
      account_id: answers.cloudflareAccountId,
      worker: answers.cloudflareWorker,
    };
  }

  return config;
}
