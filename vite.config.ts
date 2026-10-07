import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';
  const isAIS = process.env.DISABLE_HMR === 'true';
  const shouldDisableHMR = isProduction || isAIS;

  return {
    plugins: [react(), tailwindcss()],
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      sourcemap: false,       // ⭐ debug
      minify: true,         // ⭐ debug
      chunkSizeWarningLimit: 3500,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return;
            if (
              id.includes('/react/') ||
              id.includes('/react-dom/') ||
              id.includes('/react-is/') ||
              id.includes('/scheduler/') ||
              id.includes('/use-sync-external-store/')
            ) {
              return 'react-vendor';
            }
            if (id.includes('/firebase/') || id.includes('/@firebase/')) {
              return 'firebase-vendor';
            }
            if (id.includes('/recharts/') || id.includes('/d3-')) {
              return 'charts-vendor';
            }
            if (id.includes('/lucide-react/')) {
              return 'icons-vendor';
            }
            if (id.includes('/date-fns/') || id.includes('/dayjs/')) {
              return 'date-vendor';
            }
          },
        },
      },
    },
    resolve: {
      // ⭐ KEY FIX: React family ကို single file အဖြစ် force
      alias: [
        { find: /^react$/, replacement: path.resolve(__dirname, 'node_modules/react/index.js') },
        { find: /^react\/jsx-runtime$/, replacement: path.resolve(__dirname, 'node_modules/react/jsx-runtime.js') },
        { find: /^react\/jsx-dev-runtime$/, replacement: path.resolve(__dirname, 'node_modules/react/jsx-dev-runtime.js') },
        { find: /^react-dom$/, replacement: path.resolve(__dirname, 'node_modules/react-dom/index.js') },
        { find: /^react-dom\/client$/, replacement: path.resolve(__dirname, 'node_modules/react-dom/client.js') },
        { find: /^react-dom\/server$/, replacement: path.resolve(__dirname, 'node_modules/react-dom/server.js') },
        { find: /^scheduler$/, replacement: path.resolve(__dirname, 'node_modules/scheduler/index.js') },
        { find: /^react-is$/, replacement: path.resolve(__dirname, 'node_modules/react-is/index.js') },
        { find: '@', replacement: path.resolve(__dirname, '.') },
      ],
      dedupe: [
        'react',
        'react-dom',
        'react-is',
        'scheduler',
        'use-sync-external-store',
      ],
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
        'react-is',
        'scheduler',
        'recharts',
        'use-sync-external-store',
      ],
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      hmr: shouldDisableHMR ? false : {},
      watch: shouldDisableHMR
        ? null
        : {
            awaitWriteFinish: { stabilityThreshold: 1000, pollInterval: 100 },
            usePolling: false,
          },
    },
  };
});