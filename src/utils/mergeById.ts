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
