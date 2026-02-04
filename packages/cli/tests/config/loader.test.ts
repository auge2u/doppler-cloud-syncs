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
