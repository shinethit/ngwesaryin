import * as React from 'react';

/**
 * Retry dynamic script imports on network glitch or post-deploy chunk mismatch.
 * On second failure, forces a full reload (once per 30s) then throws.
 */
export function lazyWithRetry<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>
): React.LazyExoticComponent<T> {
  return React.lazy(async () => {
    try {
      return await factory();
    } catch (error: any) {
      console.warn('Module import error, retrying once...', error);
      try {
        await new Promise((resolve) => setTimeout(resolve, 800));
        return await factory();
      } catch (retryError) {
        const lastReload = sessionStorage.getItem('chunk_reload_attempted_at');
        const now = Date.now();
        if (!lastReload || now - Number(lastReload) > 30000) {
          sessionStorage.setItem('chunk_reload_attempted_at', String(now));
          window.location.reload();
        }
        throw retryError;
      }
    }
  });
}
