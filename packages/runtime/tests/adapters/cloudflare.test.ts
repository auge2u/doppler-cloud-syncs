import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('cloudflare adapter', () => {
  const mockEnv = {
    DOPPLER_TOKEN: 'test-token',
    DOPPLER_PROJECT: 'test-project',
    DOPPLER_CONFIG: 'dev',
  };

  const mockCtx = {
    waitUntil: vi.fn(),
    passThroughOnException: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe('withSecrets', () => {
    it('should wrap worker and inject secrets to fetch handler', async () => {
      const mockSecrets = { API_KEY: 'secret-key' };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSecrets),
      });

      const cfModule = await import('../../src/adapters/cloudflare.js');
      const fetchHandler = vi.fn().mockResolvedValue(new Response('OK'));
      const worker = cfModule.withSecrets({ keys: ['API_KEY'] }, {
        fetch: fetchHandler,
      });

      const mockRequest = new Request('https://example.com');
      await worker.fetch(mockRequest, mockEnv, mockCtx);

      expect(fetchHandler).toHaveBeenCalledWith(
        mockRequest,
        mockEnv,
        expect.objectContaining({ API_KEY: 'secret-key' }),
        mockCtx
      );
    });

    it('should cache secrets between requests', async () => {
      const mockSecrets = { API_KEY: 'key' };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSecrets),
      });

      const cfModule = await import('../../src/adapters/cloudflare.js');
      const fetchHandler = vi.fn().mockResolvedValue(new Response('OK'));
      const worker = cfModule.withSecrets({ cache: { ttl: 300 } }, {
        fetch: fetchHandler,
      });

      const request = new Request('https://example.com');

      await worker.fetch(request, mockEnv, mockCtx);
      await worker.fetch(request, mockEnv, mockCtx);
      await worker.fetch(request, mockEnv, mockCtx);

      // Should only fetch secrets once
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(fetchHandler).toHaveBeenCalledTimes(3);
    });

    it('should refresh cache after TTL expires', async () => {
      const mockSecrets = { API_KEY: 'key' };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSecrets),
      });
      vi.useFakeTimers();

      const cfModule = await import('../../src/adapters/cloudflare.js');
      const fetchHandler = vi.fn().mockResolvedValue(new Response('OK'));
      const worker = cfModule.withSecrets({ cache: { ttl: 10 } }, {
        fetch: fetchHandler,
      });

      const request = new Request('https://example.com');

      await worker.fetch(request, mockEnv, mockCtx);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Advance past TTL
      vi.advanceTimersByTime(11 * 1000);

      await worker.fetch(request, mockEnv, mockCtx);
      expect(mockFetch).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });

    it('should pass env bindings to fetch request', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ API_KEY: 'key' }),
      });

      const cfModule = await import('../../src/adapters/cloudflare.js');
      const worker = cfModule.withSecrets({}, {
        fetch: vi.fn().mockResolvedValue(new Response('OK')),
      });

      await worker.fetch(new Request('https://example.com'), mockEnv, mockCtx);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('api.doppler.com'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      );
    });

    it('should handle scheduled events', async () => {
      const mockSecrets = { API_KEY: 'key' };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSecrets),
      });

      const cfModule = await import('../../src/adapters/cloudflare.js');
      const scheduledHandler = vi.fn();
      const worker = cfModule.withSecrets({}, {
        fetch: vi.fn().mockResolvedValue(new Response('OK')),
        scheduled: scheduledHandler,
      });

      const event = { cron: '0 0 * * *', scheduledTime: Date.now() };
      await worker.scheduled?.(event, mockEnv, mockCtx);

      expect(scheduledHandler).toHaveBeenCalledWith(
        event,
        mockEnv,
        expect.objectContaining({ API_KEY: 'key' }),
        mockCtx
      );
    });
  });

  describe('createFetchHandler', () => {
    it('should create a fetch handler function', async () => {
      const mockSecrets = { API_KEY: 'key' };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSecrets),
      });

      const cfModule = await import('../../src/adapters/cloudflare.js');
      const handler = vi.fn().mockResolvedValue(new Response('OK'));
      const fetchFn = cfModule.createFetchHandler({ keys: ['API_KEY'] }, handler);

      const request = new Request('https://example.com');
      await fetchFn(request, mockEnv, mockCtx);

      expect(handler).toHaveBeenCalledWith(
        request,
        mockEnv,
        expect.objectContaining({ API_KEY: 'key' }),
        mockCtx
      );
    });
  });

  describe('loadSecretsFromEnv', () => {
    it('should load secrets using env bindings', async () => {
      const mockSecrets = { API_KEY: 'key', DB_URL: 'postgres://' };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSecrets),
      });

      const cfModule = await import('../../src/adapters/cloudflare.js');
      const secrets = await cfModule.loadSecretsFromEnv(mockEnv);

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
  });
});
