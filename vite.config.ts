import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';
  const isAIS = process.env.DISABLE_HMR === 'true';
  const shouldDisableHMR = isProduction || isAIS;

  return {
    plugins: [
      react(),
      tailwindcss(),
      // ❌ splitVendorChunkPlugin() ဖြုတ်လိုက်ပြီ — manualChunks နဲ့ ရှုပ်နေတယ်
    ],
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      sourcemap: false,
      chunkSizeWarningLimit: 3500,
      rollupOptions: {
        output: {
          // Function form — module path အလိုက် ခွဲ (object form ထက် ပိုတိကျ)
          manualChunks(id) {
            if (!id.includes('node_modules')) return;

            // ⭐ React family — တစ်ခုထဲသော chunk ဖြစ်ရမယ်
            if (
              id.includes('/react/') ||
              id.includes('/react-dom/') ||
              id.includes('/react-is/') ||
              id.includes('/scheduler/')
            ) {
              return 'react-vendor';
            }
            if (id.includes('/firebase/') || id.includes('/@firebase/')) {
              return 'firebase-vendor';
            }
            if (id.includes('/recharts/') || id.includes('/d3-')) {
              return 'chart-vendor';
            }
          },
        },
      },
    },
    resolve: {
      // ⭐ react-is နဲ့ scheduler ပါ ထည့်ပြီ — Error #321 ရဲ့ အဓိက fix
      dedupe: ['react', 'react-dom', 'react-is', 'scheduler'],
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-is', 'scheduler', 'recharts'],
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