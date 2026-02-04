import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('firebase adapter', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();

    // Set up env for Doppler fetching
    process.env.DOPPLER_TOKEN = 'test-token';
    process.env.DOPPLER_PROJECT = 'test-project';
    process.env.DOPPLER_CONFIG = 'dev';
  });

  afterEach(() => {
    vi.resetModules();
    delete process.env.DOPPLER_TOKEN;
    delete process.env.DOPPLER_PROJECT;
    delete process.env.DOPPLER_CONFIG;
  });

  describe('withSecrets', () => {
    it('should wrap handler and inject secrets', async () => {
      const mockSecrets = { API_KEY: 'secret-key', DATABASE_URL: 'postgres://' };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSecrets),
      });

      const firebaseModule = await import('../../src/adapters/firebase.js');
      const handler = vi.fn();
      const wrapped = firebaseModule.withSecrets({ keys: ['API_KEY'], prefetch: false }, handler);

      const mockReq = {} as Request;
      const mockRes = {} as Response;

      await wrapped(mockReq, mockRes);

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ API_KEY: 'secret-key' }),
        mockReq,
        mockRes
      );
    });

    it('should filter secrets to requested keys', async () => {
      const mockSecrets = { API_KEY: 'key', SECRET_A: 'a', SECRET_B: 'b' };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSecrets),
      });

      const firebaseModule = await import('../../src/adapters/firebase.js');
      const handler = vi.fn();
      const wrapped = firebaseModule.withSecrets({ keys: ['API_KEY', 'SECRET_A'], prefetch: false }, handler);

      await wrapped({} as Request, {} as Response);

      const calledSecrets = handler.mock.calls[0][0];
      expect(calledSecrets).toEqual({ API_KEY: 'key', SECRET_A: 'a' });
      expect(calledSecrets.SECRET_B).toBeUndefined();
    });

    it('should use prefetched secrets on subsequent calls', async () => {
      const mockSecrets = { API_KEY: 'key' };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSecrets),
      });

      const firebaseModule = await import('../../src/adapters/firebase.js');
      const handler = vi.fn();
      const wrapped = firebaseModule.withSecrets({ keys: ['API_KEY'] }, handler);

      // Wait for prefetch to complete
      await new Promise(resolve => setTimeout(resolve, 10));

      // Multiple calls
      await wrapped({} as Request, {} as Response);
      await wrapped({} as Request, {} as Response);
      await wrapped({} as Request, {} as Response);

      // Should only fetch once (prefetch)
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledTimes(3);
    });
  });

  describe('withSecretsCallable', () => {
    it('should wrap callable handler and inject secrets', async () => {
      const mockSecrets = { API_KEY: 'key' };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSecrets),
      });

      const firebaseModule = await import('../../src/adapters/firebase.js');
      const handler = vi.fn().mockResolvedValue({ result: 'ok' });
      const wrapped = firebaseModule.withSecretsCallable({ keys: ['API_KEY'], prefetch: false }, handler);

      const result = await wrapped({ input: 'data' }, { auth: {} });

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ API_KEY: 'key' }),
        { input: 'data' },
        { auth: {} }
      );
      expect(result).toEqual({ result: 'ok' });
    });
  });

  describe('prefetchSecrets', () => {
    it('should prefetch secrets at module load', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ API_KEY: 'key' }),
      });

      const firebaseModule = await import('../../src/adapters/firebase.js');
      firebaseModule.prefetchSecrets({ keys: ['API_KEY'] });

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('getPrefetchedSecrets', () => {
    it('should throw if secrets not prefetched', async () => {
      const firebaseModule = await import('../../src/adapters/firebase.js');
      expect(() => firebaseModule.getPrefetchedSecrets()).toThrow('not yet prefetched');
    });

    it('should return prefetched secrets', async () => {
      const mockSecrets = { API_KEY: 'key' };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSecrets),
      });

      const firebaseModule = await import('../../src/adapters/firebase.js');
      firebaseModule.prefetchSecrets({ keys: ['API_KEY'] });
      await firebaseModule.waitForSecrets();

      expect(firebaseModule.getPrefetchedSecrets()).toEqual(mockSecrets);
    });
  });

  describe('waitForSecrets', () => {
    it('should throw if no prefetch in progress', async () => {
      const firebaseModule = await import('../../src/adapters/firebase.js');
      await expect(firebaseModule.waitForSecrets()).rejects.toThrow('No prefetch in progress');
    });

    it('should wait for prefetch to complete', async () => {
      const mockSecrets = { API_KEY: 'key' };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSecrets),
      });

      const firebaseModule = await import('../../src/adapters/firebase.js');
      firebaseModule.prefetchSecrets();

      const secrets = await firebaseModule.waitForSecrets();
      expect(secrets).toEqual(mockSecrets);
    });
  });
});
