import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadConfig, findConfigFile } from '../../src/config/loader.js';
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

  it('should throw on invalid YAML syntax', async () => {
    const invalidYaml = `
project: test-app
doppler:
  project: test-app
  configs:
    dev: dev
    invalid yaml here: [unclosed bracket
`;
    writeFileSync(join(testDir, 'dcs.yaml'), invalidYaml);

    await expect(loadConfig(testDir)).rejects.toThrow();
  });

  it('should throw on schema validation failure - missing required field', async () => {
    const configContent = `
project: test-app
platforms: {}
`;
    writeFileSync(join(testDir, 'dcs.yaml'), configContent);

    await expect(loadConfig(testDir)).rejects.toThrow();
  });

  it('should throw on schema validation failure - invalid type', async () => {
    const configContent = `
project: 12345
doppler:
  project: test-app
  configs:
    dev: dev
platforms: {}
`;
    writeFileSync(join(testDir, 'dcs.yaml'), configContent);

    // Zod coerces numbers to strings, so this should actually work
    // Let's test with an invalid nested structure instead
    const invalidConfig = `
project: test-app
doppler:
  project: test-app
  configs: "not-an-object"
platforms: {}
`;
    writeFileSync(join(testDir, 'dcs.yaml'), invalidConfig);

    await expect(loadConfig(testDir)).rejects.toThrow();
  });

  it('should throw when environment variable is not set', async () => {
    delete process.env.UNDEFINED_VAR;
    const configContent = `
project: test-app
doppler:
  project: test-app
  configs:
    dev: dev
platforms:
  firebase:
    project_id: \${UNDEFINED_VAR}
`;
    writeFileSync(join(testDir, 'dcs.yaml'), configContent);

    await expect(loadConfig(testDir)).rejects.toThrow('Environment variable UNDEFINED_VAR is not set');
  });
});

describe('findConfigFile', () => {
  let testDir: string;
  let nestedDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `dcs-test-${Date.now()}`);
    nestedDir = join(testDir, 'a', 'b', 'c');
    mkdirSync(nestedDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('should find config in current directory', () => {
    const configContent = `
project: test-app
doppler:
  project: test-app
  configs:
    dev: dev
platforms: {}
`;
    writeFileSync(join(testDir, 'dcs.yaml'), configContent);

    const result = findConfigFile(testDir);
    expect(result).toBe(join(testDir, 'dcs.yaml'));
  });

  it('should find config in parent directory', () => {
    const configContent = `
project: test-app
doppler:
  project: test-app
  configs:
    dev: dev
platforms: {}
`;
    writeFileSync(join(testDir, 'dcs.yaml'), configContent);

    const result = findConfigFile(nestedDir);
    expect(result).toBe(join(testDir, 'dcs.yaml'));
  });

  it('should return null when no config found', () => {
    const result = findConfigFile(nestedDir);
    expect(result).toBeNull();
  });
});
