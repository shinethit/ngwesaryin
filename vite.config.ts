import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

// [v7.6.34] Emit the full JS/CSS asset list (including lazy chunks)
// as dist/asset-manifest.json so the service worker can precache
// the COMPLETE build at install time. The app mounts every tab
// view (hidden) on boot, so every lazy chunk is imported on every
// boot — parsing index.html alone only covers the entry chunks,
// and a lazy chunk never visited online would 408 offline and
// trip the ErrorBoundary. No new dependency: a plain Rollup hook.
function swAssetManifest() {
  return {
    name: 'ngwe-sw-asset-manifest',
    generateBundle(_options: any, bundle: any) {
      const assets = Object.keys(bundle)
        .filter((n) => n.endsWith('.js') || n.endsWith('.css'))
        .sort();
      this.emitFile({
        type: 'asset',
        fileName: 'asset-manifest.json',
        source: JSON.stringify(assets),
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';
  const isAIS = process.env.DISABLE_HMR === 'true';
  const shouldDisableHMR = isProduction || isAIS;

  return {
    plugins: [react(), tailwindcss(), swAssetManifest()],
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