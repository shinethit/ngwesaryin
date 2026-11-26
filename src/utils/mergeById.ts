/**
 * Utility to merge two arrays of objects by their 'id' or 'categoryId' property.
 */
export function mergeById<T extends { id: string }>(
  prev: T[],
  incoming: T[],
  opts?: {
    preferIncoming?: boolean;
    onMerge?: (merged: T) => void;
  }
): T[] {
  const map = new Map<string, T>();
  
  // Populate with previous
  prev.forEach((item) => map.set(item.id, item));
  
  // Merge incoming
  incoming.forEach((item) => {
    const existing = map.get(item.id);
    const merged = existing ? { ...existing, ...item } : item;
    map.set(item.id, merged);
    if (opts?.onMerge) opts.onMerge(merged);
  });
  
  return Array.from(map.values());
}

/**
 * [v7.6.56] Drop local items that were confirmed in an earlier SERVER
 * snapshot but are missing from this one — i.e. deleted on another
 * client. The three guards are what keep this safe:
 *  - cached snapshots never prune (fromCache) — a cached snapshot
 *    may simply not have the doc yet;
 *  - ids never confirmed in a server snapshot are never pruned
 *    (guest / offline / never-synced items must survive);
 *  - `shouldKeep` vetoes the drop for items with outstanding work
 *    (a pending queue task or a dead-lettered task for the id) —
 *    dropping those would lose data that is still being pushed.
 * Callers run this on the PREVIOUS local list BEFORE mergeById /
 * mergeByKey, so a confirmed-missing item cannot be resurrected by
 * the merge. `cloudKeys` must be the RAW snapshot keys (before any
 * delete-blocked / lag filtering): a sighting proves server
 * presence even when the doc is filtered out of the merge.
 */
export function pruneConfirmedMissing<T>(
  prev: T[],
  cloudKeys: Set<string>,
  confirmedKeys: Set<string>,
  keyOf: (item: T) => string,
  shouldKeep: (item: T) => boolean,
  fromCache: boolean
): T[] {
  if (fromCache) return prev;
  return prev.filter((item) => {
    const key = keyOf(item);
    if (!key || cloudKeys.has(key) || !confirmedKeys.has(key)) return true;
    return shouldKeep(item);
  });
}

/**
 * Utility to merge two arrays of objects by their 'categoryId' property.
 */
export function mergeByKey<T extends { categoryId: string }>(
  prev: T[],
  incoming: T[]
): T[] {
  const map = new Map<string, T>();
  
  prev.forEach((item) => map.set(item.categoryId, item));
  incoming.forEach((item) => map.set(item.categoryId, { ...map.get(item.categoryId), ...item }));
  
  return Array.from(map.values());
}

