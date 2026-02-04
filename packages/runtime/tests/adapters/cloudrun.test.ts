import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  initSecrets,
  getSecret,
  requireSecret,
  getAllSecrets,
  isInitialized,
  reset,
} from '../../src/adapters/cloudrun.js';
import { clearSecretsCache } from '../../src/core.js';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('cloudrun adapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    reset();
    clearSecretsCache(); // Also clear core cache

    process.env.DOPPLER_TOKEN = 'test-token';
    process.env.DOPPLER_PROJECT = 'test-project';
    process.env.DOPPLER_CONFIG = 'dev';
  });

  afterEach(() => {
    delete process.env.DOPPLER_TOKEN;
    delete process.env.DOPPLER_PROJECT;
    delete process.env.DOPPLER_CONFIG;
  });

  describe('initSecrets', () => {
    it('should initialize and load secrets', async () => {
      const mockSecrets = { API_KEY: 'secret', DB_URL: 'postgres://' };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSecrets),
      });

      await initSecrets();

      expect(isInitialized()).toBe(true);
      expect(getAllSecrets()).toEqual(mockSecrets);
    });

    it('should not reinitialize on subsequent calls', async () => {
      const mockSecrets = { API_KEY: 'secret' };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSecrets),
      });

      await initSecrets();
      await initSecrets();
      await initSecrets();

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('getSecret', () => {
    it('should return secret value', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ API_KEY: 'my-key' }),
      });

      await initSecrets();

      expect(getSecret('API_KEY')).toBe('my-key');
    });

    it('should return undefined for missing key', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ API_KEY: 'my-key' }),
      });

      await initSecrets();

      expect(getSecret('MISSING_KEY')).toBeUndefined();
    });

    it('should throw if not initialized', () => {
      expect(() => getSecret('API_KEY')).toThrow('not initialized');
    });
  });

  describe('requireSecret', () => {
    it('should return secret value', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ API_KEY: 'my-key' }),
      });

      await initSecrets();

      expect(requireSecret('API_KEY')).toBe('my-key');
    });

    it('should throw for missing key', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ API_KEY: 'my-key' }),
      });

      await initSecrets();

      expect(() => requireSecret('MISSING')).toThrow("'MISSING' not found");
    });
  });
});
