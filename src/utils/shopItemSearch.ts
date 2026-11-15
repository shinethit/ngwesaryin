// [v7.5.86] Cross-shop item price search (စျေးစုံစမ်းခြင်း) — pure logic.
//
// The search reads the SHARED menus: every public shop's `items` plus the
// signed-in user's own private shops' `items` — NEVER another user's
// private data, and NEVER the user's own purchase history (Price Compare
// stays own-data-only, which is correct there; THIS feature is price
// INQUIRY — comparing what everyone has entered, so nobody has to ask
// each shop one by one).
//
// Data source: the caller passes the shops to search. In ShopsView that
// is `activeShopsList` — the Public tab's `publicShops` (all public
// menus, already in memory from the live onSnapshot) or the Private
// tab's `myShopsList` (own private + own public). Guests get the public
// list (what they can already view) plus their own local private shops;
// another user's private shops are never in either list, so they can
// never appear in results. No Firestore query happens here — the menus
// are already in memory; Firestore cannot substring-search array items
// server-side anyway, and the search is client-side over in-memory data.
//
// Matching reuses the existing normalizers from shopMenuUpdate.ts —
// `normalizeMenuItemName` (trim + lowercase) and `normalizeMenuUnit` —
// so a search matches the same way a menu update matches. Substring
// (contains) match, because an exact-only match would miss spellings.
// Same name + different unit = SEPARATE rows (the v7.5.82 rule — the
// key is name + unit, same as computeMenuDiff).
import { normalizeMenuItemName, normalizeMenuUnit } from './shopMenuUpdate';
import type { ShopContact, PublicShop } from '../types';

export interface ShopItemSearchResult {
  shopId: string;
  shopName: string;
  /** The shop record itself, so the caller can open it. */
  shop: ShopContact | PublicShop;
  /** True for a public-directory shop, false for the user's own private shop. */
  isPublic: boolean;
  /** Display name as stored in the menu (trimmed, original casing). */
  itemName: string;
  price: number;
  /** Normalized unit (falls back to 'တစ်ခု' — see normalizeMenuUnit). */
  unit: string;
}

export type ShopItemSearchSource = (ShopContact | PublicShop)[];

/**
 * Find every menu line whose item name contains the query (normalized,
 * substring), cheapest first. Same name + different unit = separate rows.
 * Empty query → no rows (the UI shows a hint instead of the whole DB).
 */
export function searchShopMenus(
  shops: ShopItemSearchSource,
  query: string
): ShopItemSearchResult[] {
  const q = normalizeMenuItemName(query);
  if (!q) return [];
  const rows: ShopItemSearchResult[] = [];
  for (const shop of shops || []) {
    const isPublic = 'addedBy' in shop;
    for (const item of shop.items || []) {
      const nameKey = normalizeMenuItemName(item?.name);
      if (!nameKey || !nameKey.includes(q)) continue;
      const price = typeof item?.price === 'number' && Number.isFinite(item.price)
        ? item.price
        : NaN;
      if (Number.isNaN(price)) continue;
      rows.push({
        shopId: shop.id,
        shopName: shop.name,
        shop,
        isPublic,
        itemName: (item.name || '').trim(),
        price,
        unit: normalizeMenuUnit(item?.unit),
      });
    }
  }
  // Cheapest first; ties break deterministically (shop, then item, then unit).
  rows.sort(
    (a, b) =>
      a.price - b.price ||
      a.shopName.localeCompare(b.shopName) ||
      a.itemName.localeCompare(b.itemName) ||
      a.unit.localeCompare(b.unit)
  );
  return rows;
}

/**
 * All distinct menu item names across the given shops, alphabetical.
 * Display names are kept as first seen (trimmed); dedupe is by the
 * normalized name, so 'ဆန်', ' ဆန် ' and 'ဆန်' (different case) count
 * as one name. No cap — distinct names only, a few hundred at most.
 */
export function collectMenuItemNames(shops: ShopItemSearchSource): string[] {
  const seen = new Map<string, string>();
  for (const shop of shops || []) {
    for (const item of shop.items || []) {
      const nameKey = normalizeMenuItemName(item?.name);
      if (!nameKey) continue;
      if (!seen.has(nameKey)) seen.set(nameKey, (item.name || '').trim());
    }
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b));
}

/**
 * Suggest item names as the user types: substring match on the
 * normalized name, in the given (alphabetical) name order, capped.
 * Empty query → the first `limit` names (a starting list, not the DB).
 */
export function filterItemNameSuggestions(
  names: string[],
  query: string,
  limit = 8
): string[] {
  const q = normalizeMenuItemName(query);
  const out: string[] = [];
  for (const name of names || []) {
    if (q && !normalizeMenuItemName(name).includes(q)) continue;
    out.push(name);
    if (out.length >= limit) break;
  }
  return out;
}

/** Suggestions straight from shops: collect names, then filter by query. */
export function getMenuItemNameSuggestions(
  shops: ShopItemSearchSource,
  query: string,
  limit = 8
): string[] {
  return filterItemNameSuggestions(collectMenuItemNames(shops), query, limit);
}
