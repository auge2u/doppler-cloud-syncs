import { execFileSync } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

export interface CloudflareConfig {
  accountId: string;
  worker?: string;
  apiToken?: string;
}

export class CloudflareClient {
  private accountId: string;
  private worker?: string;
  private apiToken?: string;

  constructor(options: CloudflareConfig) {
    this.accountId = options.accountId;
    this.worker = options.worker;
    this.apiToken = options.apiToken;
  }

  async listSecrets(): Promise<string[]> {
    const args = this.buildArgs(['secret', 'list', '--format', 'json']);
    try {
      const output = execFileSync('wrangler', args, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
      const secrets = JSON.parse(output || '[]');
      return secrets.map((s: { name: string }) => s.name);
    } catch {
      return [];
    }
  }

  async syncFromDoppler(secrets: Record<string, string>): Promise<void> {
    // Wrangler expects JSON format for bulk secrets
    const tempFile = join(tmpdir(), `dcs-cf-secrets-${Date.now()}.json`);

    try {
      writeFileSync(tempFile, JSON.stringify(secrets));
      const args = this.buildArgs(['secret', 'bulk', tempFile]);
      execFileSync('wrangler', args, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
    } finally {
      try {
        unlinkSync(tempFile);
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  async deleteSecret(name: string): Promise<void> {
    const args = this.buildArgs(['secret', 'delete', name, '--force']);
    execFileSync('wrangler', args, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
  }

  async diff(dopplerSecrets: Record<string, string>): Promise<{
    toAdd: string[];
    toRemove: string[];
    existing: string[];
  }> {
    const currentSecrets = await this.listSecrets();
    const dopplerKeys = Object.keys(dopplerSecrets);

    const toAdd = dopplerKeys.filter(k => !currentSecrets.includes(k));
    const toRemove = currentSecrets.filter(k => !dopplerKeys.includes(k));
    const existing = dopplerKeys.filter(k => currentSecrets.includes(k));

    return { toAdd, toRemove, existing };
  }

  private buildArgs(subcommand: string[]): string[] {
    const args = [...subcommand];
    if (this.worker) {
      args.push('--name', this.worker);
    }
    return args;
  }
}
