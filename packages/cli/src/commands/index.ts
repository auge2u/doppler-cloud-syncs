import type { Command } from 'commander';
import { registerInitCommand } from './init.js';
import { registerSyncCommand } from './sync.js';
import { registerStatusCommand } from './status.js';
import { registerRunCommand } from './run.js';
import { registerDiffCommand } from './diff.js';

export function registerCommands(program: Command): void {
  registerInitCommand(program);
  registerSyncCommand(program);
  registerStatusCommand(program);
  registerRunCommand(program);
  registerDiffCommand(program);
}
