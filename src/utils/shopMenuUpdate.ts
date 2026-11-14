// [v7.5.82] Shop menu auto-update from shopping-list entries — pure
// diff / build logic + an injectable store for the Firestore write.
//
// A shopping-list entry carries a per-unit price and a unit (တစ်ခု /
// တစ်ပါကင် / တစ်ကီလို / ...). When the user saves such an entry for a
// shop, the shop's menu gains (or updates) the matching name+unit line.
// The menu price IS the entry's per-unit price — quantity is how many
// were bought, so the price is never divided.
//
// The Firestore store is injected so the logic is unit-testable without
// live Firestore; the default store is built lazily (dynamic import) so
// importing this module never pulls in firebase.ts — tests pass a stub
// store and never touch the network. Timestamps are `Date.now()`
// NUMBERS — never serverTimestamp() via the safe* wrappers
// (safeUpdateDoc/safeSetDoc CORRUPT FieldValue sentinels; see
// AGENTS.md v7.5.64 lesson).

/** Default unit — one piece. Stored value is the Myanmar string. */
export const DEFAULT_MENU_UNIT = 'တစ်ခု';

export const SHOP_MENU_UNITS: { value: string; labelMy: string; labelEn: string }[] = [
  { value: 'တစ်ခု', labelMy: 'တစ်ခု', labelEn: 'per piece' },
  { value: 'တစ်ပါကင်', labelMy: 'တစ်ပါကင်', labelEn: 'per pack' },
  { value: 'တစ်ကီလို', labelMy: 'တစ်ကီလို', labelEn: 'per kg' },
  { value: 'တစ်လီတာ', labelMy: 'တစ်လီတာ', labelEn: 'per litre' },
  { value: 'တစ်ထုပ်', labelMy: 'တစ်ထုပ်', labelEn: 'per bag' },
  { value: 'အခြား', labelMy: 'အခြား', labelEn: 'other' },
];

/** Trim; empty / non-string / unknown values fall back to the default. */
export function normalizeMenuUnit(unit: unknown): string {
  if (typeof unit !== 'string') return DEFAULT_MENU_UNIT;
  const trimmed = unit.trim();
  if (!trimmed) return DEFAULT_MENU_UNIT;
  return SHOP_MENU_UNITS.some((u) => u.value === trimmed) ? trimmed : DEFAULT_MENU_UNIT;
}

/** Trim + lowercase — the matching key for menu item names. */
export function normalizeMenuItemName(name: unknown): string {
  if (typeof name !== 'string') return '';
  return name.trim().toLowerCase();
}

/** One menu change a shopping-list entry would make. */
export interface MenuUpdateRow {
  itemName: string;
  unit: string;
  oldPrice: number | null;
  newPrice: number;
  isNew: boolean;
  isLargeDiff: boolean;
}

/**
 * A price jump worth flagging to the admin: 3x or more, or down to a
 * third or less. A free item gaining a price is also a big change.
 * Just under 3x (e.g. 2.99x) is NOT large.
 */
export function isLargePriceDifference(oldPrice: number, newPrice: number): boolean {
  if (oldPrice > 0) {
    return newPrice >= 3 * oldPrice || newPrice <= oldPrice / 3;
  }
  // oldPrice <= 0: only a free item gaining a price counts as large.
  return newPrice > 0;
}

export interface MenuDiffCurrentItem {
  name: string;
  price: number;
  unit?: string;
}

export interface MenuDiffTxItem {
  name: string;
  price: number;
  quantity: number;
  unit?: string;
}

/**
 * Diff shopping-list items against the current menu. Returns only rows
 * that would change something; an empty array means no prompt.
 *
 * - Match is by normalized name AND normalized unit. An existing menu
 *   item with NO unit is treated as unit 'တစ်ခု'.
 * - Same name+unit, different price → update row.
 * - Same name+unit, same price → NO row (nothing would change).
 * - Different name → new row. Same name + DIFFERENT unit → a SEPARATE
 *   new row (the other unit's line is never overwritten).
 * - Skipped: empty name, quantity <= 0, price < 0 / not finite.
 * - The same tx item twice (same name+unit) keeps the LAST one.
 */
export function computeMenuDiff(
  currentItems: MenuDiffCurrentItem[],
  txItems: MenuDiffTxItem[],
): MenuUpdateRow[] {
  const currentByKey = new Map<string, MenuDiffCurrentItem>();
  for (const item of currentItems) {
    const key = `${normalizeMenuItemName(item.name)}\n${normalizeMenuUnit(item.unit)}`;
    if (!currentByKey.has(key)) currentByKey.set(key, item);
  }

  // Dedupe tx items by name+unit, keeping the LAST occurrence.
  const latestByKey = new Map<string, MenuDiffTxItem>();
  for (const tx of txItems) {
    const name = typeof tx.name === 'string' ? tx.name.trim() : '';
    if (!name) continue;
    if (typeof tx.quantity !== 'number' || tx.quantity <= 0) continue;
    if (typeof tx.price !== 'number' || !Number.isFinite(tx.price) || tx.price < 0) continue;
    const unit = normalizeMenuUnit(tx.unit);
    latestByKey.set(`${normalizeMenuItemName(name)}\n${unit}`, {
      name,
      price: tx.price,
      quantity: tx.quantity,
      unit,
    });
  }

  const rows: MenuUpdateRow[] = [];
  for (const tx of latestByKey.values()) {
    const key = `${normalizeMenuItemName(tx.name)}\n${normalizeMenuUnit(tx.unit)}`;
    const existing = currentByKey.get(key);
    if (!existing) {
      rows.push({
        itemName: tx.name,
        unit: normalizeMenuUnit(tx.unit),
        oldPrice: null,
        newPrice: tx.price,
        isNew: true,
        isLargeDiff: false,
      });
    } else if (existing.price !== tx.price) {
      rows.push({
        itemName: tx.name,
        unit: normalizeMenuUnit(tx.unit),
        oldPrice: existing.price,
        newPrice: tx.price,
        isNew: false,
        isLargeDiff: isLargePriceDifference(existing.price, tx.price),
      });
    }
    // Same price → no row.
  }
  return rows;
}

export interface MenuBuildCurrentItem {
  name: string;
  price: number;
  unit?: string;
  updatedAt?: number;
  addedBy?: string;
}

export interface BuiltMenuItem {
  name: string;
  price: number;
  unit?: string;
  updatedAt: number;
  addedBy: string;
}

/**
 * Apply the selected diff rows to a copy of the current menu.
 * Matched rows update in place (original name spelling kept); new rows
 * are prepended, newest first (rows are in tx order, so prepending each
 * in turn leaves the last row on top — as today, one new item goes on
 * top). Untouched items keep their original `unit` / `addedBy` /
 * `updatedAt` — including unit-less items, which keep NO unit key until
 * touched. Updated / added rows get `updatedAt: Date.now()`, `addedBy`,
 * and `unit` stored explicitly (even when it is the default).
 */
export function buildUpdatedMenuItems(
  currentItems: MenuBuildCurrentItem[],
  selectedRows: MenuUpdateRow[],
  addedBy: string,
): BuiltMenuItem[] {
  const updated: BuiltMenuItem[] = currentItems.map((it) => ({
    name: it.name,
    price: it.price,
    ...(it.unit !== undefined ? { unit: it.unit } : {}),
    updatedAt: it.updatedAt ?? 0,
    addedBy: it.addedBy ?? '',
  }));

  const indexByKey = new Map<string, number>();
  updated.forEach((it, i) => {
    const key = `${normalizeMenuItemName(it.name)}\n${normalizeMenuUnit(it.unit)}`;
    if (!indexByKey.has(key)) indexByKey.set(key, i);
  });

  for (const row of selectedRows) {
    const key = `${normalizeMenuItemName(row.itemName)}\n${normalizeMenuUnit(row.unit)}`;
    const idx = indexByKey.get(key);
    if (idx !== undefined) {
      // Matched row: update in place (original name spelling kept).
      updated[idx] = {
        ...updated[idx],
        price: row.newPrice,
        unit: row.unit,
        updatedAt: Date.now(),
        addedBy,
      };
    } else {
      // No match: prepend as a new line.
      const fresh: BuiltMenuItem = {
        name: row.itemName,
        price: row.newPrice,
        unit: row.unit,
        updatedAt: Date.now(),
        addedBy,
      };
      updated.unshift(fresh);
      // Indices shifted by one — rebuild the map for later rows.
      indexByKey.clear();
      updated.forEach((it, i) => {
        const k = `${normalizeMenuItemName(it.name)}\n${normalizeMenuUnit(it.unit)}`;
        if (!indexByKey.has(k)) indexByKey.set(k, i);
      });
    }
  }
  return updated;
}

// ---------------------------------------------------------------------------
// Store + apply. The default store is built lazily (dynamic import) so
// importing this module never pulls in firebase.ts.
// ---------------------------------------------------------------------------

export interface ShopMenuStore {
  updatePublicShopItems: (shopId: string, items: unknown[]) => Promise<boolean>;
  updatePrivateShopItems: (shop: unknown, items: unknown[]) => Promise<boolean>;
}

async function defaultShopMenuStore(): Promise<ShopMenuStore> {
  const [{ db, safeUpdateDoc }, firestore] = await Promise.all([
    import('../lib/firebase'),
    import('firebase/firestore'),
  ]);
  const { doc } = firestore;
  return {
    updatePublicShopItems: async (shopId, items) =>
      safeUpdateDoc(doc(db, 'public_shops', shopId), { items }),
    // The private save lives in App and reaches ShopsView only as the
    // `onUpdatePrivateShop` prop — this module cannot reach it, so the
    // default store CANNOT write a private shop. Callers (ShopsView)
    // MUST always pass an explicit store for private shops; this throws
    // so a missing store fails loudly instead of faking success.
    updatePrivateShopItems: async () => {
      throw new Error(
        '[shopMenuUpdate] No private-shop store: pass an explicit store whose updatePrivateShopItems calls onUpdatePrivateShop.',
      );
    },
  };
}

/**
 * [v7.5.82] Gate for offering the menu-update prompt. True ONLY when
 * there are items, a shop resolved, and something actually differs —
 * and, for a PUBLIC shop, the user is signed in (the public_shops
 * rules require sign-in). A PRIVATE shop needs no sign-in: the local
 * path works for guests on their own private shops (App's
 * handleUpdateShop has no auth gate — it always updates the local
 * list and only writes to the cloud when signed in).
 */
export function shouldOfferMenuUpdate(input: {
  hasItems: boolean;
  shopResolved: boolean;
  isPublic: boolean;
  isSignedIn: boolean;
  hasDiff: boolean;
}): boolean {
  return input.hasItems && input.shopResolved && input.hasDiff && (!input.isPublic || input.isSignedIn);
}

/**
 * Write the updated menu items for a shop. Returns the boolean truth —
 * never a fake success. Public shops go through Firestore
 * (`public_shops/<id>`); private shops go through the injected store
 * (the default store throws for private shops — see above).
 */
export async function applyShopMenuItems(
  // NOTE: no `[k: string]: unknown` index signature here — ShopContact /
  // PublicShop are interfaces, and tsc rejects interfaces against an
  // index-signature type. The private store still receives the whole
  // shop object (typed `unknown` on its side).
  shop: { id: string; items?: unknown[] },
  isPublic: boolean,
  updatedItems: unknown[],
  store?: ShopMenuStore,
): Promise<boolean> {
  try {
    const s = store ?? (await defaultShopMenuStore());
    if (isPublic) {
      return await s.updatePublicShopItems(shop.id, updatedItems);
    }
    return await s.updatePrivateShopItems(shop, updatedItems);
  } catch (err) {
    console.warn('[shopMenuUpdate] apply failed:', err);
    return false;
  }
}
