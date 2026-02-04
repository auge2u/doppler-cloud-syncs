# Phase 1: Core CLI + Doppler Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the core `dcs` CLI with Doppler integration, config loading, and sync to Firebase/Cloudflare.

**Architecture:** TypeScript CLI using Commander.js for commands, Inquirer for prompts. Platform adapters abstract each cloud provider. Config loader handles `dcs.yaml` with environment variable interpolation.

**Tech Stack:** TypeScript, Commander.js, Inquirer, Vitest, tsup, pnpm workspaces

---

## Task 1: Initialize Monorepo

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `.npmrc`

**Step 1: Create root package.json**

```json
{
  "name": "dcs-monorepo",
  "private": true,
  "scripts": {
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "lint": "pnpm -r lint",
    "clean": "pnpm -r clean"
  },
  "devDependencies": {
    "typescript": "^5.4.0"
  },
  "engines": {
    "node": ">=20",
    "pnpm": ">=9"
  }
}
```

**Step 2: Create pnpm-workspace.yaml**

```yaml
packages:
  - 'packages/*'
```

**Step 3: Create tsconfig.base.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "strict": true,
    "noImplicitReturns": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

**Step 4: Create .npmrc**

```
auto-install-peers=true
```

**Step 5: Commit**

```bash
git add package.json pnpm-workspace.yaml tsconfig.base.json .npmrc
git commit -m "chore: initialize pnpm monorepo structure"
```

---

## Task 2: Set Up CLI Package Structure

**Files:**
- Create: `packages/cli/package.json`
- Create: `packages/cli/tsconfig.json`
- Create: `packages/cli/tsup.config.ts`
- Create: `packages/cli/vitest.config.ts`

**Step 1: Create packages/cli/package.json**

```json
{
  "name": "@auge2u/dcs",
  "version": "0.1.0",
  "description": "Doppler Cloud Sync - Unified secret management across cloud platforms",
  "type": "module",
  "bin": {
    "dcs": "./dist/index.js"
  },
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "files": [
    "dist"
  ],
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "tsc --noEmit",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "chalk": "^5.3.0",
    "commander": "^12.0.0",
    "inquirer": "^9.2.0",
    "yaml": "^2.4.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@types/inquirer": "^9.0.0",
    "@types/node": "^20.0.0",
    "tsup": "^8.0.0",
    "typescript": "^5.4.0",
    "vitest": "^1.4.0"
  },
  "engines": {
    "node": ">=20"
  }
}
```

**Step 2: Create packages/cli/tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

**Step 3: Create packages/cli/tsup.config.ts**

```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  target: 'node20',
  banner: {
    js: '#!/usr/bin/env node',
  },
});
```

**Step 4: Create packages/cli/vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
```

**Step 5: Commit**

```bash
git add packages/cli/
git commit -m "chore: add CLI package structure with build config"
```

---

## Task 3: Implement Config Schema and Loader

**Files:**
- Create: `packages/cli/src/config/schema.ts`
- Create: `packages/cli/src/config/loader.ts`
- Create: `packages/cli/src/config/index.ts`
- Create: `packages/cli/tests/config/loader.test.ts`

**Step 1: Write failing test for config loader**

Create `packages/cli/tests/config/loader.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadConfig } from '../../src/config/loader.js';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('loadConfig', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `dcs-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('should load a valid dcs.yaml file', async () => {
    const configContent = `
project: test-app
doppler:
  project: test-app
  configs:
    dev: dev
    prod: prd
platforms:
  firebase:
    project_id: my-firebase-project
`;
    writeFileSync(join(testDir, 'dcs.yaml'), configContent);

    const config = await loadConfig(testDir);

    expect(config.project).toBe('test-app');
    expect(config.doppler.project).toBe('test-app');
    expect(config.doppler.configs.dev).toBe('dev');
    expect(config.platforms.firebase?.project_id).toBe('my-firebase-project');
  });

  it('should interpolate environment variables', async () => {
    process.env.TEST_PROJECT_ID = 'env-firebase-project';
    const configContent = `
project: test-app
doppler:
  project: test-app
  configs:
    dev: dev
platforms:
  firebase:
    project_id: \${TEST_PROJECT_ID}
`;
    writeFileSync(join(testDir, 'dcs.yaml'), configContent);

    const config = await loadConfig(testDir);

    expect(config.platforms.firebase?.project_id).toBe('env-firebase-project');
    delete process.env.TEST_PROJECT_ID;
  });

  it('should throw if dcs.yaml not found', async () => {
    await expect(loadConfig(testDir)).rejects.toThrow('dcs.yaml not found');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd packages/cli && pnpm test`
Expected: FAIL with "Cannot find module"

**Step 3: Create config schema**

Create `packages/cli/src/config/schema.ts`:

```typescript
import { z } from 'zod';

export const platformConfigSchema = z.object({
  neon: z.object({
    project_id: z.string().optional(),
    branch_mapping: z.record(z.string()).optional(),
  }).optional(),
  firebase: z.object({
    project_id: z.string(),
  }).optional(),
  cloudflare: z.object({
    account_id: z.string(),
    worker: z.string().optional(),
  }).optional(),
  gcp: z.object({
    project_id: z.string(),
    region: z.string().optional(),
  }).optional(),
});

export const syncTriggerSchema = z.object({
  type: z.enum(['git-hook', 'webhook']),
  branch: z.string().optional(),
  target: z.string().optional(),
  platforms: z.array(z.string()).optional(),
});

export const dcsConfigSchema = z.object({
  project: z.string(),
  doppler: z.object({
    project: z.string(),
    configs: z.record(z.string()),
  }),
  platforms: platformConfigSchema,
  sync: z.object({
    triggers: z.array(syncTriggerSchema).optional(),
  }).optional(),
});

export type DcsConfig = z.infer<typeof dcsConfigSchema>;
export type PlatformConfig = z.infer<typeof platformConfigSchema>;
```

**Step 4: Implement config loader**

Create `packages/cli/src/config/loader.ts`:

```typescript
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
```

**Step 5: Create config index export**

Create `packages/cli/src/config/index.ts`:

```typescript
export { loadConfig, findConfigFile } from './loader.js';
export { dcsConfigSchema, type DcsConfig, type PlatformConfig } from './schema.js';
```

**Step 6: Run tests to verify they pass**

Run: `cd packages/cli && pnpm test`
Expected: PASS

**Step 7: Commit**

```bash
git add packages/cli/src/config/ packages/cli/tests/
git commit -m "feat(cli): add config schema and loader with env interpolation"
```

---

## Task 4: Implement Doppler Platform Adapter

**Files:**
- Create: `packages/cli/src/platforms/doppler.ts`
- Create: `packages/cli/tests/platforms/doppler.test.ts`

**Step 1: Write failing test for Doppler adapter**

Create `packages/cli/tests/platforms/doppler.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DopplerClient } from '../../src/platforms/doppler.js';

// Mock child_process
vi.mock('child_process', () => ({
  execFileSync: vi.fn(),
}));

import { execFileSync } from 'child_process';

describe('DopplerClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getSecrets', () => {
    it('should fetch secrets from Doppler CLI', async () => {
      const mockSecrets = {
        API_KEY: 'secret-key',
        DATABASE_URL: 'postgres://...',
      };
      vi.mocked(execFileSync).mockReturnValue(Buffer.from(JSON.stringify(mockSecrets)));

      const client = new DopplerClient({ project: 'test', config: 'dev' });
      const secrets = await client.getSecrets();

      expect(execFileSync).toHaveBeenCalledWith(
        'doppler',
        ['secrets', 'download', '--no-file', '--format', 'json', '--project', 'test', '--config', 'dev'],
        expect.any(Object)
      );
      expect(secrets).toEqual(mockSecrets);
    });
  });

  describe('setSecret', () => {
    it('should set a secret via Doppler CLI', async () => {
      vi.mocked(execFileSync).mockReturnValue(Buffer.from(''));

      const client = new DopplerClient({ project: 'test', config: 'dev' });
      await client.setSecret('NEW_KEY', 'new-value');

      expect(execFileSync).toHaveBeenCalledWith(
        'doppler',
        ['secrets', 'set', 'NEW_KEY=new-value', '--project', 'test', '--config', 'dev'],
        expect.any(Object)
      );
    });
  });

  describe('listConfigs', () => {
    it('should list available configs', async () => {
      const mockConfigs = [
        { name: 'dev', environment: 'dev' },
        { name: 'prd', environment: 'prd' },
      ];
      vi.mocked(execFileSync).mockReturnValue(Buffer.from(JSON.stringify(mockConfigs)));

      const client = new DopplerClient({ project: 'test', config: 'dev' });
      const configs = await client.listConfigs();

      expect(configs).toEqual(mockConfigs);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd packages/cli && pnpm test`
Expected: FAIL with "Cannot find module"

**Step 3: Implement Doppler client**

Create `packages/cli/src/platforms/doppler.ts`:

```typescript
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
```

**Step 4: Run tests to verify they pass**

Run: `cd packages/cli && pnpm test`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/cli/src/platforms/doppler.ts packages/cli/tests/platforms/
git commit -m "feat(cli): add Doppler platform adapter"
```

---

## Task 5: Implement Firebase Platform Adapter

**Files:**
- Create: `packages/cli/src/platforms/firebase.ts`
- Create: `packages/cli/tests/platforms/firebase.test.ts`

**Step 1: Write failing test for Firebase adapter**

Create `packages/cli/tests/platforms/firebase.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FirebaseClient } from '../../src/platforms/firebase.js';
import { execFileSync } from 'child_process';

vi.mock('child_process', () => ({
  execFileSync: vi.fn(),
}));

describe('FirebaseClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getConfig', () => {
    it('should fetch current Firebase functions config', async () => {
      const mockConfig = { doppler: { api_key: 'xxx' } };
      vi.mocked(execFileSync).mockReturnValue(Buffer.from(JSON.stringify(mockConfig)));

      const client = new FirebaseClient({ projectId: 'test-project' });
      const config = await client.getConfig();

      expect(execFileSync).toHaveBeenCalledWith(
        'firebase',
        ['functions:config:get', '--project', 'test-project'],
        expect.any(Object)
      );
      expect(config).toEqual(mockConfig);
    });
  });

  describe('setConfig', () => {
    it('should set Firebase functions config', async () => {
      vi.mocked(execFileSync).mockReturnValue(Buffer.from(''));

      const client = new FirebaseClient({ projectId: 'test-project' });
      await client.setConfig({ api_key: 'new-key', db_url: 'postgres://...' });

      expect(execFileSync).toHaveBeenCalledWith(
        'firebase',
        expect.arrayContaining(['functions:config:set']),
        expect.any(Object)
      );
    });
  });

  describe('syncFromDoppler', () => {
    it('should sync secrets from Doppler format to Firebase format', async () => {
      vi.mocked(execFileSync).mockReturnValue(Buffer.from(''));

      const client = new FirebaseClient({ projectId: 'test-project' });
      await client.syncFromDoppler({
        API_KEY: 'secret',
        DATABASE_URL: 'postgres://...',
      });

      // Firebase uses lowercase dot-notation: doppler.api_key
      expect(execFileSync).toHaveBeenCalledWith(
        'firebase',
        expect.arrayContaining(['doppler.api_key=secret']),
        expect.any(Object)
      );
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd packages/cli && pnpm test`
Expected: FAIL with "Cannot find module"

**Step 3: Implement Firebase client**

Create `packages/cli/src/platforms/firebase.ts`:

```typescript
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
```

**Step 4: Run tests to verify they pass**

Run: `cd packages/cli && pnpm test`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/cli/src/platforms/firebase.ts packages/cli/tests/platforms/firebase.test.ts
git commit -m "feat(cli): add Firebase platform adapter"
```

---

## Task 6: Implement Cloudflare Platform Adapter

**Files:**
- Create: `packages/cli/src/platforms/cloudflare.ts`
- Create: `packages/cli/tests/platforms/cloudflare.test.ts`

**Step 1: Write failing test for Cloudflare adapter**

Create `packages/cli/tests/platforms/cloudflare.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CloudflareClient } from '../../src/platforms/cloudflare.js';
import { execFileSync } from 'child_process';

vi.mock('child_process', () => ({
  execFileSync: vi.fn(),
}));

describe('CloudflareClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('syncFromDoppler', () => {
    it('should sync secrets using wrangler secret bulk', async () => {
      vi.mocked(execFileSync).mockReturnValue(Buffer.from(''));

      const client = new CloudflareClient({ accountId: 'acc123', worker: 'my-worker' });
      await client.syncFromDoppler({
        API_KEY: 'secret',
        DATABASE_URL: 'postgres://...',
      });

      expect(execFileSync).toHaveBeenCalledWith(
        'wrangler',
        expect.arrayContaining(['secret', 'bulk']),
        expect.any(Object)
      );
    });
  });

  describe('listSecrets', () => {
    it('should list worker secrets', async () => {
      const mockSecrets = [{ name: 'API_KEY', type: 'secret_text' }];
      vi.mocked(execFileSync).mockReturnValue(Buffer.from(JSON.stringify(mockSecrets)));

      const client = new CloudflareClient({ accountId: 'acc123', worker: 'my-worker' });
      const secrets = await client.listSecrets();

      expect(secrets).toEqual(['API_KEY']);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd packages/cli && pnpm test`
Expected: FAIL with "Cannot find module"

**Step 3: Implement Cloudflare client**

Create `packages/cli/src/platforms/cloudflare.ts`:

```typescript
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
```

**Step 4: Run tests to verify they pass**

Run: `cd packages/cli && pnpm test`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/cli/src/platforms/cloudflare.ts packages/cli/tests/platforms/cloudflare.test.ts
git commit -m "feat(cli): add Cloudflare Workers platform adapter"
```

---

## Task 7: Create Platform Index and Factory

**Files:**
- Create: `packages/cli/src/platforms/index.ts`

**Step 1: Create platforms index with factory**

Create `packages/cli/src/platforms/index.ts`:

```typescript
export { DopplerClient, type DopplerConfig, type DopplerSecret } from './doppler.js';
export { FirebaseClient, type FirebaseConfig } from './firebase.js';
export { CloudflareClient, type CloudflareConfig } from './cloudflare.js';

import type { DcsConfig } from '../config/index.js';
import { DopplerClient } from './doppler.js';
import { FirebaseClient } from './firebase.js';
import { CloudflareClient } from './cloudflare.js';

export type Platform = 'firebase' | 'cloudflare' | 'neon' | 'gcp';

export interface SyncResult {
  platform: Platform;
  success: boolean;
  added: number;
  updated: number;
  removed: number;
  error?: string;
}

export function createDopplerClient(config: DcsConfig, environment: string): DopplerClient {
  const dopplerConfig = config.doppler.configs[environment];
  if (!dopplerConfig) {
    throw new Error(`Unknown environment: ${environment}`);
  }
  return new DopplerClient({
    project: config.doppler.project,
    config: dopplerConfig,
  });
}

export function createPlatformClients(config: DcsConfig): {
  firebase?: FirebaseClient;
  cloudflare?: CloudflareClient;
} {
  const clients: { firebase?: FirebaseClient; cloudflare?: CloudflareClient } = {};

  if (config.platforms.firebase) {
    clients.firebase = new FirebaseClient({
      projectId: config.platforms.firebase.project_id,
    });
  }

  if (config.platforms.cloudflare) {
    clients.cloudflare = new CloudflareClient({
      accountId: config.platforms.cloudflare.account_id,
      worker: config.platforms.cloudflare.worker,
    });
  }

  return clients;
}
```

**Step 2: Commit**

```bash
git add packages/cli/src/platforms/index.ts
git commit -m "feat(cli): add platform factory and exports"
```

---

## Task 8: Implement CLI Entry Point and Command Registration

**Files:**
- Create: `packages/cli/src/index.ts`
- Create: `packages/cli/src/commands/index.ts`
- Create: `packages/cli/src/commands/init.ts`
- Create: `packages/cli/src/commands/sync.ts`
- Create: `packages/cli/src/commands/status.ts`
- Create: `packages/cli/src/commands/run.ts`
- Create: `packages/cli/src/commands/diff.ts`

**Step 1: Create CLI entry point**

Create `packages/cli/src/index.ts`:

```typescript
import { Command } from 'commander';
import chalk from 'chalk';
import { registerCommands } from './commands/index.js';

const program = new Command();

program
  .name('dcs')
  .description('Doppler Cloud Sync - Unified secret management across cloud platforms')
  .version('0.1.0');

registerCommands(program);

program.parseAsync(process.argv).catch((err) => {
  console.error(chalk.red('Error:'), err.message);
  process.exit(1);
});
```

**Step 2: Create commands index**

Create `packages/cli/src/commands/index.ts`:

```typescript
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
```

**Step 3: Create init command**

Create `packages/cli/src/commands/init.ts`:

```typescript
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
```

**Step 4: Create sync command**

Create `packages/cli/src/commands/sync.ts`:

```typescript
import type { Command } from 'commander';
import chalk from 'chalk';
import { loadConfig } from '../config/index.js';
import { createDopplerClient, createPlatformClients, type Platform, type SyncResult } from '../platforms/index.js';

export function registerSyncCommand(program: Command): void {
  program
    .command('sync [platform]')
    .description('Sync secrets from Doppler to platforms')
    .option('-c, --config <env>', 'Environment config to sync', 'dev')
    .option('--dry-run', 'Show what would be synced without making changes')
    .action(async (platform: Platform | undefined, options) => {
      try {
        const config = await loadConfig();
        const doppler = createDopplerClient(config, options.config);
        const clients = createPlatformClients(config);

        console.log(chalk.cyan('→'), `Fetching secrets from Doppler (${options.config})...`);
        const secrets = await doppler.getSecrets();
        const secretCount = Object.keys(secrets).length;
        console.log(chalk.green('✓'), `Found ${secretCount} secrets`);

        if (options.dryRun) {
          console.log(chalk.yellow('\n[DRY RUN] Would sync to:'));
        }

        const results: SyncResult[] = [];

        const platformsToSync = platform
          ? [platform]
          : Object.keys(clients) as Platform[];

        for (const p of platformsToSync) {
          const result = await syncPlatform(p, clients, secrets, options.dryRun);
          results.push(result);
        }

        console.log('\n' + chalk.cyan('Summary:'));
        for (const r of results) {
          const status = r.success ? chalk.green('✓') : chalk.red('✗');
          const details = r.success
            ? `+${r.added} ~${r.updated} -${r.removed}`
            : r.error;
          console.log(`  ${status} ${r.platform}: ${details}`);
        }

        const failed = results.filter(r => !r.success);
        if (failed.length > 0) {
          process.exit(1);
        }
      } catch (err) {
        console.error(chalk.red('Error:'), (err as Error).message);
        process.exit(1);
      }
    });
}

async function syncPlatform(
  platform: Platform,
  clients: ReturnType<typeof createPlatformClients>,
  secrets: Record<string, string>,
  dryRun: boolean
): Promise<SyncResult> {
  const result: SyncResult = {
    platform,
    success: false,
    added: 0,
    updated: 0,
    removed: 0,
  };

  try {
    switch (platform) {
      case 'firebase': {
        const client = clients.firebase;
        if (!client) {
          result.error = 'Firebase not configured';
          return result;
        }

        const diff = await client.diff(secrets);
        result.added = diff.toAdd.length;
        result.updated = diff.toUpdate.length;
        result.removed = diff.toRemove.length;

        if (!dryRun) {
          console.log(chalk.cyan('→'), `Syncing to Firebase...`);
          await client.syncFromDoppler(secrets);
        }
        result.success = true;
        break;
      }

      case 'cloudflare': {
        const client = clients.cloudflare;
        if (!client) {
          result.error = 'Cloudflare not configured';
          return result;
        }

        const diff = await client.diff(secrets);
        result.added = diff.toAdd.length;
        result.updated = diff.existing.length;
        result.removed = diff.toRemove.length;

        if (!dryRun) {
          console.log(chalk.cyan('→'), `Syncing to Cloudflare Workers...`);
          await client.syncFromDoppler(secrets);
        }
        result.success = true;
        break;
      }

      default:
        result.error = `Platform ${platform} not yet supported`;
    }
  } catch (err) {
    result.error = (err as Error).message;
  }

  return result;
}
```

**Step 5: Create status command**

Create `packages/cli/src/commands/status.ts`:

```typescript
import type { Command } from 'commander';
import chalk from 'chalk';
import { loadConfig, findConfigFile } from '../config/index.js';
import { createDopplerClient, createPlatformClients } from '../platforms/index.js';

export function registerStatusCommand(program: Command): void {
  program
    .command('status')
    .description('Show sync status across all platforms')
    .option('-c, --config <env>', 'Environment to check', 'dev')
    .action(async (options) => {
      try {
        const configPath = findConfigFile();
        if (!configPath) {
          console.log(chalk.yellow('No dcs.yaml found. Run `dcs init` to create one.'));
          return;
        }

        const config = await loadConfig();

        console.log(chalk.bold('\nProject:'), config.project);
        console.log(chalk.bold('Config:'), configPath);
        console.log(chalk.bold('Environment:'), options.config);

        console.log('\n' + chalk.cyan('Doppler:'));
        try {
          const doppler = createDopplerClient(config, options.config);
          const secrets = await doppler.getSecrets();
          console.log(chalk.green('  ✓'), `Connected (${Object.keys(secrets).length} secrets)`);
        } catch (err) {
          console.log(chalk.red('  ✗'), `Not connected: ${(err as Error).message}`);
        }

        const clients = createPlatformClients(config);

        if (clients.firebase) {
          console.log('\n' + chalk.cyan('Firebase:'));
          try {
            const fbConfig = await clients.firebase.getConfig();
            const dopplerSecrets = Object.keys((fbConfig.doppler || {}) as object);
            console.log(chalk.green('  ✓'), `Connected (${dopplerSecrets.length} synced secrets)`);
          } catch (err) {
            console.log(chalk.red('  ✗'), `Error: ${(err as Error).message}`);
          }
        }

        if (clients.cloudflare) {
          console.log('\n' + chalk.cyan('Cloudflare:'));
          try {
            const cfSecrets = await clients.cloudflare.listSecrets();
            console.log(chalk.green('  ✓'), `Connected (${cfSecrets.length} secrets)`);
          } catch (err) {
            console.log(chalk.red('  ✗'), `Error: ${(err as Error).message}`);
          }
        }

        console.log('');
      } catch (err) {
        console.error(chalk.red('Error:'), (err as Error).message);
        process.exit(1);
      }
    });
}
```

**Step 6: Create run command**

Create `packages/cli/src/commands/run.ts`:

```typescript
import type { Command } from 'commander';
import { spawn } from 'child_process';
import chalk from 'chalk';
import { loadConfig } from '../config/index.js';
import { createDopplerClient } from '../platforms/index.js';

export function registerRunCommand(program: Command): void {
  program
    .command('run')
    .description('Run a command with secrets injected')
    .option('-c, --config <env>', 'Environment config', 'dev')
    .argument('<command...>', 'Command to run')
    .allowUnknownOption()
    .action(async (command: string[], options) => {
      try {
        const config = await loadConfig();
        const doppler = createDopplerClient(config, options.config);

        console.log(chalk.cyan('→'), `Loading secrets (${options.config})...`);
        const secrets = await doppler.getSecrets();

        const [cmd, ...args] = command;

        console.log(chalk.cyan('→'), `Running: ${cmd} ${args.join(' ')}`);
        console.log('');

        const child = spawn(cmd, args, {
          stdio: 'inherit',
          env: {
            ...process.env,
            ...secrets,
          },
        });

        child.on('exit', (code) => {
          process.exit(code ?? 0);
        });

        child.on('error', (err) => {
          console.error(chalk.red('Error:'), err.message);
          process.exit(1);
        });
      } catch (err) {
        console.error(chalk.red('Error:'), (err as Error).message);
        process.exit(1);
      }
    });
}
```

**Step 7: Create diff command**

Create `packages/cli/src/commands/diff.ts`:

```typescript
import type { Command } from 'commander';
import chalk from 'chalk';
import { loadConfig } from '../config/index.js';
import { createDopplerClient, createPlatformClients, type Platform } from '../platforms/index.js';

export function registerDiffCommand(program: Command): void {
  program
    .command('diff [platform]')
    .description('Show differences between Doppler and platforms')
    .option('-c, --config <env>', 'Environment config', 'dev')
    .action(async (platform: Platform | undefined, options) => {
      try {
        const config = await loadConfig();
        const doppler = createDopplerClient(config, options.config);
        const clients = createPlatformClients(config);

        console.log(chalk.cyan('→'), `Fetching secrets from Doppler (${options.config})...`);
        const secrets = await doppler.getSecrets();

        const platformsToCheck = platform
          ? [platform]
          : Object.keys(clients) as Platform[];

        for (const p of platformsToCheck) {
          console.log('\n' + chalk.bold(`${p}:`));
          await showDiff(p, clients, secrets);
        }

        console.log('');
      } catch (err) {
        console.error(chalk.red('Error:'), (err as Error).message);
        process.exit(1);
      }
    });
}

async function showDiff(
  platform: Platform,
  clients: ReturnType<typeof createPlatformClients>,
  dopplerSecrets: Record<string, string>
): Promise<void> {
  switch (platform) {
    case 'firebase': {
      const client = clients.firebase;
      if (!client) {
        console.log(chalk.yellow('  Not configured'));
        return;
      }

      const diff = await client.diff(dopplerSecrets);

      if (diff.toAdd.length === 0 && diff.toUpdate.length === 0 && diff.toRemove.length === 0) {
        console.log(chalk.green('  ✓ In sync'));
        return;
      }

      for (const key of diff.toAdd) {
        console.log(chalk.green(`  + ${key}`));
      }
      for (const key of diff.toUpdate) {
        console.log(chalk.yellow(`  ~ ${key}`));
      }
      for (const key of diff.toRemove) {
        console.log(chalk.red(`  - ${key}`));
      }
      break;
    }

    case 'cloudflare': {
      const client = clients.cloudflare;
      if (!client) {
        console.log(chalk.yellow('  Not configured'));
        return;
      }

      const diff = await client.diff(dopplerSecrets);

      if (diff.toAdd.length === 0 && diff.toRemove.length === 0) {
        console.log(chalk.green('  ✓ In sync (cannot detect value changes)'));
        return;
      }

      for (const key of diff.toAdd) {
        console.log(chalk.green(`  + ${key}`));
      }
      for (const key of diff.existing) {
        console.log(chalk.gray(`  = ${key} (value unknown)`));
      }
      for (const key of diff.toRemove) {
        console.log(chalk.red(`  - ${key}`));
      }
      break;
    }

    default:
      console.log(chalk.yellow(`  Platform ${platform} not yet supported`));
  }
}
```

**Step 8: Commit**

```bash
git add packages/cli/src/
git commit -m "feat(cli): add all core commands (init, sync, status, run, diff)"
```

---

## Task 9: Install Dependencies, Build, and Test

**Step 1: Install pnpm if needed**

Run: `which pnpm || npm install -g pnpm`

**Step 2: Install dependencies**

Run: `pnpm install`

**Step 3: Build CLI**

Run: `pnpm build`
Expected: Clean build with no errors

**Step 4: Test CLI locally**

Run: `./packages/cli/dist/index.js --help`
Expected: Shows help with all commands

**Step 5: Run unit tests**

Run: `pnpm test`
Expected: All tests pass

**Step 6: Commit lockfile**

```bash
git add pnpm-lock.yaml
git commit -m "chore: add pnpm lockfile"
```

---

## Task 10: Update Documentation

**Files:**
- Update: `README.md`
- Create: `packages/cli/README.md`

**Step 1: Update root README.md**

**Step 2: Create packages/cli/README.md**

**Step 3: Commit**

```bash
git add README.md packages/cli/README.md
git commit -m "docs: add README files for CLI"
```

---

## Summary

Phase 1 delivers:

- **Config system**: `dcs.yaml` with schema validation and env interpolation
- **Platform adapters**: Doppler, Firebase, Cloudflare (using execFileSync for security)
- **CLI commands**: `init`, `sync`, `status`, `run`, `diff`
- **Test coverage**: Unit tests for config and platforms

Total: 10 tasks
