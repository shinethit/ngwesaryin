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

// ── Server-side deletion tombstones (transactions) ──
// [v7.6.52] Local markers (above) die with the device: a second device
// that never learned of a delete can re-push its stale copy and
// resurrect the record. Tombstones are the server-side counterpart:
// one tiny doc per deleted transaction in users/{uid}/tombstones.
// Every push/reconcile/merge path consults them (server-fresh when
// possible, local cache otherwise). Tombstones are never pruned in
// v1 — one doc per deleted transaction is negligible at this scale,
// and pruning would reopen the resurrection window for long-offline
// devices. The cache below is the offline-readable copy.

const TOMBSTONE_CACHE_KEY = 'ngwe_tombstone_tx_ids';

export const getTombstonedTxIds = (): Set<string> => {
  try {
    const saved = safeGetItem(TOMBSTONE_CACHE_KEY);
    if (!saved) return new Set<string>();
    const parsed = JSON.parse(saved);
    return new Set<string>(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set<string>();
  }
};

export const setTombstonedTxIds = (ids: Set<string> | string[]) => {
  try {
    safeSetItem(TOMBSTONE_CACHE_KEY, JSON.stringify(Array.from(ids)));
  } catch {}
};

export const isTxTombstoned = (id: string): boolean => {
  return getTombstonedTxIds().has(id);
};

export const addTxTombstone = (id: string) => {
  try {
    const set = getTombstonedTxIds();
    if (!set.has(id)) {
      set.add(id);
      setTombstonedTxIds(set);
    }
  } catch {}
};

/**
 * Fetch the server's tombstone ids (server-first, cache fallback,
 * local cache as last resort). Refreshes the local cache on success
 * so offline gating keeps working after a restart.
 */
export const fetchTombstoneTxIds = async (uid: string): Promise<Set<string>> => {
  const cached = getTombstonedTxIds();
  if (!uid) return cached;
  try {
    const { collection, getDocsFromServer, getDocs } = await import('firebase/firestore');
    const { db } = await import('../lib/firebase');
    const colRef = collection(db, 'users', uid, 'tombstones');
    try {
      const snap = await getDocsFromServer(colRef);
      const ids = new Set<string>();
      snap.forEach((d: any) => {
        if (d && d.id) ids.add(d.id);
      });
      setTombstonedTxIds(ids);
      return ids;
    } catch {
      const snap = await getDocs(colRef);
      const ids = new Set<string>();
      snap.forEach((d: any) => {
        if (d && d.id) ids.add(d.id);
      });
      if (ids.size > 0) setTombstonedTxIds(ids);
      return ids.size > 0 ? ids : cached;
    }
  } catch {
    return cached;
  }
};
// Fuel / maintenance / tire logs had no deletion markers at all (unlike
// transactions), so a cloud snapshot could re-merge a log the user had
// just deleted — and its odometer came back with it. These markers make
// a delete on this device stick, the same way markTxDeleted does.
export type VehicleLogKind = 'fuelLogs' | 'vehicleMaintenance' | 'tirePressureLogs';

const vehicleLogMarkerKey = (kind: VehicleLogKind): string => {
  if (kind === 'fuelLogs') return 'ngwe_deleted_fuel_log_ids';
  if (kind === 'vehicleMaintenance') return 'ngwe_deleted_maintenance_ids';
  return 'ngwe_deleted_tire_log_ids';
};

export const markVehicleLogDeleted = (kind: VehicleLogKind, id: string) => {
  try {
    const key = vehicleLogMarkerKey(kind);
    const saved = safeGetItem(key);
    const set = saved ? new Set<string>(JSON.parse(saved)) : new Set<string>();
    set.add(id);
    safeSetItem(key, JSON.stringify(Array.from(set)));
  } catch {}
};

export const unmarkVehicleLogDeleted = (kind: VehicleLogKind, id: string) => {
  try {
    const key = vehicleLogMarkerKey(kind);
    const saved = safeGetItem(key);
    if (!saved) return;
    const set = new Set<string>(JSON.parse(saved));
    if (set.has(id)) {
      set.delete(id);
      safeSetItem(key, JSON.stringify(Array.from(set)));
    }
  } catch {}
};

export const isVehicleLogDeleted = (kind: VehicleLogKind, id: string): boolean => {
  try {
    const saved = safeGetItem(vehicleLogMarkerKey(kind));
    if (!saved) return false;
    const set = new Set<string>(JSON.parse(saved));
    return set.has(id);
  } catch {
    return false;
  }
};
