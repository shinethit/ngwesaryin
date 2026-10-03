import { Transaction } from '../types';
import { syncQueue } from '../lib/syncQueue';

export type TransactionSyncState = 'synced' | 'pending' | 'failed' | 'offline';

export interface TransactionSyncInfo {
  state: TransactionSyncState;
  labelMy: string;
  labelEn: string;
  badgeClass: string;
  iconName: string;
  errorMessage?: string;
  lastAttemptAt?: number;
}

export function getTransactionSyncStatus(
  tx: Transaction,
  cloudTxIds?: Set<string>
): TransactionSyncInfo {
  const isOnline = typeof navigator === 'undefined' || navigator.onLine;

  if (!isOnline) {
    return {
      state: 'offline',
      labelMy: '📴 အင်တာနက်မရှိ (Offline)',
      labelEn: '📴 Offline',
      badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
      iconName: 'WifiOff',
    };
  }

  // Check sync queue for explicit failure or pending status
  const queueItems = syncQueue.getQueue();
  const queueItem = queueItems.find(
    (q) => q.entityType === 'transactions' && q.entityId === tx.id
  );

  if (queueItem) {
    if (queueItem.status === 'failed') {
      return {
        state: 'failed',
        labelMy: '⚠️ DB error (မရောက်ပါ)',
        labelEn: '⚠️ DB Error',
        badgeClass: 'bg-rose-100 text-rose-900 border-rose-300 animate-pulse',
        iconName: 'AlertTriangle',
        errorMessage: queueItem.lastError || 'Unknown sync error (Quota or permission blocked)',
        lastAttemptAt: queueItem.lastAttemptAt,
      };
    }
    if (queueItem.status === 'pending' || queueItem.status === 'in_progress') {
      return {
        state: 'pending',
        labelMy: '⏳ Local (DB သို့ ပို့နေဆဲ)',
        labelEn: '⏳ Local Pending',
        badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
        iconName: 'Clock',
        errorMessage: 'Waiting in local sync queue to push to cloud database',
        lastAttemptAt: queueItem.lastAttemptAt,
      };
    }
  }

  // Check if confirmed in cloud database via cloudTxIds Set
  if (cloudTxIds && cloudTxIds.has(tx.id)) {
    return {
      state: 'synced',
      labelMy: '☁️ DB ထဲသို့ ရောက်ရှိပြီး',
      labelEn: '☁️ In DB (Synced)',
      badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300',
      iconName: 'CloudCheck',
    };
  }

  // Default fallback if not in cloudTxIds yet but no explicit error
  return {
    state: 'pending',
    labelMy: '⏳ Local (DB သို့ မရောက်သေး)',
    labelEn: '⏳ Local (Not in DB yet)',
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
    iconName: 'Clock',
    errorMessage: 'Locally saved. Not yet confirmed by Firestore sync confirmation listener.',
  };
}
