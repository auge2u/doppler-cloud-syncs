import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { parse as parseYaml } from 'yaml';
import { dcsConfigSchema, type DcsConfig } from './schema.js';

export async function loadConfig(dir: string = process.cwd()): Promise<DcsConfig> {
  const configPath = join(dir, 'dcs.yaml');

  if (!existsSync(configPath)) {
    throw new Error(`dcs.yaml not found in ${dir}`);
  }

  const rawContent = readFileSync(configPath, 'utf-8');
  const interpolated = interpolateEnvVars(rawContent);
  const parsed = parseYaml(interpolated);

  return dcsConfigSchema.parse(parsed);
}

function interpolateEnvVars(content: string): string {
  return content.replace(/\$\{(\w+)\}/g, (_, varName) => {
    const value = process.env[varName];
    if (value === undefined) {
      throw new Error(`Environment variable ${varName} is not set`);
    }
    return value;
  });
}

export function findConfigFile(startDir: string = process.cwd()): string | null {
  let dir = startDir;
  while (dir !== '/') {
    const configPath = join(dir, 'dcs.yaml');
    if (existsSync(configPath)) {
      return configPath;
    }
    dir = join(dir, '..');
  }
  return null;
}
