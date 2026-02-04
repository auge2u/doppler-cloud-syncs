import type { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { execFileSync } from 'child_process';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { loadConfig } from '../config/index.js';
import { createDopplerClient, createNeonClient } from '../platforms/index.js';

export function registerNeonCommand(program: Command): void {
  const neon = program
    .command('neon')
    .description('Neon database management commands');

  // Branch commands
  const branch = neon
    .command('branch')
    .description('Manage Neon branches');

  branch
    .command('list')
    .description('List all branches')
    .option('--api-key <key>', 'Neon API key (or set NEON_API_KEY)')
    .action(async (options) => {
      try {
        const config = await loadConfig();
        const apiKey = options.apiKey || process.env.NEON_API_KEY;
        if (!apiKey) {
          console.error(chalk.red('Error:'), 'NEON_API_KEY required');
          process.exit(1);
        }

        const neon = createNeonClient(apiKey, config);
        const branches = await neon.listBranches();

        console.log(chalk.cyan('\nBranches:'));
        branches.forEach(b => {
          const isMain = !b.parent_id;
          const marker = isMain ? chalk.green('★') : ' ';
          console.log(`  ${marker} ${b.name} (${b.id})`);
        });
        console.log('');
      } catch (err) {
        console.error(chalk.red('Error:'), (err as Error).message);
        process.exit(1);
      }
    });

  branch
    .command('create <name>')
    .description('Create a new branch')
    .option('--api-key <key>', 'Neon API key')
    .option('--parent <name>', 'Parent branch name (default: main)')
    .option('-c, --config <env>', 'Environment to sync connection string to')
    .action(async (name: string, options) => {
      try {
        const config = await loadConfig();
        const apiKey = options.apiKey || process.env.NEON_API_KEY;
        if (!apiKey) {
          console.error(chalk.red('Error:'), 'NEON_API_KEY required');
          process.exit(1);
        }

        const neon = createNeonClient(apiKey, config);

        // Get parent branch
        let parentId: string | undefined;
        if (options.parent) {
          const parent = await neon.findBranchByName(options.parent);
          if (!parent) {
            console.error(chalk.red('Error:'), `Parent branch '${options.parent}' not found`);
            process.exit(1);
          }
          parentId = parent.id;
        } else {
          const main = await neon.getMainBranch();
          parentId = main.id;
        }

        console.log(chalk.cyan('→'), `Creating branch: ${name}...`);
        const { branch: newBranch, endpoints } = await neon.createBranch(name, { parentId });
        console.log(chalk.green('✓'), `Created branch: ${newBranch.id}`);

        if (endpoints.length > 0) {
          console.log(chalk.green('✓'), `Endpoint: ${endpoints[0].host}`);
        }

        // Sync to Doppler if config specified
        if (options.config) {
          console.log(chalk.cyan('→'), `Getting connection info...`);
          const connInfo = await neon.getConnectionInfo(newBranch.id, {
            database: config.platforms.neon?.database,
          });

          console.log(chalk.cyan('→'), `Syncing to Doppler (${options.config})...`);
          const doppler = createDopplerClient(config, options.config);
          await doppler.setSecrets({
            DATABASE_URL: connInfo.connectionString,
            NEON_HOST: connInfo.host,
            NEON_DATABASE: connInfo.database,
            NEON_USER: connInfo.role,
            NEON_PASSWORD: connInfo.password,
          });
          console.log(chalk.green('✓'), 'Connection string synced to Doppler');
        }

      } catch (err) {
        console.error(chalk.red('Error:'), (err as Error).message);
        process.exit(1);
      }
    });

  branch
    .command('delete <name>')
    .description('Delete a branch')
    .option('--api-key <key>', 'Neon API key')
    .option('-y, --yes', 'Skip confirmation')
    .action(async (name: string, options) => {
      try {
        const config = await loadConfig();
        const apiKey = options.apiKey || process.env.NEON_API_KEY;
        if (!apiKey) {
          console.error(chalk.red('Error:'), 'NEON_API_KEY required');
          process.exit(1);
        }

        const neon = createNeonClient(apiKey, config);
        const branch = await neon.findBranchByName(name);

        if (!branch) {
          console.error(chalk.red('Error:'), `Branch '${name}' not found`);
          process.exit(1);
        }

        if (!branch.parent_id) {
          console.error(chalk.red('Error:'), 'Cannot delete main branch');
          process.exit(1);
        }

        if (!options.yes) {
          const { confirm } = await inquirer.prompt([{
            type: 'confirm',
            name: 'confirm',
            message: `Delete branch '${name}'? This cannot be undone.`,
            default: false,
          }]);
          if (!confirm) {
            console.log(chalk.yellow('Aborted.'));
            return;
          }
        }

        console.log(chalk.cyan('→'), `Deleting branch: ${name}...`);
        await neon.deleteBranch(branch.id);
        console.log(chalk.green('✓'), 'Branch deleted');

      } catch (err) {
        console.error(chalk.red('Error:'), (err as Error).message);
        process.exit(1);
      }
    });

  branch
    .command('reset <name>')
    .description('Reset a branch from its parent (destructive)')
    .option('--api-key <key>', 'Neon API key')
    .option('-y, --yes', 'Skip confirmation')
    .action(async (name: string, options) => {
      try {
        const config = await loadConfig();
        const apiKey = options.apiKey || process.env.NEON_API_KEY;
        if (!apiKey) {
          console.error(chalk.red('Error:'), 'NEON_API_KEY required');
          process.exit(1);
        }

        const neon = createNeonClient(apiKey, config);
        const branch = await neon.findBranchByName(name);

        if (!branch) {
          console.error(chalk.red('Error:'), `Branch '${name}' not found`);
          process.exit(1);
        }

        if (!branch.parent_id) {
          console.error(chalk.red('Error:'), 'Cannot reset main branch');
          process.exit(1);
        }

        if (!options.yes) {
          const { confirm } = await inquirer.prompt([{
            type: 'confirm',
            name: 'confirm',
            message: `Reset branch '${name}' to parent state? All data will be lost.`,
            default: false,
          }]);
          if (!confirm) {
            console.log(chalk.yellow('Aborted.'));
            return;
          }
        }

        console.log(chalk.cyan('→'), `Resetting branch: ${name}...`);
        await neon.resetBranch(branch.id, { parentId: branch.parent_id });
        console.log(chalk.green('✓'), 'Branch reset to parent state');

      } catch (err) {
        console.error(chalk.red('Error:'), (err as Error).message);
        process.exit(1);
      }
    });

  branch
    .command('switch <name>')
    .description('Switch active branch for an environment')
    .option('--api-key <key>', 'Neon API key')
    .option('-c, --config <env>', 'Environment config', 'dev')
    .action(async (name: string, options) => {
      try {
        const config = await loadConfig();
        const apiKey = options.apiKey || process.env.NEON_API_KEY;
        if (!apiKey) {
          console.error(chalk.red('Error:'), 'NEON_API_KEY required');
          process.exit(1);
        }

        const neon = createNeonClient(apiKey, config);
        const branch = await neon.findBranchByName(name);

        if (!branch) {
          console.error(chalk.red('Error:'), `Branch '${name}' not found`);
          process.exit(1);
        }

        console.log(chalk.cyan('→'), `Getting connection info for ${name}...`);
        const connInfo = await neon.getConnectionInfo(branch.id, {
          database: config.platforms.neon?.database,
        });

        console.log(chalk.cyan('→'), `Updating Doppler (${options.config})...`);
        const doppler = createDopplerClient(config, options.config);
        await doppler.setSecrets({
          DATABASE_URL: connInfo.connectionString,
          NEON_HOST: connInfo.host,
          NEON_DATABASE: connInfo.database,
          NEON_USER: connInfo.role,
          NEON_PASSWORD: connInfo.password,
        });

        console.log(chalk.green('✓'), `Switched ${options.config} to branch: ${name}`);

      } catch (err) {
        console.error(chalk.red('Error:'), (err as Error).message);
        process.exit(1);
      }
    });

  // Migrate command
  neon
    .command('migrate')
    .description('Run database migrations')
    .option('--api-key <key>', 'Neon API key')
    .option('-c, --config <env>', 'Environment config', 'dev')
    .option('--dry-run', 'Show migrations without running')
    .option('--dir <path>', 'Migrations directory', './migrations')
    .action(async (options) => {
      try {
        const config = await loadConfig();
        const migrationsDir = options.dir || config.platforms.neon?.migrations_dir || './migrations';

        if (!existsSync(migrationsDir)) {
          console.error(chalk.red('Error:'), `Migrations directory not found: ${migrationsDir}`);
          console.log(chalk.gray('Create it with: mkdir -p migrations'));
          process.exit(1);
        }

        // Get migration files
        const files = readdirSync(migrationsDir)
          .filter(f => f.endsWith('.sql'))
          .sort();

        if (files.length === 0) {
          console.log(chalk.yellow('No migration files found in'), migrationsDir);
          return;
        }

        console.log(chalk.cyan('\nMigrations to run:'));
        files.forEach((f, i) => {
          console.log(`  ${i + 1}. ${f}`);
        });
        console.log('');

        if (options.dryRun) {
          console.log(chalk.yellow('[DRY RUN] Would run above migrations'));
          return;
        }

        // Get database URL from Doppler
        const doppler = createDopplerClient(config, options.config);
        const secrets = await doppler.getSecrets();
        const databaseUrl = secrets.DATABASE_URL;

        if (!databaseUrl) {
          console.error(chalk.red('Error:'), 'DATABASE_URL not found in Doppler');
          console.log(chalk.gray('Run `dcs provision neon` first'));
          process.exit(1);
        }

        // Run migrations using psql
        console.log(chalk.cyan('→'), `Running migrations on ${options.config}...`);

        for (const file of files) {
          const filePath = join(migrationsDir, file);
          console.log(chalk.cyan('→'), `Running: ${file}`);

          try {
            execFileSync('psql', [databaseUrl, '-f', filePath], {
              encoding: 'utf-8',
              stdio: ['pipe', 'pipe', 'pipe'],
            });
            console.log(chalk.green('✓'), file);
          } catch (err) {
            console.error(chalk.red('✗'), `Failed: ${file}`);
            console.error((err as Error).message);
            process.exit(1);
          }
        }

        console.log(chalk.green('\n✓ All migrations completed'));

      } catch (err) {
        console.error(chalk.red('Error:'), (err as Error).message);
        process.exit(1);
      }
    });

  // Status command
  neon
    .command('status')
    .description('Show Neon project status')
    .option('--api-key <key>', 'Neon API key')
    .action(async (options) => {
      try {
        const config = await loadConfig();
        const apiKey = options.apiKey || process.env.NEON_API_KEY;
        if (!apiKey) {
          console.error(chalk.red('Error:'), 'NEON_API_KEY required');
          process.exit(1);
        }

        const projectId = config.platforms.neon?.project_id;
        if (!projectId) {
          console.log(chalk.yellow('No Neon project configured in dcs.yaml'));
          console.log(chalk.gray('Run `dcs provision neon` to create one'));
          return;
        }

        const neon = createNeonClient(apiKey, config);

        console.log(chalk.cyan('\nNeon Project Status:'));

        // Project info
        const project = await neon.getProject(projectId);
        console.log(`  Project: ${project.name} (${project.id})`);

        // Branches
        const branches = await neon.listBranches(projectId);
        console.log(`\n  Branches (${branches.length}):`);
        branches.forEach(b => {
          const isMain = !b.parent_id;
          const marker = isMain ? chalk.green('★') : ' ';
          console.log(`    ${marker} ${b.name} - ${b.current_state}`);
        });

        // Branch mapping from config
        const branchMapping = config.platforms.neon?.branch_mapping;
        if (branchMapping) {
          console.log('\n  Environment Mapping:');
          Object.entries(branchMapping).forEach(([env, branch]) => {
            console.log(`    ${env} → ${branch}`);
          });
        }

        console.log('');

      } catch (err) {
        console.error(chalk.red('Error:'), (err as Error).message);
        process.exit(1);
      }
    });
}
