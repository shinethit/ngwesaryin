import { ErrorBoundary } from './ErrorBoundary.tsx';
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { AuthProvider } from './context/AuthContext.tsx';
import './index.css';

// Global error catcher for any unhandled startup errors
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const msg = reason?.message || String(reason);
    if (
      msg.includes('resource-exhausted') ||
      msg.includes('Quota limit exceeded') ||
      reason?.code === 'resource-exhausted'
    ) {
      event.preventDefault();
      import('./lib/firebase')
        .then(({ pauseNetworkDueToQuota }) => {
          pauseNetworkDueToQuota();
        })
        .catch(() => {});
    }
  });

  window.addEventListener('error', (event) => {
    const msg = event.message || String(event.error);
    if (
      msg.includes('resource-exhausted') ||
      msg.includes('Quota limit exceeded')
    ) {
      event.preventDefault();
      import('./lib/firebase')
        .then(({ pauseNetworkDueToQuota }) => {
          pauseNetworkDueToQuota();
        })
        .catch(() => {});
      return;
    }
    console.error('Global window error:', event.error || event.message);
    const root = document.getElementById('root');
    if (root && (!root.innerHTML || root.innerHTML.trim() === '')) {
      root.innerHTML = `<div style="padding: 24px; font-family: sans-serif; color: #dc2626; background: #fef2f2; border: 1px solid #fecaca; margin: 20px; border-radius: 12px; max-width: 600px; margin: 40px auto; text-align: center;">
        <h3 style="margin-top:0; font-size: 18px; font-weight: bold;">App Startup Error</h3>
        <p style="font-size: 14px; color: #475569;">${event.message || 'Error initializing application'}</p>
        <button onclick="window.location.reload()" style="margin-top: 12px; padding: 8px 16px; background: #059669; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer;">Reload Application</button>
      </div>`;
    }
  });
}

// Register Service Worker with instant Auto-Update & Cache Refresh for Android / iOS
if (typeof window !== 'undefined' && 'serviceWorker' in navigator && !import.meta.env.DEV) {
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        console.log('ServiceWorker registered for offline mode:', reg.scope);

        // Check for updates on load
        reg.update().catch(() => {});

        // If a new worker is already waiting, tell it to skip waiting immediately
        if (reg.waiting) {
          reg.waiting.postMessage('SKIP_WAITING');
        }

        // When a new worker is discovered installing
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                newWorker.postMessage('SKIP_WAITING');
              }
            });
          }
        });
      })
      .catch((err) => {
        console.warn('ServiceWorker registration error:', err);
      });

    // Check for updates whenever user returns to the app from background
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        navigator.serviceWorker.getRegistration().then((reg) => {
          reg?.update().catch(() => {});
        });
      }
    });
  });
}   // ← ⭐ FIX: SW if ကို ဒီမှာ ပိတ်လိုက်ပြီ (အရင် ဖိုင်အဆုံးမှာ ရောက်နေခဲ့တယ်)

// Auto Zoom-Out & Viewport Reset when typing finishes (input blur)
if (typeof window !== 'undefined') {
  document.addEventListener(
    'blur',
    (e) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT')
      ) {
        // Small timeout to allow mobile keyboard to dismiss cleanly
        setTimeout(() => {
          // Reset horizontal scroll shift
          if (window.scrollX !== 0) {
            window.scrollTo({ left: 0, top: window.scrollY, behavior: 'smooth' });
          }

          // Force viewport scale normalization to 1.0 (Auto Zoom Out)
          const metaViewport = document.querySelector('meta[name="viewport"]');
          if (metaViewport) {
            metaViewport.setAttribute(
              'content',
              'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, interactive-widget=resizes-content'
            );
          }
        }, 120);
      }
    },
    true
  );
}

const rootElement = document.getElementById('root');
if (rootElement) {
  try {
    const root = createRoot(rootElement);
    root.render(
      <StrictMode>
        <ErrorBoundary>
          <AuthProvider>
            <App />
          </AuthProvider>
        </ErrorBoundary>
      </StrictMode>,
    );
  } catch (err: any) {
    console.error('Failed to createRoot:', err);
    if (rootElement) {
      rootElement.innerHTML = `<div style="padding: 24px; font-family: sans-serif; color: #dc2626; background: #fef2f2; border: 1px solid #fecaca; margin: 20px; border-radius: 12px; max-width: 600px; margin: 40px auto; text-align: center;">
        <h3 style="margin-top:0; font-size: 18px; font-weight: bold;">Rendering Error</h3>
        <p style="font-size: 14px; color: #475569;">${err?.message || 'Error mounting React root'}</p>
        <button onclick="window.location.reload()" style="margin-top: 12px; padding: 8px 16px; background: #059669; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer;">Reload Application</button>
      </div>`;
    }
  }
}