import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchFromDoppler, fetchFromEnv } from '../src/fetcher.js';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('fetcher', () => {
  describe('fetchFromDoppler', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      process.env.DOPPLER_TOKEN = 'env-token';
      process.env.DOPPLER_PROJECT = 'env-project';
      process.env.DOPPLER_CONFIG = 'env-config';
    });

    afterEach(() => {
      delete process.env.DOPPLER_TOKEN;
      delete process.env.DOPPLER_PROJECT;
      delete process.env.DOPPLER_CONFIG;
    });

    it('should fetch secrets from Doppler API', async () => {
      const mockSecrets = { API_KEY: 'secret-key', DB_URL: 'postgres://' };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSecrets),
      });

      const secrets = await fetchFromDoppler({
        source: 'doppler',
        token: 'my-token',
        project: 'my-project',
        config: 'dev',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('api.doppler.com'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: 'Bearer my-token',
          }),
        })
      );
      expect(secrets).toEqual(mockSecrets);
    });

    it('should use environment variables when config not provided', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ KEY: 'value' }),
      });

      await fetchFromDoppler({ source: 'doppler' });

      const url = mockFetch.mock.calls[0][0];
      expect(url).toContain('project=env-project');
      expect(url).toContain('config=env-config');
      expect(mockFetch.mock.calls[0][1].headers.Authorization).toBe('Bearer env-token');
    });

    it('should throw when token is missing', async () => {
      delete process.env.DOPPLER_TOKEN;

      await expect(fetchFromDoppler({
        source: 'doppler',
        project: 'proj',
        config: 'cfg',
      })).rejects.toThrow('Doppler token required');
    });

    it('should throw when project is missing', async () => {
      delete process.env.DOPPLER_PROJECT;

      await expect(fetchFromDoppler({
        source: 'doppler',
        token: 'token',
        config: 'cfg',
      })).rejects.toThrow('project and config required');
    });

    it('should throw when config is missing', async () => {
      delete process.env.DOPPLER_CONFIG;

      await expect(fetchFromDoppler({
        source: 'doppler',
        token: 'token',
        project: 'proj',
      })).rejects.toThrow('project and config required');
    });

    it('should include keys filter in request', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ API_KEY: 'value' }),
      });

      await fetchFromDoppler({
        source: 'doppler',
        token: 'token',
        project: 'proj',
        config: 'cfg',
        keys: ['API_KEY', 'DB_URL'],
      });

      const url = mockFetch.mock.calls[0][0];
      expect(url).toContain('keys=API_KEY%2CDB_URL'); // URL-encoded comma
    });

    it('should throw on API error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        text: () => Promise.resolve('Unauthorized'),
      });

      await expect(fetchFromDoppler({
        source: 'doppler',
        token: 'bad-token',
        project: 'proj',
        config: 'cfg',
      })).rejects.toThrow('Doppler API error (401)');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(fetchFromDoppler({
        source: 'doppler',
        token: 'token',
        project: 'proj',
        config: 'cfg',
      })).rejects.toThrow('Network error');
    });
  });

  describe('fetchFromEnv', () => {
    beforeEach(() => {
      // Set up some test env vars
      process.env.API_KEY = 'env-api-key';
      process.env.DATABASE_URL = 'postgres://localhost';
      process.env.SECRET_TOKEN = 'secret123';
      process.env.lowercase_var = 'should-be-ignored';
    });

    afterEach(() => {
      delete process.env.API_KEY;
      delete process.env.DATABASE_URL;
      delete process.env.SECRET_TOKEN;
      delete process.env.lowercase_var;
    });

    it('should return specified keys from environment', () => {
      const secrets = fetchFromEnv({
        source: 'env',
        keys: ['API_KEY', 'DATABASE_URL'],
      });

      expect(secrets).toEqual({
        API_KEY: 'env-api-key',
        DATABASE_URL: 'postgres://localhost',
      });
    });

    it('should ignore missing keys', () => {
      const secrets = fetchFromEnv({
        source: 'env',
        keys: ['API_KEY', 'MISSING_KEY'],
      });

      expect(secrets).toEqual({
        API_KEY: 'env-api-key',
      });
      expect(secrets.MISSING_KEY).toBeUndefined();
    });

    it('should return all uppercase env vars when no keys specified', () => {
      const secrets = fetchFromEnv({ source: 'env' });

      expect(secrets.API_KEY).toBe('env-api-key');
      expect(secrets.DATABASE_URL).toBe('postgres://localhost');
      expect(secrets.lowercase_var).toBeUndefined();
    });

    it('should filter to uppercase with underscores pattern', () => {
      process.env.VALID_KEY = 'valid';
      process.env['123INVALID'] = 'invalid';
      process.env['invalid-key'] = 'invalid';

      const secrets = fetchFromEnv({ source: 'env' });

      expect(secrets.VALID_KEY).toBe('valid');
      expect(secrets['123INVALID']).toBeUndefined();
      expect(secrets['invalid-key']).toBeUndefined();

      delete process.env.VALID_KEY;
      delete process.env['123INVALID'];
      delete process.env['invalid-key'];
    });

    it('should handle empty keys array', () => {
      const secrets = fetchFromEnv({
        source: 'env',
        keys: [],
      });

      // Empty keys means get all uppercase vars
      expect(secrets.API_KEY).toBe('env-api-key');
    });
  });
});
