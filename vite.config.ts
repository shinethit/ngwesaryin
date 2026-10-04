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
      sourcemap: false,
      chunkSizeWarningLimit: 3500,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return;

            // ⭐ React family + use-sync-external-store — တစ်ခုထဲသော chunk
            if (
              id.includes('/react/') ||
              id.includes('/react-dom/') ||
              id.includes('/react-is/') ||
              id.includes('/scheduler/') ||
              id.includes('/use-sync-external-store/')   // ⭐ NEW
            ) {
              return 'react-vendor';
            }

            if (id.includes('/firebase/') || id.includes('/@firebase/')) {
              return 'firebase-vendor';
            }

            // ⚠️ chart-vendor ကို လုံးဝ မဖန်တီးတော့ပါ
            // recharts ကို main bundle ထဲ ထားလိုက်ပါ
          },
        },
      },
    },
    resolve: {
      // ⭐ use-sync-external-store ကို dedupe ထည့်ပြီ
      dedupe: [
        'react',
        'react-dom',
        'react-is',
        'scheduler',
        'use-sync-external-store',
      ],
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
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