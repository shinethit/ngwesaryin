import { safeGetItem, safeSetItem } from './storage';

/**
 * Persistent deletion markers — prevents cloud snapshots from resurrecting
 * transactions/wallets the user explicitly deleted on any device.
 */

// ── Transaction markers ──

export const markTxDeleted = (id: string) => {
  try {
    const saved = safeGetItem('ngwe_deleted_tx_ids');
    const set = saved ? new Set<string>(JSON.parse(saved)) : new Set<string>();
    set.add(id);
    safeSetItem('ngwe_deleted_tx_ids', JSON.stringify(Array.from(set)));
  } catch {}
};

export const unmarkTxDeleted = (id: string) => {
  try {
    const saved = safeGetItem('ngwe_deleted_tx_ids');
    if (!saved) return;
    const set = new Set<string>(JSON.parse(saved));
    set.delete(id);
    safeSetItem('ngwe_deleted_tx_ids', JSON.stringify(Array.from(set)));
  } catch {}
};

export const isTxDeleted = (id: string): boolean => {
  try {
    const saved = safeGetItem('ngwe_deleted_tx_ids');
    if (!saved) return false;
    const set = new Set<string>(JSON.parse(saved));
    return set.has(id);
  } catch {
    return false;
  }
};

// ── Wallet markers ──

export const markWalletDeleted = (id: string) => {
  try {
    const saved = safeGetItem('ngwe_deleted_wallet_ids');
    const set = saved ? new Set<string>(JSON.parse(saved)) : new Set<string>();
    set.add(id);
    safeSetItem('ngwe_deleted_wallet_ids', JSON.stringify(Array.from(set)));
  } catch {}
};

export const unmarkWalletDeleted = (id: string) => {
  try {
    const saved = safeGetItem('ngwe_deleted_wallet_ids');
    if (!saved) return;
    const set = new Set<string>(JSON.parse(saved));
    if (set.has(id)) {
      set.delete(id);
      safeSetItem('ngwe_deleted_wallet_ids', JSON.stringify(Array.from(set)));
    }
  } catch {}
};

export const isWalletDeleted = (id: string): boolean => {
  try {
    const saved = safeGetItem('ngwe_deleted_wallet_ids');
    if (!saved) return false;
    const set = new Set<string>(JSON.parse(saved));
    return set.has(id);
  } catch {
    return false;
  }
};
