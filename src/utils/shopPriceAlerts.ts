// [v7.5.82] Shop price alerts — shared contract between the
// shopping-list menu auto-update (Worker 2: shopMenuUpdate) and the
// Admin Panel Shop Price Alerts section.
// Collection: `shop_price_alerts`. One pending alert per shop + item +
// unit (deterministic doc id = the dedupe). The writer CANNOT read
// admin-only alerts, so there is NO dedupe query — the deterministic
// id IS the dedupe: a re-update after a dismiss overwrites the doc
// with status 'pending' again (merge: true), re-opening the alert,
// as designed.

export const SHOP_PRICE_ALERTS_COLLECTION = 'shop_price_alerts';

import { normalizeMenuUnit } from './shopMenuUpdate';

export type ShopPriceAlertStatus = 'pending' | 'resolved' | 'dismissed';

export interface ShopPriceAlert {
  id?: string;
  shopId: string;
  shopName: string;
  itemName: string;
  unit: string;
  oldPrice: number;
  newPrice: number;
  reportedByUid: string;
  /** Reporter email (shown to the admin as a prefix). */
  reportedBy: string;
  // [v7.5.82] Client ms timestamp (Date.now()) at submit time — NOT
  // serverTimestamp(): safeSetDoc runs cleanForFirestore, which rebuilds
  // FieldValue sentinels (serverTimestamp / deleteField) into plain
  // {_methodName: ...} maps (see AGENTS.md v7.5.64 lesson), so a server
  // timestamp would be stored corrupted. The app-wide convention is
  // numeric Date.now() for createdAt/updatedAt (ShopsView, adminAuditLog).
  reportedAt: number;
  status: ShopPriceAlertStatus;
}

/** Normalization shared by the id and the doc: trim + lowercase. */
function normalizeAlertSegment(value: string): string {
  return (value || '').trim().toLowerCase();
}

/**
 * Deterministic dedupe id: shopId + '_' + encoded normalized item
 * name + '_' + encoded normalized unit. encodeURIComponent encodes
 * '/' as '%2F', so a '/' in a name can never create a sub-path.
 * Each encoded segment is truncated to 100 chars to keep the id
 * reasonably short (a Firestore doc id may be up to 1,500 bytes).
 */
export function buildShopPriceAlertId(shopId: string, itemName: string, unit: string): string {
  const item = encodeURIComponent(normalizeAlertSegment(itemName)).slice(0, 100);
  // [v7.5.97] Canonicalize the unit first: an old 'တစ်ခု' alert and a
  // new 'ခု' alert for the same shop + item share ONE dedupe id.
  const u = encodeURIComponent(normalizeAlertSegment(normalizeMenuUnit(unit))).slice(0, 100);
  return `${shopId}_${item}_${u}`;
}

/** Pure doc builder — the exact shape written to `shop_price_alerts`. */
export function buildShopPriceAlertDoc(input: {
  shopId: string;
  shopName: string;
  itemName: string;
  unit: string;
  oldPrice: number;
  newPrice: number;
  reportedByUid: string;
  reportedBy: string;
  reportedAt: number;
}): Omit<ShopPriceAlert, 'id'> {
  return {
    shopId: input.shopId,
    shopName: input.shopName.trim(),
    itemName: input.itemName.trim(),
    unit: normalizeMenuUnit(input.unit),
    oldPrice: input.oldPrice,
    newPrice: input.newPrice,
    reportedByUid: input.reportedByUid,
    reportedBy: input.reportedBy.trim(),
    reportedAt: input.reportedAt,
    status: 'pending',
  };
}

// ---------------------------------------------------------------------------
// Submit. The Firestore store is injected so the logic is unit-testable
// without live Firestore; the default store is built lazily (dynamic
// import) so importing this module never pulls in firebase.ts — tests
// pass a stub store and never touch the network. Same pattern as
// shopReports.ts (v7.5.81).
// ---------------------------------------------------------------------------

export interface ShopPriceAlertStore {
  getCurrentUser: () => { uid: string; email?: string | null } | null;
  /** Writes the alert doc at the deterministic id (merge). False on failure. */
  writeAlert: (id: string, data: Omit<ShopPriceAlert, 'id'>) => Promise<boolean>;
}

async function defaultShopPriceAlertStore(): Promise<ShopPriceAlertStore> {
  const [{ db, auth, safeSetDoc }, firestore] = await Promise.all([
    import('../lib/firebase'),
    import('firebase/firestore'),
  ]);
  const { doc } = firestore;
  return {
    getCurrentUser: () => {
      const u = auth.currentUser;
      return u ? { uid: u.uid, email: u.email } : null;
    },
    writeAlert: async (id, data) => {
      // safeSetDoc accepts merge options (firebase.ts) and its boolean
      // return is the truth. Merge + the full doc (status 'pending'
      // included) means a re-update after a dismiss re-opens the alert.
      // The doc holds only strings/numbers — no FieldValue sentinels —
      // so cleanForFirestore cannot corrupt anything here.
      return safeSetDoc(doc(db, SHOP_PRICE_ALERTS_COLLECTION, id), data, { merge: true });
    },
  };
}

/**
 * Submit a shop price alert. Fail-closed: no user, blank shop/item,
 * or a non-finite / negative new price returns 'failed' and writes
 * nothing. Otherwise writes at the deterministic id and returns
 * 'submitted' only when the write returns true — never a false
 * success. NO dedupe query: the writer cannot read admin-only
 * alerts, so the deterministic id IS the dedupe.
 */
export async function submitShopPriceAlert(
  input: {
    shopId: string;
    shopName: string;
    itemName: string;
    unit: string;
    oldPrice: number;
    newPrice: number;
  },
  store?: ShopPriceAlertStore,
): Promise<'submitted' | 'failed'> {
  try {
    const s = store ?? (await defaultShopPriceAlertStore());
    const user = s.getCurrentUser();
    if (!user) return 'failed';
    if (!input.shopId?.trim() || !input.shopName?.trim() || !input.itemName?.trim()) return 'failed';
    if (!Number.isFinite(input.oldPrice) || !Number.isFinite(input.newPrice)) return 'failed';
    if (input.newPrice < 0) return 'failed';
    const id = buildShopPriceAlertId(input.shopId, input.itemName, input.unit);
    const ok = await s.writeAlert(
      id,
      buildShopPriceAlertDoc({
        shopId: input.shopId,
        shopName: input.shopName,
        itemName: input.itemName,
        unit: input.unit,
        oldPrice: input.oldPrice,
        newPrice: input.newPrice,
        reportedByUid: user.uid,
        reportedBy: user.email || '',
        reportedAt: Date.now(),
      }),
    );
    return ok ? 'submitted' : 'failed';
  } catch (err) {
    console.warn('[shopPriceAlerts] submit failed:', err);
    return 'failed';
  }
}
