#!/usr/bin/env node
// Postinstall script for @auge2u/dcs-dotfiles

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageDir = join(__dirname, '..');

console.log(`
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║   dcs-dotfiles installed successfully!                         ║
║                                                                ║
║   To set up shell integration, run:                            ║
║                                                                ║
║     ${packageDir}/install.sh
║                                                                ║
║   Or manually add to your .bashrc/.zshrc:                      ║
║                                                                ║
║     # For bash:                                                ║
║     source "${packageDir}/shell/dcs.sh"
║                                                                ║
║     # For zsh:                                                 ║
║     source "${packageDir}/shell/dcs.zsh"
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
`);
