/**
 * Synchronization and Data Deduplication Guards
 * Prevents circular Firestore feedback loops, re-render cascades, and data duplication.
 */

export function areArraysEqual<T>(
  a: T[],
  b: T[],
  isEqual: (x: T, y: T) => boolean = (x, y) => JSON.stringify(x) === JSON.stringify(y)
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (!isEqual(a[i], b[i])) return false;
  }
  return true;
}

export function deduplicateById<T extends { id: string }>(items: T[]): T[] {
  if (!items || items.length === 0) return [];
  const map = new Map<string, T>();
  items.forEach((item) => {
    if (item && item.id) {
      if (!map.has(item.id)) {
        map.set(item.id, item);
      }
    }
  });
  return Array.from(map.values());
}

/**
 * Computes a fast lightweight fingerprint of the syncable state.
 * If this fingerprint matches the last synced state, cloud sync can be safely skipped.
 */
export function computeSyncSignature(
  txsCount: number,
  txsSum: number,
  txsFirstId: string,
  debtsCount: number,
  debtsSum: number,
  debtsFirstId: string,
  walletsSummary: string,
  catsCount: number,
  budgetsSummary: string,
  shopsCount: number,
  vehiclesCount: number,
  fuelCount: number,
  maintCount: number,
  tireCount: number
): string {
  return `txs:${txsCount}_${txsSum}_${txsFirstId}|debts:${debtsCount}_${debtsSum}_${debtsFirstId}|wallets:${walletsSummary}|cats:${catsCount}|budgets:${budgetsSummary}|shops:${shopsCount}|vehs:${vehiclesCount}|fuel:${fuelCount}|maint:${maintCount}|tires:${tireCount}`;
}
