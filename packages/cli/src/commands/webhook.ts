/**
 * Doppler webhook management
 *
 * Doppler can send webhooks when secrets change. This command helps:
 * - Set up webhooks in Doppler
 * - Provide a local server for testing
 * - Generate handler code for deployment
 */

import type { Command } from 'commander';
import { createServer, type IncomingMessage, type ServerResponse } from 'http';
import { createHmac } from 'crypto';
import { execFileSync } from 'child_process';

interface DopplerWebhookPayload {
  project: string;
  config: string;
  environment?: string;
  type: 'secrets.update';
  timestamp: string;
}

/**
 * Verify Doppler webhook signature
 */
function verifySignature(payload: string, signature: string, secret: string): boolean {
  const expected = createHmac('sha256', secret).update(payload).digest('hex');
  return signature === `sha256=${expected}`;
}

/**
 * Handle incoming webhook by running dcs sync
 */
async function handleWebhook(
  payload: DopplerWebhookPayload,
  options: { platforms?: string[]; quiet?: boolean }
): Promise<void> {
  if (!options.quiet) {
    console.log(`[webhook] Received update for ${payload.project}/${payload.config}`);
  }

  try {
    // Run dcs sync command
    const args = ['sync'];
    if (options.quiet) args.push('--quiet');
    if (options.platforms?.length === 1) {
      args.push(options.platforms[0]);
    }

    if (!options.quiet) {
      console.log(`[webhook] Running: dcs ${args.join(' ')}`);
    }

    execFileSync('dcs', args, { stdio: options.quiet ? 'ignore' : 'inherit' });

    if (!options.quiet) {
      console.log('[webhook] Sync completed');
    }
  } catch (error) {
    console.error('[webhook] Sync failed:', error);
  }
}

export function registerWebhookCommand(program: Command): void {
  const webhook = program
    .command('webhook')
    .description('Manage Doppler webhooks for automatic sync');

  webhook
    .command('serve')
    .description('Start a local webhook server for testing')
    .option('-p, --port <port>', 'Port to listen on', '3456')
    .option('-s, --secret <secret>', 'Webhook signing secret (optional)')
    .option('--platforms <platforms>', 'Comma-separated platforms to sync')
    .action((options) => {
      const port = parseInt(options.port, 10);
      const secret = options.secret || process.env.DOPPLER_WEBHOOK_SECRET;
      const platforms = options.platforms?.split(',').map((p: string) => p.trim());

      const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
        // Health check
        if (req.method === 'GET' && req.url === '/health') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'ok' }));
          return;
        }

        // Only accept POST to /webhook
        if (req.method !== 'POST' || req.url !== '/webhook') {
          res.writeHead(404);
          res.end('Not Found');
          return;
        }

        // Read body
        let body = '';
        req.on('data', (chunk) => {
          body += chunk.toString();
        });

        req.on('end', async () => {
          // Verify signature if secret is configured
          if (secret) {
            const signature = req.headers['x-doppler-signature'] as string;
            if (!signature || !verifySignature(body, signature, secret)) {
              console.error('[webhook] Invalid signature');
              res.writeHead(401);
              res.end('Invalid signature');
              return;
            }
          }

          try {
            const payload = JSON.parse(body) as DopplerWebhookPayload;

            // Respond immediately
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ received: true }));

            // Process webhook asynchronously
            await handleWebhook(payload, { platforms, quiet: false });
          } catch (error) {
            console.error('[webhook] Error processing webhook:', error);
            res.writeHead(400);
            res.end('Invalid payload');
          }
        });
      });

      server.listen(port, () => {
        console.log(`Doppler webhook server listening on port ${port}`);
        console.log('');
        console.log('Endpoints:');
        console.log(`  POST http://localhost:${port}/webhook - Receive Doppler webhooks`);
        console.log(`  GET  http://localhost:${port}/health  - Health check`);
        console.log('');
        if (secret) {
          console.log('Signature verification: enabled');
        } else {
          console.log('Signature verification: disabled (set --secret or DOPPLER_WEBHOOK_SECRET)');
        }
        console.log('');
        console.log('To expose locally for testing, use:');
        console.log(`  ngrok http ${port}`);
        console.log('');
        console.log('Press Ctrl+C to stop');
      });
    });

  webhook
    .command('handler')
    .description('Generate webhook handler code for deployment')
    .option('--platform <platform>', 'Target platform (cloudflare, firebase, express)', 'express')
    .action((options) => {
      const handlers: Record<string, string> = {
        express: `
// Express webhook handler for Doppler
// Add to your Express app

import { createHmac } from 'crypto';
import { execFileSync } from 'child_process';

function verifySignature(payload, signature, secret) {
  const expected = createHmac('sha256', secret).update(payload).digest('hex');
  return signature === \`sha256=\${expected}\`;
}

app.post('/webhook/doppler', express.raw({ type: 'application/json' }), (req, res) => {
  const secret = process.env.DOPPLER_WEBHOOK_SECRET;

  if (secret) {
    const signature = req.headers['x-doppler-signature'];
    if (!verifySignature(req.body.toString(), signature, secret)) {
      return res.status(401).send('Invalid signature');
    }
  }

  // Respond immediately
  res.json({ received: true });

  // Sync secrets in background
  try {
    execFileSync('dcs', ['sync', '--quiet']);
    console.log('Secrets synced successfully');
  } catch (error) {
    console.error('Failed to sync secrets:', error);
  }
});
`.trim(),

        cloudflare: `
// Cloudflare Worker webhook handler for Doppler

export default {
  async fetch(request, env) {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const body = await request.text();
    const secret = env.DOPPLER_WEBHOOK_SECRET;

    if (secret) {
      const signature = request.headers.get('x-doppler-signature');
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
      const expected = 'sha256=' + Array.from(new Uint8Array(sig))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      if (signature !== expected) {
        return new Response('Invalid signature', { status: 401 });
      }
    }

    const payload = JSON.parse(body);
    console.log('Received Doppler webhook:', payload.project, payload.config);

    // Trigger your sync logic here
    // For Cloudflare, you might use a Queue or Durable Object

    return Response.json({ received: true });
  }
};
`.trim(),

        firebase: `
// Firebase Cloud Function webhook handler for Doppler

import { onRequest } from 'firebase-functions/v2/https';
import { createHmac } from 'crypto';
import { execFileSync } from 'child_process';

function verifySignature(payload, signature, secret) {
  const expected = createHmac('sha256', secret).update(payload).digest('hex');
  return signature === \`sha256=\${expected}\`;
}

export const dopplerWebhook = onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('Method not allowed');
    return;
  }

  const secret = process.env.DOPPLER_WEBHOOK_SECRET;
  const body = JSON.stringify(req.body);

  if (secret) {
    const signature = req.headers['x-doppler-signature'];
    if (!verifySignature(body, signature, secret)) {
      res.status(401).send('Invalid signature');
      return;
    }
  }

  const payload = req.body;
  console.log('Received Doppler webhook:', payload.project, payload.config);

  // Respond immediately
  res.json({ received: true });

  // Note: In Firebase, you might want to use a Cloud Task or Pub/Sub
  // for long-running sync operations
});
`.trim(),
      };

      const handler = handlers[options.platform];
      if (!handler) {
        console.error(`Unknown platform: ${options.platform}`);
        console.log('Available platforms: express, cloudflare, firebase');
        process.exit(1);
      }

      console.log(`// Webhook handler for ${options.platform}`);
      console.log('// Copy this code to your project\n');
      console.log(handler);
    });

  webhook
    .command('info')
    .description('Show webhook configuration info')
    .action(() => {
      console.log('Doppler Webhook Setup\n');
      console.log('1. Go to Doppler Dashboard > Project > Webhooks');
      console.log('2. Click "Add Webhook"');
      console.log('3. Configure:');
      console.log('   - URL: Your endpoint (e.g., https://api.example.com/webhook/doppler)');
      console.log('   - Secret: Generate a random string for signature verification');
      console.log('   - Events: Select "Secret Update"');
      console.log('');
      console.log('4. Set the secret in your environment:');
      console.log('   export DOPPLER_WEBHOOK_SECRET="your-secret"');
      console.log('');
      console.log('For local testing:');
      console.log('   dcs webhook serve --port 3456');
      console.log('   ngrok http 3456');
      console.log('');
      console.log('Generate handler code:');
      console.log('   dcs webhook handler --platform express');
      console.log('   dcs webhook handler --platform cloudflare');
      console.log('   dcs webhook handler --platform firebase');
    });
}
