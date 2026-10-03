import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, splitVendorChunkPlugin } from 'vite';

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';
  const isAIS = process.env.DISABLE_HMR === 'true';
  const shouldDisableHMR = isProduction || isAIS;

  return {
    plugins: [
      react(),
      tailwindcss(),
      splitVendorChunkPlugin(),
    ],
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      sourcemap: false,
      chunkSizeWarningLimit: 3500,
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom'],
            'firebase-vendor': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
            'chart-vendor': ['recharts'],
          },
        },
      },
    },
    resolve: {
      dedupe: ['react', 'react-dom'],
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    optimizeDeps: {
      include: ['react', 'react-dom'],
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      hmr: shouldDisableHMR ? false : {},
      watch: shouldDisableHMR
        ? null
        : {
            awaitWriteFinish: {
              stabilityThreshold: 1000,
              pollInterval: 100,
            },
            usePolling: false,
          },
    },
  };
});
