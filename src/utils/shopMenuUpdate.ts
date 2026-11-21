// [v7.5.82] Shop menu auto-update from shopping-list entries — pure
// diff / build logic + an injectable store for the Firestore write.
//
// A shopping-list entry carries a per-unit price and a unit (တစ်ခု /
// တစ်ပါကင် / တစ်ကီလို / ...). When the user saves such an entry for a
// shop, the shop's menu gains (or updates) the matching name+unit line.
// The menu price IS the entry's per-unit price — quantity is how many
// were bought, so the price is never divided.
//
// [v7.5.83] Fuel / maintenance entries build a ONE-item candidate the
// same way (see buildVehicleMenuCandidate below): the fuel type per
// litre at the selected station, or the service / part per service at
// the workshop — the station / workshop name IS the shop for them.
//
// The Firestore store is injected so the logic is unit-testable without
// live Firestore; the default store is built lazily (dynamic import) so
// importing this module never pulls in firebase.ts — tests pass a stub
// store and never touch the network. Timestamps are `Date.now()`
// NUMBERS — never serverTimestamp() via the safe* wrappers
// (safeUpdateDoc/safeSetDoc CORRUPT FieldValue sentinels; see
// AGENTS.md v7.5.64 lesson).

import type { TransactionItem } from '../types';
import { normalizeShopName } from './shopDetailsReminders';

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

/** Trim; empty / non-string values fall back to the default.
 * [v7.5.95 U2] A non-empty string that is NOT one of the six list
 * values is a CUSTOM unit (e.g. 'တစ်ဗူး') typed via the 'အခြား'
 * option — it is PRESERVED as-is, never collapsed to the default.
 * Matching stays exact string equality everywhere (computeMenuDiff /
 * buildUpdatedMenuItems / shopItemSearch), so a custom unit matches
 * only the same custom unit. The literal 'အခြား' itself is a list
 * value, so it is preserved too (old entries stay as-is). */
export function normalizeMenuUnit(unit: unknown): string {
  if (typeof unit !== 'string') return DEFAULT_MENU_UNIT;
  const trimmed = unit.trim();
  if (!trimmed) return DEFAULT_MENU_UNIT;
  return trimmed;
}

/** The 'other' list value — choosing it reveals a free-text input. */
export const OTHER_MENU_UNIT = 'အခြား';

/** True when `unit` is a non-empty custom unit (not a list value). */
export function isCustomMenuUnit(unit: unknown): boolean {
  if (typeof unit !== 'string') return false;
  const trimmed = unit.trim();
  if (!trimmed) return false;
  return !SHOP_MENU_UNITS.some((u) => u.value === trimmed);
}

/** [v7.5.95 U1] Options for a unit <select>: the standard units
 * (except 'အခြား'), then the user's persisted custom units
 * (trimmed, deduped, never duplicating a list value), then 'အခြား'
 * last — mirroring the custom-gas-stations select pattern. A custom
 * unit renders with the same string in both languages (no EN label
 * is known for a typed unit). */
export function menuUnitSelectOptions(
  customUnits: string[],
): { value: string; labelMy: string; labelEn: string }[] {
  const seen = new Set<string>();
  const customs: { value: string; labelMy: string; labelEn: string }[] = [];
  for (const raw of customUnits || []) {
    const trimmed = typeof raw === 'string' ? raw.trim() : '';
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    if (SHOP_MENU_UNITS.some((u) => u.value === trimmed)) continue;
    customs.push({ value: trimmed, labelMy: trimmed, labelEn: trimmed });
  }
  const standard = SHOP_MENU_UNITS.filter((u) => u.value !== OTHER_MENU_UNIT);
  const other = SHOP_MENU_UNITS.find((u) => u.value === OTHER_MENU_UNIT)!;
  return [...standard, ...customs, other];
}

/** [v7.5.95 U1] The value a unit <select> must show for a stored
 * unit: a list value, or a persisted custom unit (an option in this
 * select), shows itself; any OTHER non-empty string is a custom unit
 * from elsewhere (e.g. another device) and shows 'အခြား' (its text
 * goes in the free-text input); missing/undefined shows the default;
 * an EMPTY string means the user picked 'အခြား' and has typed
 * nothing yet, so it also shows 'အခြား' with an empty input (never
 * the default — the input must stay visible until the user picks
 * something else). */
export function resolveMenuUnitSelectValue(unit: unknown, customUnits: string[] = []): string {
  if (unit === undefined || unit === null) return DEFAULT_MENU_UNIT;
  if (typeof unit !== 'string') return DEFAULT_MENU_UNIT;
  const trimmed = unit.trim();
  if (!trimmed) return OTHER_MENU_UNIT;
  if (SHOP_MENU_UNITS.some((u) => u.value === trimmed)) return trimmed;
  const customs = (customUnits || []).map((u) => (typeof u === 'string' ? u.trim() : ''));
  if (customs.includes(trimmed)) return trimmed;
  return OTHER_MENU_UNIT;
}

/** [v7.5.95 U1] Whether the free-text custom-unit input must show
 * for a stored unit: always for a custom unit (so its text stays
 * visible + editable even when it is also a select option), and for
 * the 'အခြား' sentinel / any unlisted custom (select shows
 * 'အခြား'). List values never show it. */
export function menuUnitNeedsCustomInput(unit: unknown, customUnits: string[] = []): boolean {
  if (isCustomMenuUnit(unit)) return true;
  return resolveMenuUnitSelectValue(unit, customUnits) === OTHER_MENU_UNIT;
}

/** [v7.5.95 U1] The free-text value for a stored unit: the raw custom
 * string when the unit is custom, '' otherwise (a list value, the
 * literal 'အခြား', or empty all show an empty input). */
export function customMenuUnitText(unit: unknown): string {
  if (typeof unit !== 'string') return '';
  const trimmed = unit.trim();
  if (!trimmed) return '';
  if (SHOP_MENU_UNITS.some((u) => u.value === trimmed)) return '';
  return trimmed;
}

/** [v7.5.95 U1] The unit to SAVE for a stored/typed value: the
 * 'အခြား' sentinel (picked but nothing typed) resolves to the
 * default — choosing 'အခြား' must never store the literal 'အခြား'.
 * Every other value goes through normalizeMenuUnit (custom strings
 * preserved, empty → default). */
export function resolveSavedMenuUnit(unit: unknown): string {
  if (typeof unit === 'string' && unit.trim() === OTHER_MENU_UNIT) return DEFAULT_MENU_UNIT;
  return normalizeMenuUnit(unit);
}

/** [v7.5.95 U2] Custom units in `units` that are not already in
 * `existingCustom` — the append-on-save set (deduped, in order). */
export function collectNewCustomUnits(
  units: (string | undefined)[],
  existingCustom: string[],
): string[] {
  const known = new Set((existingCustom || []).map((u) => (typeof u === 'string' ? u.trim() : '')));
  const out: string[] = [];
  for (const u of units) {
    if (!isCustomMenuUnit(u)) continue;
    const trimmed = (u as string).trim();
    if (known.has(trimmed) || out.includes(trimmed)) continue;
    out.push(trimmed);
  }
  return out;
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

// ---------------------------------------------------------------------------
// [v7.5.83] Vehicle entries (fuel / maintenance) build a ONE-item menu
// candidate the same way a shopping-list entry does — the station /
// workshop name IS the shop for them (user overruled the v7.5.82
// "not a shop the user named" rule, 2026-11-14).
// ---------------------------------------------------------------------------

export interface VehicleMenuCandidateInput {
  entryModel: 'general' | 'fuel' | 'vehicle_service' | 'tire_pressure';
  /** Resolved shop name (derivedShopName): typed name, else station / workshop. */
  shopName: string;
  // Fuel (parsed numbers — the caller applies parseMyanmarNumber).
  fuelType?: string;
  fuelLiters?: number;
  fuelPricePerLiter?: number;
  // Maintenance.
  maintServiceType?: string;
  /** Canonical service label (SERVICE_TYPE_CONFIG labelMy) — resolved by the caller. */
  maintServiceLabel?: string;
  maintTitle?: string;
  extraNote?: string;
  finalAmount?: number;
  /** [v7.5.93] Multi-row service entries: the valid rows (each with
   *  its own serviceType) — the candidate emits ONE item per row.
   *  Absent / empty → the old single-item synthesis below. */
  rows?: TransactionItem[];
}

export interface ShopMenuUpdateCandidate {
  shopName: string;
  items: TransactionItem[];
}

/**
 * Build the menu-update candidate for a fuel / maintenance entry, or
 * null when there is nothing to offer. Pure — no Firestore, no UI.
 *
 * - Fuel: one item, name = fuel type, unit 'တစ်လီတာ', price = price
 *   per litre, quantity = litres, amount = price × quantity. Fires
 *   only when a station name, a fuel type, a price > 0 and litres > 0
 *   are all present. No station at all → auto-skip, like a general
 *   entry with no shop.
 * - Maintenance (not license_renewal): [v7.5.93] one item PER valid
 *   row (each row keeps its own name / price / quantity / amount /
 *   unit), so every part of a multi-row visit can update the menu.
 *   With no rows, the OLD single-item synthesis (title || service
 *   label || note || default, total amount, quantity 1).
 *   Fires only when a workshop name and an amount > 0 are present.
 * - license_renewal (the "shop" is a government office, not a shop),
 *   tire_pressure (free, no price) and general entries → null.
 */
export function buildVehicleMenuCandidate(
  input: VehicleMenuCandidateInput,
): ShopMenuUpdateCandidate | null {
  const shop = (input.shopName || '').trim();
  if (input.entryModel === 'fuel') {
    const name = (input.fuelType || '').trim();
    const price = input.fuelPricePerLiter ?? 0;
    const qty = input.fuelLiters ?? 0;
    if (!shop || !name || !Number.isFinite(price) || price <= 0 || !Number.isFinite(qty) || qty <= 0) {
      return null;
    }
    return {
      shopName: shop,
      items: [{ name, price, quantity: qty, amount: price * qty, unit: 'တစ်လီတာ' }],
    };
  }
  if (input.entryModel === 'vehicle_service') {
    if (input.maintServiceType === 'license_renewal') return null;
    const amount = input.finalAmount ?? 0;
    if (!shop || !Number.isFinite(amount) || amount <= 0) return null;
    // [v7.5.93] Multi-row visit: one candidate item per valid row.
    const rowItems = (input.rows || [])
      .filter((r) => r && typeof r.name === 'string' && r.name.trim() && Number(r.quantity) > 0)
      .map((r) => {
        const price = Number(r.price) || 0;
        const quantity = Number(r.quantity) || 0;
        const rowAmount = Number(r.amount);
        return {
          name: r.name.trim(),
          price,
          quantity,
          amount: Number.isFinite(rowAmount) ? rowAmount : price * quantity,
          unit: normalizeMenuUnit(r.unit),
        };
      });
    if (rowItems.length > 0) {
      return { shopName: shop, items: rowItems };
    }
    const name =
      (input.maintTitle || '').trim() ||
      (input.maintServiceLabel || '').trim() ||
      (input.extraNote || '').trim() ||
      'ယာဉ်ပြုပြင်ထိန်းသိမ်းမှု';
    return {
      shopName: shop,
      items: [{ name, price: amount, quantity: 1, amount, unit: 'တစ်ခု' }],
    };
  }
  return null;
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

// ---------------------------------------------------------------------------
// [v7.5.85 FIX 2] Menu candidate survives a new shop and a move.
// Two defects, one shared resolution:
//
// 1. NEW SHOP: at save time a just-typed shop exists in NEITHER list
//    yet — it is created right after, via the details prompt, as a
//    `__prefill_` sentinel with NO `items` field — so the candidate
//    handler used to silently drop the candidate (`if (!resolved)
//    return`). App now STASHES the candidate (one small object, keyed
//    by normalized name) and retries it when a matching shop appears
//    in either list, re-running the SAME resolution + gating.
// 2. MOVE / DELETE BEFORE CONFIRM: the prompt held the shop SNAPSHOT
//    from save time, so confirming after a move wrote to the stale
//    copy — and after a delete, the private write RESURRECTED the
//    deleted doc in Firestore. App now RE-RESOLVES by name at apply
//    time (fresh shop, fresh items) and writes nowhere when the shop
//    is gone.
//
// The resolution + gating + apply are pure / injectable here so they
// are unit-testable without mounting App; App only wires state, the
// Firestore fetch, and the modal around them.
// ---------------------------------------------------------------------------

/** One entry of either shop list App watches (public carries id+name only). */
export interface MenuShopListEntry {
  id: string;
  name: string;
  items?: MenuBuildCurrentItem[];
}

export interface ResolvedMenuShop {
  shop: MenuShopListEntry;
  isPublic: boolean;
}

/** Fetches the FULL public doc (menu included) for a public id+name hit. */
export type FetchPublicMenuShop = (shopId: string) => Promise<MenuShopListEntry | null>;

/** A candidate whose shop did not resolve yet — stashed until it appears.
 *  [v7.5.89 A5] `shopId` is carried alongside the name when it is
 *  known, so the retry can resolve by id (rename-proof). No writer
 *  knows it today — a stash means "no match anywhere", so the shop
 *  does not exist yet — and it stays undefined until one does. */
export interface StashedMenuCandidate {
  shopName: string;
  shopId?: string;
  items: TransactionItem[];
}

// ---------------------------------------------------------------------------
// [v7.5.90 F2] A details-fill save that RENAMED the shop (X → Y) must
// move the stashed candidate with it. Pure decision helper — App's
// `ngwe:shop-details-saved` listener is a thin wrapper around it, so
// the matching rule is unit-testable without mounting App.
// ---------------------------------------------------------------------------

/** What App's details-saved listener knows about a ShopModal save. */
export interface SavedShopForStash {
  /** Name the form was opened with (prefill name for a new shop). */
  oldName?: string;
  /** Name the shop was saved under. */
  savedName: string;
  /** Saved record's id when known (see SHOP_DETAILS_SAVED_EVENT). */
  shopId?: string;
  /** Fallback match name — App's details-prompt name at save time.
   *  The prompt is cleared by Fill Now before the form opens, so
   *  `oldName` is the usual match; this covers a save whose opening
   *  name is unknown but whose prompt name still matches the stash. */
  promptName?: string | null;
}

/**
 * [v7.5.90 F2] Rewrite a stashed menu candidate for a shop that was
 * just saved in the details form, or leave it alone.
 *
 * - No stash → null (the listener is a no-op).
 * - Folded stash name matches the folded OLD name (or the folded
 *   prompt name) → a NEW stash: `shopName` becomes the SAVED name
 *   (trimmed), the saved id is attached when known, an id the stash
 *   already carried is kept when the save brings none, and `items`
 *   are preserved by reference. The no-rename case still attaches
 *   the id — this is the writer the v7.5.89 A5 comment says the stash
 *   was missing.
 * - Anything else (a save for a DIFFERENT shop, an empty saved name,
 *   no opening name at all) → the SAME stash object, untouched.
 * - A matching save that changes nothing (same folded name, same id)
 *   also returns the same object, so the listener can tell "updated"
 *   from "unchanged" by reference (`next !== stash`).
 *
 * Matching is the shared folded name (normalizeShopName: trim +
 * case-insensitive, Myanmar digits folded, whitespace collapsed), so
 * 'ဆိုင် ၇' and 'ဆိုင် 7' are the same shop here, as everywhere else
 * in the save path.
 */
export function updateStashedCandidateForSavedShop(
  stash: StashedMenuCandidate | null,
  saved: SavedShopForStash,
): StashedMenuCandidate | null {
  if (!stash) return null;
  const savedName = (saved.savedName || '').trim();
  if (!savedName) return stash;
  const stashKey = normalizeShopName(stash.shopName);
  if (!stashKey) return stash;
  const oldKey = normalizeShopName(saved.oldName || '');
  const promptKey = normalizeShopName(saved.promptName || '');
  const matches =
    (oldKey !== '' && stashKey === oldKey) || (promptKey !== '' && stashKey === promptKey);
  if (!matches) return stash;
  const nextShopId = (saved.shopId || '').trim() || stash.shopId;
  if (normalizeShopName(savedName) === stashKey && nextShopId === stash.shopId) return stash;
  return {
    shopName: savedName,
    ...(nextShopId ? { shopId: nextShopId } : {}),
    items: stash.items,
  };
}

/**
 * [v7.5.89 A5] Resolve by the shop's ID, not its name — a rename
 * between prompt-open and Apply must still land on the right doc.
 * Public: the full doc via the injected fetch; private: the local
 * list by id. Returns null when the id is unknown (moved / deleted)
 * — callers fall back to the name-based resolveMenuShop.
 */
export async function resolveMenuShopById(
  shopId: string,
  isPublic: boolean,
  privateShops: MenuShopListEntry[],
  fetchPublicShop: FetchPublicMenuShop,
): Promise<ResolvedMenuShop | null> {
  if (!shopId) return null;
  if (isPublic) {
    try {
      const full = await fetchPublicShop(shopId);
      if (full) return { shop: full, isPublic: true };
    } catch (err) {
      console.warn('[shopMenuUpdate] public shop fetch by id failed:', err);
    }
    return null;
  }
  const hit = privateShops.find((s) => s.id === shopId);
  return hit ? { shop: hit, isPublic: false } : null;
}

/**
 * Resolve a shop name the SAME way the details prompt matches it
 * (normalizeShopName: trim + case-insensitive, Myanmar digits folded).
 * Public-first: if the name matches BOTH a public and a private shop,
 * the PUBLIC shop wins. [v7.5.89 A6] If a public match's full doc
 * cannot be fetched (fetch failure or vanished doc), FALL BACK to the
 * private namesake instead of returning null — a failed fetch must
 * not lose the menu update. Among same-name duplicates (public or
 * private) prefer the doc WITH menu items over an empty one.
 * Returns null when the name matches nothing.
 */
export async function resolveMenuShop(
  shopName: string,
  publicShops: Array<{ id: string; name: string }>,
  privateShops: MenuShopListEntry[],
  fetchPublicShop: FetchPublicMenuShop,
): Promise<ResolvedMenuShop | null> {
  const key = normalizeShopName(shopName);
  if (!key) return null;
  const publicHits = publicShops.filter((s) => normalizeShopName(s.name) === key);
  let firstPublic: MenuShopListEntry | null = null;
  for (const hit of publicHits) {
    try {
      const full = await fetchPublicShop(hit.id);
      if (!full) continue;
      if ((full.items || []).length > 0) return { shop: full, isPublic: true };
      if (!firstPublic) firstPublic = full;
    } catch (err) {
      console.warn('[shopMenuUpdate] public shop fetch failed — trying next match:', err);
    }
  }
  if (firstPublic) return { shop: firstPublic, isPublic: true };
  const privateHits = privateShops.filter((s) => normalizeShopName(s.name) === key);
  const privateHit =
    privateHits.find((s) => (s.items || []).length > 0) ?? privateHits[0];
  if (privateHit) return { shop: privateHit, isPublic: false };
  return null;
}

/**
 * Diff a candidate's items against the resolved shop's CURRENT menu
 * and apply the v7.5.82 gate. Returns the prompt rows, or null when
 * there is nothing to offer (no diff, or guest + public shop).
 */
export function buildMenuPromptRows(
  candidateItems: TransactionItem[],
  resolved: ResolvedMenuShop | null,
  isSignedIn: boolean,
): MenuUpdateRow[] | null {
  if (!resolved || !candidateItems || candidateItems.length === 0) return null;
  const rows = computeMenuDiff(resolved.shop.items || [], candidateItems);
  if (
    !shouldOfferMenuUpdate({
      hasItems: candidateItems.length > 0,
      shopResolved: true,
      isPublic: resolved.isPublic,
      isSignedIn,
      hasDiff: rows.length > 0,
    })
  ) {
    return null;
  }
  return rows;
}

export type ApplyResolvedMenuUpdateResult = 'applied' | 'not-found' | 'failed';

/**
 * Apply the checked rows to a FRESHLY resolved shop. Returns
 * 'not-found' — WITHOUT calling the store at all — when the shop no
 * longer exists, so a deleted private shop is never resurrected by a
 * write. 'failed' when the store write fails; 'applied' on success.
 */
export async function applyResolvedMenuUpdate(
  resolved: ResolvedMenuShop | null,
  selectedRows: MenuUpdateRow[],
  contributorName: string,
  store?: ShopMenuStore,
): Promise<ApplyResolvedMenuUpdateResult> {
  if (!resolved) return 'not-found';
  const updatedItems = buildUpdatedMenuItems(resolved.shop.items || [], selectedRows, contributorName);
  const ok = await applyShopMenuItems(resolved.shop, resolved.isPublic, updatedItems, store);
  return ok ? 'applied' : 'failed';
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
