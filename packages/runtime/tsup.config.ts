import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/adapters/firebase.ts',
    'src/adapters/cloudflare.ts',
    'src/adapters/cloudrun.ts',
  ],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  target: 'node18',
  splitting: false,
  external: ['firebase-functions', 'firebase-admin'],
});
