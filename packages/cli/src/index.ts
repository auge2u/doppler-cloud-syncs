import { Command } from 'commander';
import { registerCommands } from './commands/index.js';
import { handleError } from './errors.js';

const program = new Command();

program
  .name('dcs')
  .description('Doppler Cloud Sync - Unified secret management across cloud platforms')
  .version('0.1.0')
  .option('--verbose', 'Show detailed error information including stack traces')
  .addHelpText('after', `
Exit Codes:
  0  Success
  1  General error
  2  Configuration error (missing/invalid dcs.yaml)
  3  Authentication error (invalid credentials)
  4  Platform error (Firebase, Cloudflare, Neon issues)
`);

registerCommands(program);

program.parseAsync(process.argv).catch((err) => {
  const verbose = program.opts().verbose ?? false;
  handleError(err, verbose);
});
