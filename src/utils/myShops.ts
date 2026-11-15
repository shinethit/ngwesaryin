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
