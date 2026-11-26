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
      // [v7.6.56] UNION, never replace: the server snapshot may not
      // know of a tombstone this device just wrote (its upsert is
      // still queued), and replacing the cache with the server set
      // would drop that local tombstone — reopening resurrection.
      const merged = new Set<string>([...cached, ...ids]);
      setTombstonedTxIds(merged);
      return merged;
    } catch {
      const snap = await getDocs(colRef);
      const ids = new Set<string>();
      snap.forEach((d: any) => {
        if (d && d.id) ids.add(d.id);
      });
      // [v7.6.56] Same union rule for the cached-snapshot fallback.
      const merged = new Set<string>([...cached, ...ids]);
      if (ids.size > 0) setTombstonedTxIds(merged);
      return ids.size > 0 ? merged : cached;
    }
  } catch {
    return cached;
  }
};
// ── Generalized server tombstones (non-transaction entities) ──
// [v7.6.60] F4: transactions are not the only resurrectable kind.
// A device that was offline when a debt, wallet, shop, vehicle or
// vehicle log was deleted elsewhere, then syncing before its first
// listener server snapshot, re-pushed its stale copy through the
// syncDataToCloud batch (which consulted only LOCAL markers/queue
// state). These composite tombstones are the same server
// collection as the transaction tombstones — one tiny doc per
// deleted entity, doc id `${entityType}:${entityId}`, payload
// {id, userId, entityType, entityId, deletedAt}. The
// firestore.rules tombstone match constrains only userId and
// id == doc id, so composite docs pass WITHOUT a rules change.
// EXCLUDED, deliberately: budgets (doc id IS the categoryId, so a
// later legitimate budget for the same category would reuse the
// id and the append-only tombstone cache would veto it forever)
// and categories (default categories have fixed ids and App.tsx
// re-seeds INITIAL_CATEGORIES on reset — same reuse hazard), plus
// sharedWallets (top-level collection, different rules/path) and
// savingsTargets (no cloud push path). The residual window for
// those kinds is stated honestly in the v7.6.60 report; the
// pending/dead-letter legs of isDeleteBlocked still cover the
// in-flight window for them. Tombstones are never pruned — one
// doc per deleted entity is negligible, and pruning would reopen
// the resurrection window for long-offline devices.

export const ENTITY_TOMBSTONE_TYPES = [
  'debts',
  'wallets',
  'shops',
  'vehicles',
  'fuelLogs',
  'vehicleMaintenance',
  'tirePressureLogs',
] as const;

export type EntityTombstoneType = (typeof ENTITY_TOMBSTONE_TYPES)[number];

const ENTITY_TOMBSTONE_CACHE_KEY = 'ngwe_tombstone_entity_ids';

export const entityTombstoneKey = (entityType: string, entityId: string): string =>
  `${entityType}:${entityId}`;

export const getTombstonedEntityKeys = (): Set<string> => {
  try {
    const saved = safeGetItem(ENTITY_TOMBSTONE_CACHE_KEY);
    if (!saved) return new Set<string>();
    const parsed = JSON.parse(saved);
    return new Set<string>(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set<string>();
  }
};

export const setTombstonedEntityKeys = (keys: Set<string> | string[]) => {
  try {
    safeSetItem(ENTITY_TOMBSTONE_CACHE_KEY, JSON.stringify(Array.from(keys)));
  } catch {}
};

export const isEntityTombstoned = (entityType: string, entityId: string): boolean => {
  return getTombstonedEntityKeys().has(entityTombstoneKey(entityType, entityId));
};

export const addEntityTombstone = (entityType: string, entityId: string) => {
  try {
    const set = getTombstonedEntityKeys();
    const key = entityTombstoneKey(entityType, entityId);
    if (!set.has(key)) {
      set.add(key);
      setTombstonedEntityKeys(set);
    }
  } catch {}
};

/**
 * Fetch the server's composite tombstone keys (server-first, cache
 * fallback). Unions into the entity cache only — bare transaction
 * ids are the transaction tombstone path's business
 * (fetchTombstoneTxIds) and are ignored here. Never throws: on
 * any failure the local cache stands, exactly like the tx fetch.
 */
export const fetchEntityTombstones = async (uid: string): Promise<Set<string>> => {
  const cached = getTombstonedEntityKeys();
  if (!uid) return cached;
  try {
    const { collection, getDocsFromServer, getDocs } = await import('firebase/firestore');
    const { db } = await import('../lib/firebase');
    const colRef = collection(db, 'users', uid, 'tombstones');
    const readIds = async (snap: any): Promise<string[]> => {
      const ids: string[] = [];
      snap.forEach((d: any) => {
        if (d && d.id) ids.push(d.id);
      });
      return ids;
    };
    const unionComposite = (ids: string[]): Set<string> => {
      const merged = new Set<string>(cached);
      for (const id of ids) {
        const [prefix, rest] = id.split(':');
        if (rest !== undefined && (ENTITY_TOMBSTONE_TYPES as readonly string[]).includes(prefix)) {
          merged.add(id);
        }
      }
      return merged;
    };
    try {
      const merged = unionComposite(await readIds(await getDocsFromServer(colRef)));
      // UNION, never replace (same rule as the tx fetch): the
      // server snapshot may not know of a tombstone this device
      // just wrote (its upsert is still queued).
      setTombstonedEntityKeys(merged);
      return merged;
    } catch {
      const ids = await readIds(await getDocs(colRef));
      const merged = unionComposite(ids);
      if (ids.length > 0) setTombstonedEntityKeys(merged);
      return ids.length > 0 ? merged : cached;
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
