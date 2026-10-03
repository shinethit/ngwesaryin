import { useState, useEffect } from 'react';
import { syncEngine } from '../lib/SyncEngine';

/**
 * Hook to manage cloud synchronization state and snapshot subscriptions.
 */
export function useCloudSync() {
  const [syncStatus, setSyncStatus] = useState({ isLoaded: false, pending: 0 });

  useEffect(() => {
    // Initial sync trigger
    syncEngine.triggerSync();

    // Listen to queue changes (if implemented in syncQueue)
    // For now, simple interval or subscription if needed
    const interval = setInterval(() => {
      const status = syncEngine.getSyncQueueStatus();
      setSyncStatus((prev) => ({
        ...prev,
        pending: status.pending,
      }));
    }, 5000);

    return () => {
      clearInterval(interval);
      syncEngine.cleanup();
    };
  }, []);

  return { isLoaded: syncStatus.isLoaded, syncStatus: syncStatus.pending > 0 ? 'syncing' : 'synced' };
}
