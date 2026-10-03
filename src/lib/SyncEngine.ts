/**
 * SyncEngine.ts
 * Consolidation of snapshot subscription management and syncQueue processing.
 */

import { auth } from './firebase';
import { syncQueue } from './syncQueue';

export class SyncEngine {
  private static instance: SyncEngine;
  private unsubscribers: (() => void)[] = [];

  private constructor() {}

  public static getInstance(): SyncEngine {
    if (!SyncEngine.instance) {
      SyncEngine.instance = new SyncEngine();
    }
    return SyncEngine.instance;
  }

  public registerUnsubscriber(unsub: () => void) {
    this.unsubscribers.push(unsub);
  }

  public cleanup() {
    this.unsubscribers.forEach((unsub) => unsub());
    this.unsubscribers = [];
  }

  public triggerSync() {
    syncQueue.triggerImmediateProcess();
  }
  
  public getSyncQueueStatus() {
    return {
      pending: syncQueue.getPendingCount(),
      hasPending: syncQueue.hasPendingItems(),
    };
  }
}

export const syncEngine = SyncEngine.getInstance();
