import { execFileSync } from 'child_process';

export interface DopplerConfig {
  project: string;
  config: string;
  token?: string;
}

export interface DopplerSecret {
  [key: string]: string;
}

export interface DopplerConfigInfo {
  name: string;
  environment: string;
}

export class DopplerClient {
  private project: string;
  private config: string;
  private token?: string;

  constructor(options: DopplerConfig) {
    this.project = options.project;
    this.config = options.config;
    this.token = options.token;
  }

  async getSecrets(): Promise<DopplerSecret> {
    const args = this.buildArgs(['secrets', 'download', '--no-file', '--format', 'json']);
    const output = execFileSync('doppler', args, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
    return JSON.parse(output);
  }

  async setSecret(key: string, value: string): Promise<void> {
    const args = this.buildArgs(['secrets', 'set', `${key}=${value}`]);
    execFileSync('doppler', args, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
  }

  async setSecrets(secrets: Record<string, string>): Promise<void> {
    const pairs = Object.entries(secrets).map(([k, v]) => `${k}=${v}`);
    const args = this.buildArgs(['secrets', 'set', ...pairs]);
    execFileSync('doppler', args, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
  }

  async listConfigs(): Promise<DopplerConfigInfo[]> {
    const args = this.buildArgs(['configs', '--json']);
    const output = execFileSync('doppler', args, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
    return JSON.parse(output);
  }

  async diff(other: Record<string, string>): Promise<{
    added: string[];
    removed: string[];
    changed: string[];
  }> {
    const current = await this.getSecrets();
    const currentKeys = new Set(Object.keys(current));
    const otherKeys = new Set(Object.keys(other));

    const added = [...otherKeys].filter(k => !currentKeys.has(k));
    const removed = [...currentKeys].filter(k => !otherKeys.has(k));
    const changed = [...currentKeys].filter(k => otherKeys.has(k) && current[k] !== other[k]);

    return { added, removed, changed };
  }

  private buildArgs(subcommand: string[]): string[] {
    const args = [...subcommand, '--project', this.project, '--config', this.config];
    if (this.token) {
      args.push('--token', this.token);
    }
    return args;
  }
}
