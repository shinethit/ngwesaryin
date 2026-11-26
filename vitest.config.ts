import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    // [v7.6.52] Mirror vite.config.ts: '@' is the repo root, so tests
    // can import modules that use '@/firebase-applet-config.json'.
    alias: [{ find: '@', replacement: path.resolve(__dirname, '.') }],
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/__tests__/**/*.test.ts'],
    globals: false,
  },
});
