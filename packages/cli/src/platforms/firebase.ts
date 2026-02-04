import { execFileSync } from 'child_process';

export interface FirebaseConfig {
  projectId: string;
  token?: string;
}

export class FirebaseClient {
  private projectId: string;
  private token?: string;

  constructor(options: FirebaseConfig) {
    this.projectId = options.projectId;
    this.token = options.token;
  }

  async getConfig(): Promise<Record<string, unknown>> {
    try {
      const args = this.buildArgs(['functions:config:get']);
      const output = execFileSync('firebase', args, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
      return JSON.parse(output || '{}');
    } catch {
      return {};
    }
  }

  async setConfig(config: Record<string, string>): Promise<void> {
    const pairs = Object.entries(config)
      .map(([k, v]) => `doppler.${k.toLowerCase()}=${v}`);
    const args = this.buildArgs(['functions:config:set', ...pairs]);
    execFileSync('firebase', args, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
  }

  async unsetConfig(keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    const args = this.buildArgs(['functions:config:unset', ...keys]);
    execFileSync('firebase', args, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
  }

  async syncFromDoppler(secrets: Record<string, string>): Promise<void> {
    // Clear existing doppler namespace
    try {
      await this.unsetConfig(['doppler']);
    } catch {
      // Ignore if namespace doesn't exist
    }

    // Set new values
    await this.setConfig(secrets);
  }

  async diff(dopplerSecrets: Record<string, string>): Promise<{
    toAdd: string[];
    toRemove: string[];
    toUpdate: string[];
  }> {
    const current = await this.getConfig();
    const currentDoppler = (current.doppler || {}) as Record<string, string>;

    const dopplerKeys = Object.keys(dopplerSecrets).map(k => k.toLowerCase());
    const currentKeys = Object.keys(currentDoppler);

    const toAdd = dopplerKeys.filter(k => !currentKeys.includes(k));
    const toRemove = currentKeys.filter(k => !dopplerKeys.includes(k));
    const toUpdate = dopplerKeys.filter(k =>
      currentKeys.includes(k) &&
      currentDoppler[k] !== dopplerSecrets[k.toUpperCase()]
    );

    return { toAdd, toRemove, toUpdate };
  }

  private buildArgs(subcommand: string[]): string[] {
    const args = [...subcommand, '--project', this.projectId];
    if (this.token) {
      args.push('--token', this.token);
    }
    return args;
  }
}
