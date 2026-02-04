import type { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { loadConfig, type DcsConfig } from '../config/index.js';
import { createDopplerClient, createNeonClient } from '../platforms/index.js';

export function registerProvisionCommand(program: Command): void {
  const provision = program
    .command('provision')
    .description('Provision cloud resources and populate Doppler with credentials');

  provision
    .command('neon')
    .description('Provision Neon database project with branches')
    .option('--api-key <key>', 'Neon API key (or set NEON_API_KEY env var)')
    .option('--project-name <name>', 'Neon project name')
    .option('--region <region>', 'Neon region', 'aws-us-east-2')
    .option('--org-id <id>', 'Neon organization ID')
    .option('-y, --yes', 'Skip confirmation prompts')
    .action(async (options) => {
      try {
        const config = await loadConfig();
        const apiKey = options.apiKey || process.env.NEON_API_KEY;

        if (!apiKey) {
          console.error(chalk.red('Error:'), 'Neon API key required. Set NEON_API_KEY or use --api-key');
          process.exit(1);
        }

        const projectName = options.projectName || config.project;
        const environments = Object.keys(config.doppler.configs);

        if (!options.yes) {
          console.log(chalk.cyan('\nNeon Provisioning Plan:'));
          console.log(`  Project: ${chalk.bold(projectName)}`);
          console.log(`  Region: ${options.region}`);
          console.log(`  Branches to create:`);
          environments.forEach(env => {
            const branchName = env === 'prod' ? 'main' : `${env}-branch`;
            console.log(`    - ${branchName} → ${env} config`);
          });
          console.log('');

          const { confirm } = await inquirer.prompt([{
            type: 'confirm',
            name: 'confirm',
            message: 'Proceed with provisioning?',
            default: true,
          }]);

          if (!confirm) {
            console.log(chalk.yellow('Aborted.'));
            return;
          }
        }

        const neon = createNeonClient(apiKey, config);

        // Create project
        console.log(chalk.cyan('→'), 'Creating Neon project...');
        const { project, connectionUri, role } = await neon.createProject(projectName, {
          region: options.region,
          orgId: options.orgId || config.platforms.neon?.org_id,
        });
        console.log(chalk.green('✓'), `Created project: ${project.id}`);

        // Get main branch
        const mainBranch = await neon.getMainBranch(project.id);
        console.log(chalk.green('✓'), `Main branch: ${mainBranch.id}`);

        // Create branches for each environment
        const branchMapping: Record<string, string> = {};
        const connectionStrings: Record<string, Record<string, string>> = {};

        for (const env of environments) {
          const dopplerConfig = config.doppler.configs[env];

          let branchId: string;
          let branchName: string;

          if (env === 'prod') {
            // Prod uses main branch
            branchId = mainBranch.id;
            branchName = 'main';
          } else {
            // Create branch for other environments
            branchName = `${env}-branch`;
            console.log(chalk.cyan('→'), `Creating branch: ${branchName}...`);
            const { branch } = await neon.createBranch(branchName, {
              projectId: project.id,
              parentId: mainBranch.id,
            });
            branchId = branch.id;
            console.log(chalk.green('✓'), `Created branch: ${branchId}`);
          }

          branchMapping[env] = branchName;

          // Get connection info
          console.log(chalk.cyan('→'), `Getting connection info for ${env}...`);
          const connInfo = await neon.getConnectionInfo(branchId, {
            projectId: project.id,
            database: config.platforms.neon?.database || 'neondb',
          });

          connectionStrings[env] = {
            DATABASE_URL: connInfo.connectionString,
            NEON_HOST: connInfo.host,
            NEON_DATABASE: connInfo.database,
            NEON_USER: connInfo.role,
            NEON_PASSWORD: connInfo.password,
          };

          // Sync to Doppler
          console.log(chalk.cyan('→'), `Syncing to Doppler (${dopplerConfig})...`);
          const doppler = createDopplerClient(config, env);
          await doppler.setSecrets(connectionStrings[env]);
          console.log(chalk.green('✓'), `Synced ${Object.keys(connectionStrings[env]).length} secrets to ${dopplerConfig}`);
        }

        // Summary
        console.log('\n' + chalk.green('✓ Provisioning complete!'));
        console.log('\n' + chalk.cyan('Neon Project:'));
        console.log(`  ID: ${project.id}`);
        console.log(`  Name: ${project.name}`);
        console.log('\n' + chalk.cyan('Branch Mapping:'));
        Object.entries(branchMapping).forEach(([env, branch]) => {
          console.log(`  ${env} → ${branch}`);
        });
        console.log('\n' + chalk.cyan('Secrets added to Doppler:'));
        console.log('  DATABASE_URL, NEON_HOST, NEON_DATABASE, NEON_USER, NEON_PASSWORD');

        console.log('\n' + chalk.cyan('Next steps:'));
        console.log('  1. Update dcs.yaml with the project ID:');
        console.log(chalk.gray(`     neon:`));
        console.log(chalk.gray(`       project_id: ${project.id}`));
        console.log('  2. Run', chalk.bold('dcs neon migrate'), 'to initialize schema');

      } catch (err) {
        console.error(chalk.red('Error:'), (err as Error).message);
        process.exit(1);
      }
    });
}
