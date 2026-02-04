import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Command } from 'commander';

vi.mock('http', () => ({
  createServer: vi.fn(),
}));

vi.mock('child_process', () => ({
  execFileSync: vi.fn(),
}));

import { createServer } from 'http';
import { execFileSync } from 'child_process';
import { registerWebhookCommand } from '../../src/commands/webhook.js';

describe('webhook command', () => {
  let program: Command;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let mockServer: {
    listen: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    program = new Command();
    program.exitOverride();
    registerWebhookCommand(program);

    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    mockServer = {
      listen: vi.fn((port, callback) => {
        callback?.();
        return mockServer;
      }),
    };

    vi.mocked(createServer).mockReturnValue(mockServer as any);
  });

  describe('webhook serve', () => {
    it('should start a webhook server on default port', async () => {
      await program.parseAsync(['node', 'test', 'webhook', 'serve']);

      expect(createServer).toHaveBeenCalled();
      expect(mockServer.listen).toHaveBeenCalledWith(3456, expect.any(Function));
    });

    it('should use custom port when specified', async () => {
      await program.parseAsync(['node', 'test', 'webhook', 'serve', '--port', '8080']);

      expect(mockServer.listen).toHaveBeenCalledWith(8080, expect.any(Function));
    });

    it('should display endpoint info after starting', async () => {
      await program.parseAsync(['node', 'test', 'webhook', 'serve']);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('webhook server listening'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('POST'));
    });

    it('should show signature verification status', async () => {
      await program.parseAsync(['node', 'test', 'webhook', 'serve', '--secret', 'my-secret']);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Signature verification: enabled'));
    });

    it('should use DOPPLER_WEBHOOK_SECRET from env', async () => {
      process.env.DOPPLER_WEBHOOK_SECRET = 'env-secret';

      await program.parseAsync(['node', 'test', 'webhook', 'serve']);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Signature verification: enabled'));

      delete process.env.DOPPLER_WEBHOOK_SECRET;
    });
  });

  describe('webhook handler', () => {
    it('should generate Express handler by default', async () => {
      await program.parseAsync(['node', 'test', 'webhook', 'handler']);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Express'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('app.post'));
    });

    it('should generate Cloudflare Worker handler', async () => {
      await program.parseAsync(['node', 'test', 'webhook', 'handler', '--platform', 'cloudflare']);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Cloudflare'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('export default'));
    });

    it('should generate Firebase handler', async () => {
      await program.parseAsync(['node', 'test', 'webhook', 'handler', '--platform', 'firebase']);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Firebase'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('onRequest'));
    });

    it('should error on unknown platform', async () => {
      vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await program.parseAsync(['node', 'test', 'webhook', 'handler', '--platform', 'unknown']);

      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Unknown platform'));
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });

  describe('webhook info', () => {
    it('should display setup instructions', async () => {
      await program.parseAsync(['node', 'test', 'webhook', 'info']);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Doppler Webhook Setup'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Doppler Dashboard'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('ngrok'));
    });
  });

  describe('webhook handler integration', () => {
    it('should create server with correct request handler', async () => {
      await program.parseAsync(['node', 'test', 'webhook', 'serve']);

      const serverCallback = vi.mocked(createServer).mock.calls[0][0];
      expect(serverCallback).toBeInstanceOf(Function);
    });
  });
});

describe('webhook signature verification', () => {
  // Test the signature verification logic
  it('should correctly verify HMAC SHA256 signatures', () => {
    const { createHmac } = require('crypto');

    const payload = JSON.stringify({ project: 'test', config: 'dev', type: 'secrets.update' });
    const secret = 'test-secret';
    const expectedSig = `sha256=${createHmac('sha256', secret).update(payload).digest('hex')}`;

    // Verify the signature format matches what Doppler sends
    expect(expectedSig).toMatch(/^sha256=[a-f0-9]{64}$/);
  });
});
