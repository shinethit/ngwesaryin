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
 * Sync fingerprint helpers
 * -------------------------
 * Short-circuits cloud sync when local state has not actually changed.
 *
 * Design:
 * - Hashes CONTENT of every entity, not counts/sums/first-id. Before this,
 *   editing a tx note/category/date/walletId (or offsetting two amounts)
 *   would not change the signature, so the write was silently skipped and
 *   other devices never saw the edit.
 * - Order-independent: entities are sorted by key before hashing.
 * - Non-content fields (userId, _userId, _docPath, _docSource) are
 *   stripped so Firestore metadata does not create false positives.
 * - FNV-1a 32-bit is enough for change detection at personal-app scale.
 */

const FINGERPRINT_IGNORED_KEYS = new Set([
  'userId',
  '_userId',
  '_docPath',
  '_docSource',
]);

function stableStringify(value: any): string {
  if (value === null || value === undefined) return 'null';
  const t = typeof value;
  if (t === 'number') return Number.isFinite(value) ? String(value) : 'null';
  if (t === 'string') return JSON.stringify(value);
  if (t === 'boolean') return value ? '1' : '0';
  if (Array.isArray(value)) {
    return '[' + value.map(stableStringify).join(',') + ']';
  }
  if (t === 'object') {
    const keys = Object.keys(value)
      .filter((k) => !FINGERPRINT_IGNORED_KEYS.has(k))
      .sort();
    return (
      '{' +
      keys.map((k) => JSON.stringify(k) + ':' + stableStringify(value[k])).join(',') +
      '}'
    );
  }
  return 'null';
}

function fnv1a(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h.toString(36);
}

/**
 * Deterministic content fingerprint of an entity array.
 * @param items entities to hash (order-independent)
 * @param keyOf stable id extractor; defaults to item.id ?? item.categoryId
 */
export function computeContentFingerprint<T>(
  items: T[] | undefined | null,
  keyOf: (item: T) => string = (item: any) =>
    String(item?.id ?? item?.categoryId ?? '')
): string {
  if (!items || items.length === 0) return '0';
  const sorted = [...items].sort((a, b) => keyOf(a).localeCompare(keyOf(b)));
  const body = sorted.map((it) => stableStringify(it)).join('\u0001');
  return items.length + '_' + fnv1a(body);
}

/**
 * Compact sync signature composed of per-collection fingerprints.
 * If it matches the last-synced value, the cloud write can be skipped.
 */
export function computeSyncSignature(
  txsFingerprint: string,
  debtsFingerprint: string,
  walletsFingerprint: string,
  categoriesFingerprint: string,
  budgetsFingerprint: string,
  shopsFingerprint: string,
  vehiclesFingerprint: string,
  fuelFingerprint: string,
  maintFingerprint: string,
  tiresFingerprint: string
): string {
  return (
    'txs:' + txsFingerprint +
    '|debts:' + debtsFingerprint +
    '|wallets:' + walletsFingerprint +
    '|cats:' + categoriesFingerprint +
    '|budgets:' + budgetsFingerprint +
    '|shops:' + shopsFingerprint +
    '|vehs:' + vehiclesFingerprint +
    '|fuel:' + fuelFingerprint +
    '|maint:' + maintFingerprint +
    '|tires:' + tiresFingerprint
  );
}
