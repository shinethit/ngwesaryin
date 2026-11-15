// [v7.5.85 FIX 1] "ကိုယ်ပိုင်" = MY shops — the Private tab shows the
// user's own shops: their private list PLUS the public-directory shops
// they added themselves.
//
// A shop moved private → public keeps its `addedByUid` on the public
// copy, so it now appears in BOTH tabs instead of vanishing from
// Private. The move itself is unchanged (the private original is still
// deleted after the public copy is created — one record, no divergence);
// the shop simply shows up in both places because the public copy
// carries the user's uid.
//
// Pure function — no Firestore, no auth import (the caller passes the
// uid) — so it is unit-testable in the node vitest env.
import { ShopContact, PublicShop } from '../types';
import { normalizeShopName } from './shopDetailsReminders';

/**
 * Build the list shown in the Private ("ကိုယ်ပိုင်") tab.
 *
 * - Guest / no uid → the private list only (a copy; inputs are never
 *   mutated).
 * - Signed-in → `[...privateShops, ...myPublicShops]`, deduped by
 *   normalized shop name. When both copies exist (the brief window
 *   during a move, before the private original is deleted) the PUBLIC
 *   copy wins — it is the live record.
 */
export function buildMyShopsList(
  privateShops: ShopContact[],
  publicShops: PublicShop[],
  uid: string | null | undefined
): (ShopContact | PublicShop)[] {
  const mine = [...(privateShops || [])];
  if (!uid) return mine;
  const myPublic = (publicShops || []).filter((s) => s.addedByUid === uid);
  const combined: (ShopContact | PublicShop)[] = [...mine, ...myPublic];
  // Dedupe by normalized name, preferring the LATER entry — public
  // copies come after private ones, so a public copy replaces a
  // same-named private copy in place (its position is kept).
  const byName = new Map<string, ShopContact | PublicShop>();
  const order: string[] = [];
  combined.forEach((shop, i) => {
    const key = normalizeShopName(shop.name);
    // Nameless records (should not happen — the form requires a name)
    // never collapse into each other.
    const dedupeKey = key === '' ? `__nameless_${i}` : key;
    if (!byName.has(dedupeKey)) order.push(dedupeKey);
    byName.set(dedupeKey, shop);
  });
  return order.map((k) => byName.get(k)!);
}

// [v7.5.87] The menu source for Price Compare's other-shop prices.
//
// Price inquiry (စျေးစုံစမ်းခြင်း) must show EVERYONE's prices — all
// public menus plus the signed-in user's own private menus — so this
// is NOT buildMyShopsList above: that helper filters the public list
// to `addedByUid === uid` (MY public shops only), which would hide
// every other shop's price and defeat the feature. The scope here is
// the same one ShopsView already uses for the ShopCard add-price
// suggestions: `[...publicShops, ...myShopsList]`.
//
// Dedupe is by normalized shop name, public copy wins (the live
// record — a shop moved private → public appears in both lists).
// Another user's private shops can never appear: the caller passes
// only App's own `shops` state (the signed-in user's private list)
// plus the public directory. Guests never reach Price Compare at all
// (App gates the whole Analytics tab), so no guest branch is needed.
// Pure function — no Firestore, no auth import — unit-testable.
export function buildAllMenuShopsList(
  privateShops: ShopContact[],
  publicShops: PublicShop[]
): (ShopContact | PublicShop)[] {
  const byName = new Map<string, ShopContact | PublicShop>();
  const order: string[] = [];
  // Public first: a public copy replaces a same-named private copy.
  [...(publicShops || []), ...(privateShops || [])].forEach((shop, i) => {
    const key = normalizeShopName(shop.name);
    const dedupeKey = key === '' ? `__nameless_${i}` : key;
    if (!byName.has(dedupeKey)) order.push(dedupeKey);
    // Public entries come first, so only a LATER public entry may
    // replace an earlier one — a private namesake never overwrites
    // the public copy.
    if (!byName.has(dedupeKey) || 'addedBy' in shop) {
      byName.set(dedupeKey, shop);
    }
  });
  return order.map((k) => byName.get(k)!);
}
