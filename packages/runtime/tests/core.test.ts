import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getSecrets, clearSecretsCache } from '../src/core.js';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('getSecrets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearSecretsCache();

    // Set up env vars
    process.env.DOPPLER_TOKEN = 'test-token';
    process.env.DOPPLER_PROJECT = 'test-project';
    process.env.DOPPLER_CONFIG = 'dev';
  });

  afterEach(() => {
    delete process.env.DOPPLER_TOKEN;
    delete process.env.DOPPLER_PROJECT;
    delete process.env.DOPPLER_CONFIG;
  });

  it('should fetch secrets from Doppler', async () => {
    const mockSecrets = { API_KEY: 'secret', DB_URL: 'postgres://...' };
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSecrets),
    });

    const secrets = await getSecrets();

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('api.doppler.com'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
        }),
      })
    );
    expect(secrets).toEqual(mockSecrets);
  });

  it('should use cached secrets on subsequent calls', async () => {
    const mockSecrets = { API_KEY: 'secret' };
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSecrets),
    });

    await getSecrets();
    await getSecrets();
    await getSecrets();

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('should filter to specific keys', async () => {
    const mockSecrets = { API_KEY: 'secret', DB_URL: 'postgres://', OTHER: 'value' };
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSecrets),
    });

    const secrets = await getSecrets({ keys: ['API_KEY', 'DB_URL'] });

    expect(secrets).toEqual({ API_KEY: 'secret', DB_URL: 'postgres://' });
    expect(secrets.OTHER).toBeUndefined();
  });

  it('should use env source when specified', async () => {
    process.env.MY_SECRET = 'from-env';

    const secrets = await getSecrets({
      source: 'env',
      keys: ['MY_SECRET'],
    });

    expect(mockFetch).not.toHaveBeenCalled();
    expect(secrets.MY_SECRET).toBe('from-env');

    delete process.env.MY_SECRET;
  });

  it('should fallback to env on Doppler error', async () => {
    process.env.API_KEY = 'fallback-key';
    mockFetch.mockRejectedValue(new Error('Network error'));

    const secrets = await getSecrets({
      keys: ['API_KEY'],
      fallback: 'env',
    });

    expect(secrets.API_KEY).toBe('fallback-key');

    delete process.env.API_KEY;
  });

  it('should throw when no fallback and Doppler fails', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    await expect(
      getSecrets({ fallback: 'none' })
    ).rejects.toThrow('Network error');
  });

  it('should skip cache when ttl is 0', async () => {
    const mockSecrets = { API_KEY: 'secret' };
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSecrets),
    });

    await getSecrets({ cache: { ttl: 0 } });
    await getSecrets({ cache: { ttl: 0 } });

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
