// [v7.5.82] Shop menu auto-update from shopping-list entries — pure
// diff / build logic + an injectable store for the Firestore write.
//
// A shopping-list entry carries a per-unit price and a unit (ခု /
// ပါကင် / ကီလို / ...). When the user saves such an entry for a
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

import type { Transaction, TransactionItem, VehicleMaintenance } from '../types';
import { normalizeShopName } from './shopDetailsReminders';
import { attributeItemsToShops } from './transactionSplits';
import type { UnifiedItemInfo } from './itemIntelligence';

/** Default unit — one piece. Stored value is the Myanmar string. */
export const DEFAULT_MENU_UNIT = 'ခု';

export const SHOP_MENU_UNITS: { value: string; labelMy: string; labelEn: string }[] = [
  { value: 'ခု', labelMy: 'ခု', labelEn: 'per piece' },
  { value: 'ပါကင်', labelMy: 'ပါကင်', labelEn: 'per pack' },
  { value: 'ကီလို', labelMy: 'ကီလို', labelEn: 'per kg' },
  { value: 'လီတာ', labelMy: 'လီတာ', labelEn: 'per litre' },
  { value: 'ထုပ်', labelMy: 'ထုပ်', labelEn: 'per bag' },
  { value: 'အခြား', labelMy: 'အခြား', labelEn: 'other' },
];

/** [v7.6.10] Myanmar cardinal number words (1–10), stripped from
 * the front of a unit name when a non-empty remainder remains — a
 * number word mistakenly typed into a unit ('တစ်ဗူး', 'နှစ်ထုပ်')
 * is removed automatically. No word here is a prefix of another,
 * so a single startsWith pass in this order is unambiguous. */
const MENU_UNIT_NUMBER_WORDS = [
  'တစ်',
  'နှစ်',
  'သုံး',
  'လေး',
  'ငါး',
  'ခြောက်',
  'ခုနှစ်',
  'ရှစ်',
  'ကိုး',
  'ဆယ်',
];

/** Trim; empty / non-string values fall back to the default.
 * [v7.6.10] ONE leading Myanmar cardinal number word (1–10) is
 * stripped when a non-empty remainder remains, so a stored
 * 'တစ်ဗူး' DISPLAYS and MATCHES as 'ဗူး' and a stored 'တစ်ခု'
 * still canonicalizes to the bare preset 'ခု' — the v7.5.97
 * five-form map is subsumed by this general rule. Guards: a
 * string that IS only a number word ('တစ်') keeps it (an empty
 * remainder never strips to nothing); only ONE prefix is ever
 * stripped ('တစ်နှစ်ဗူး' → 'နှစ်ဗူး'); digits are never
 * stripped ('2ဗူး' stays '2ဗူး'); spaced forms strip too
 * ('တစ် ဗူး' → 'ဗူး', via the post-strip trim). The literal
 * 'အခြား' carries no number-word prefix, so it is preserved.
 * Matching stays exact string equality on the NORMALIZED form
 * everywhere (computeMenuDiff / buildUpdatedMenuItems /
 * shopItemSearch), so a stripped custom unit matches the same
 * bare custom unit. No stored string is rewritten: stored units
 * stay as typed until re-save; normalization happens at read
 * time, as in v7.5.97. */
export function normalizeMenuUnit(unit: unknown): string {
  if (typeof unit !== 'string') return DEFAULT_MENU_UNIT;
  const trimmed = unit.trim();
  if (!trimmed) return DEFAULT_MENU_UNIT;
  for (const word of MENU_UNIT_NUMBER_WORDS) {
    if (trimmed.startsWith(word)) {
      const rest = trimmed.slice(word.length).trim();
      if (rest) return rest;
      return trimmed;
    }
  }
  return trimmed;
}

/** [v7.6.10] The unit to DISPLAY for a stored unit string: the
 * normalized form, so an old 'တစ်ခု' line renders as 'ခု' and a
 * stored 'တစ်ဗူး' renders as 'ဗူး' (its mistaken leading number
 * word stripped); any other custom unit renders as typed. */
export function displayMenuUnit(unit: unknown): string {
  return normalizeMenuUnit(unit);
}

/** The 'other' list value — choosing it reveals a free-text input. */
export const OTHER_MENU_UNIT = 'အခြား';

/** True when `unit` is a non-empty custom unit (not a list value).
 * [v7.5.97] Normalize first, then check list membership — the five
 * old preset forms canonicalize to list values, so they are NOT
 * custom. */
export function isCustomMenuUnit(unit: unknown): boolean {
  if (typeof unit !== 'string') return false;
  const trimmed = unit.trim();
  if (!trimmed) return false;
  return !SHOP_MENU_UNITS.some((u) => u.value === normalizeMenuUnit(trimmed));
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
    const rawTrimmed = typeof raw === 'string' ? raw.trim() : '';
    if (!rawTrimmed) continue;
    // [v7.5.97] Normalize before deduping: a persisted old preset
    // form ('တစ်ခု') is a list value, never a custom option.
    const trimmed = normalizeMenuUnit(rawTrimmed);
    if (seen.has(trimmed)) continue;
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
  // [v7.5.97] Normalize first: an old stored 'တစ်ခု' selects the
  // bare preset 'ခု' — never 'အခြား' with a prefilled custom input.
  const normalized = normalizeMenuUnit(trimmed);
  if (SHOP_MENU_UNITS.some((u) => u.value === normalized)) return normalized;
  const customs = (customUnits || []).map((u) =>
    typeof u === 'string' && u.trim() ? normalizeMenuUnit(u.trim()) : '',
  );
  if (customs.includes(normalized)) return normalized;
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

/** [v7.5.95 U1] The free-text value for a stored unit: the
 * normalized custom string when the unit is custom ('တစ်ဗူး' opens
 * for edit as 'ဗူး'), '' otherwise (a list value, the literal
 * 'အခြား', or empty all show an empty input). */
export function customMenuUnitText(unit: unknown): string {
  if (typeof unit !== 'string') return '';
  const trimmed = unit.trim();
  if (!trimmed) return '';
  // [v7.5.97] Normalize first: an old preset form is a list value,
  // so it shows an empty input (its select shows the bare preset).
  const normalized = normalizeMenuUnit(trimmed);
  if (SHOP_MENU_UNITS.some((u) => u.value === normalized)) return '';
  return normalized;
}

/** [v7.5.95 U1] The unit to SAVE for a stored/typed value: the
 * 'အခြား' sentinel (picked but nothing typed) resolves to the
 * default — choosing 'အခြား' must never store the literal 'အခြား'.
 * Every other value goes through normalizeMenuUnit (a mistaken
 * leading number word is stripped, empty → default). */
export function resolveSavedMenuUnit(unit: unknown): string {
  if (typeof unit === 'string' && unit.trim() === OTHER_MENU_UNIT) return DEFAULT_MENU_UNIT;
  return normalizeMenuUnit(unit);
}

/** [v7.5.95 U2] Custom units in `units` that are not already in
 * `existingCustom` — the append-on-save set (deduped, in order).
 * [v7.6.10] Both sides are normalized before deduping, so a stored
 * 'တစ်ဗူး' and an existing 'ဗူး' collapse to the one bare custom
 * 'ဗူး' instead of persisting a duplicate. */
export function collectNewCustomUnits(
  units: (string | undefined)[],
  existingCustom: string[],
): string[] {
  const known = new Set(
    (existingCustom || []).map((u) => (typeof u === 'string' ? normalizeMenuUnit(u.trim()) : '')),
  );
  const out: string[] = [];
  for (const u of units) {
    if (!isCustomMenuUnit(u)) continue;
    const normalized = normalizeMenuUnit((u as string).trim());
    if (known.has(normalized) || out.includes(normalized)) continue;
    out.push(normalized);
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
 *   item with NO unit is treated as unit 'ခု'.
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
  /** [v7.6.54] Service fee / labor for the visit, entered separately
   *  from the part rows. NEVER folded into a part price: the
   *  candidate emits it as its own 'ဝန်ဆောင်ခ' row (no unit key),
   *  and the part price is the parts total only. */
  laborCost?: number;
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
 * - Fuel: one item, name = fuel type, unit 'လီတာ', price = price
 *   per litre, quantity = litres, amount = price × quantity. Fires
 *   only when a station name, a fuel type, a price > 0 and litres > 0
 *   are all present. No station at all → auto-skip, like a general
 *   entry with no shop.
 * - Maintenance (not license_renewal): [v7.5.93] one item PER valid
 *   row (each row keeps its own name / price / quantity / amount /
 *   unit), so every part of a multi-row visit can update the menu.
 *   With no rows, the OLD single-item synthesis (title || service
 *   label || note || default, total amount, quantity 1).
 *   [v7.6.54] The service fee is NEVER folded into a part price:
 *   it is its own 'ဝန်ဆောင်ခ' row (no unit key), and the part
 *   price is the parts total only (total − labor).
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
      items: [{ name, price, quantity: qty, amount: price * qty, unit: 'လီတာ' }],
    };
  }
  if (input.entryModel === 'vehicle_service') {
    if (input.maintServiceType === 'license_renewal') return null;
    const amount = input.finalAmount ?? 0;
    if (!shop || !Number.isFinite(amount) || amount <= 0) return null;
    // [v7.6.54] The service fee is NEVER folded into a part price:
    // it is its own candidate row ('ဝန်ဆောင်ခ', no unit key — the
    // diff normalizes the missing unit to the default 'ခု', the
    // same as every other unit-less menu line), and the part price
    // is the parts total only. Labor is sanitized like the form's
    // maintLaborNum (never negative, non-finite → 0).
    const laborRaw = Number(input.laborCost);
    const labor = Number.isFinite(laborRaw) ? Math.max(0, laborRaw) : 0;
    const laborRow: TransactionItem | null =
      labor > 0 ? { name: 'ဝန်ဆောင်ခ', price: labor, quantity: 1, amount: labor } : null;
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
      return { shopName: shop, items: laborRow ? [...rowItems, laborRow] : rowItems };
    }
    // No rows: the OLD single-item synthesis, but the price is the
    // PARTS total only (total − labor, floored at 0). When the parts
    // total is 0 and labor > 0, ONLY the labor row is emitted —
    // never a zero-price part row.
    const partsTotal = Math.max(0, amount - labor);
    const name =
      (input.maintTitle || '').trim() ||
      (input.maintServiceLabel || '').trim() ||
      (input.extraNote || '').trim() ||
      'ယာဉ်ပြုပြင်ထိန်းသိမ်းမှု';
    const items: TransactionItem[] = [];
    if (partsTotal > 0) {
      items.push({ name, price: partsTotal, quantity: 1, amount: partsTotal, unit: DEFAULT_MENU_UNIT });
    }
    if (laborRow) items.push(laborRow);
    if (items.length === 0) return null;
    return { shopName: shop, items };
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

/** One shop's section of the combined "refresh all menus" prompt. */
export interface GlobalMenuSection {
  shopId: string;
  shopName: string;
  isPublic: boolean;
  rows: MenuUpdateRow[];
}

/** One resolved shop with the user's latest purchased items for it. */
export interface GlobalMenuShopEntry {
  resolved: ResolvedMenuShop;
  items: TransactionItem[];
}

export interface GlobalMenuSectionsResult {
  sections: GlobalMenuSection[];
  /** Resolved shops considered (with purchase history). */
  checkedCount: number;
  /** Resolved shops whose menu already matches (no diff, gate passed). */
  upToDateCount: number;
  /** Shops with a real diff that the gate refused (guest + public). */
  skippedPublicCount: number;
}

/**
 * [v7.6.44] Build the sections of the ONE combined "refresh all
 * menus" prompt from already-resolved shops. Pure: the caller owns
 * attribution + resolution; this owns only the per-shop diff +
 * gate decision, reusing buildMenuPromptRows exactly as the
 * single-shop prompt does. A null row set WITH a real diff means
 * the gate refused (guest + public) — counted as skipped, never
 * silently dropped; a null row set with NO diff means up to date.
 */
export function buildGlobalMenuSections(
  entries: GlobalMenuShopEntry[],
  isSignedIn: boolean,
): GlobalMenuSectionsResult {
  const sections: GlobalMenuSection[] = [];
  let upToDateCount = 0;
  let skippedPublicCount = 0;
  for (const entry of entries) {
    const rows = buildMenuPromptRows(entry.items, entry.resolved, isSignedIn);
    if (rows) {
      sections.push({
        shopId: entry.resolved.shop.id,
        shopName: entry.resolved.shop.name,
        isPublic: entry.resolved.isPublic,
        rows,
      });
      continue;
    }
    const diff = computeMenuDiff(entry.resolved.shop.items || [], entry.items);
    if (diff.length > 0) skippedPublicCount++;
    else upToDateCount++;
  }
  return { sections, checkedCount: entries.length, upToDateCount, skippedPublicCount };
}

/** One attributed shop's latest purchased items, keyed by folded shop name. */
export interface LatestItemsByShopEntry {
  displayName: string;
  latest: Map<string, TransactionItem>;
}

/**
 * [v7.6.46] Shared attribution loop: newest-first over all
 * transactions, items attributed to shops with the same helpers the
 * save path uses, keeping only the LATEST item per name+unit per
 * shop. Extracted verbatim from App's handleReapplyAllShopMenus so
 * the click build and the header-button derivation can never drift.
 * [v7.6.54] When maintenance logs are passed, a visit's service fee
 * is synthesized as its own 'ဝန်ဆောင်ခ' item (no unit key) for the
 * visit's shop — the same separate row the save path emits — so the
 * refresh-all-menus prompt no longer loses labor. Newest visit per
 * shop wins, like every other item; license_renewal never yields a
 * row; a visit with no shop at all is skipped, like a shopless
 * entry on the save path.
 */
export function collectLatestItemsByShop(
  transactions: Transaction[],
  suggestions: UnifiedItemInfo[],
  maintenanceLogs?: VehicleMaintenance[],
): Map<string, LatestItemsByShopEntry> {
  const laborByTx = new Map<string, { labor: number; workshopName: string }>();
  for (const m of maintenanceLogs || []) {
    if (!m || !m.transactionId || m.serviceType === 'license_renewal') continue;
    const labor = Number(m.laborCost) || 0;
    if (!Number.isFinite(labor) || labor <= 0) continue;
    if (!laborByTx.has(m.transactionId)) {
      laborByTx.set(m.transactionId, { labor, workshopName: (m.workshopName || '').trim() });
    }
  }
  const ordered = [...transactions].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    const aCreated = typeof a.createdAt === 'number' ? a.createdAt : 0;
    const bCreated = typeof b.createdAt === 'number' ? b.createdAt : 0;
    return bCreated - aCreated;
  });
  const latestByShop = new Map<string, LatestItemsByShopEntry>();
  for (const tx of ordered) {
    const byShop = attributeItemsToShops(tx.items || [], tx.splits, tx.shopName, suggestions);
    for (const [attributedShop, attributedItems] of byShop) {
      const key = normalizeShopName(attributedShop);
      if (!key) continue;
      let entry = latestByShop.get(key);
      if (!entry) {
        entry = { displayName: attributedShop.trim(), latest: new Map() };
        latestByShop.set(key, entry);
      }
      for (const item of attributedItems) {
        const itemKey = `${(item.name || '').trim().toLowerCase()}|${(item.unit || '').trim().toLowerCase()}`;
        if (!entry.latest.has(itemKey)) entry.latest.set(itemKey, item);
      }
    }
    // [v7.6.54] Service fee for this visit, if any: its own row for
    // the visit's shop (the entry shop, else the workshop name).
    // Items above win on a key collision — an explicitly typed
    // 'ဝန်ဆောင်ခ' row keeps its own price.
    const visitLabor = laborByTx.get(tx.id);
    if (visitLabor) {
      const laborShop = (tx.shopName || '').trim() || visitLabor.workshopName;
      const key = normalizeShopName(laborShop);
      if (key) {
        let entry = latestByShop.get(key);
        if (!entry) {
          entry = { displayName: laborShop, latest: new Map() };
          latestByShop.set(key, entry);
        }
        const laborKey = 'ဝန်ဆောင်ခ|';
        if (!entry.latest.has(laborKey)) {
          entry.latest.set(laborKey, {
            name: 'ဝန်ဆောင်ခ',
            price: visitLabor.labor,
            quantity: 1,
            amount: visitLabor.labor,
          });
        }
      }
    }
  }
  return latestByShop;
}

/**
 * [v7.6.46] SYNCHRONOUS mirror of resolveMenuShop's private branch:
 * match a folded shop name against the already-loaded private shops,
 * preferring the doc WITH menu items. No fetching — a name that also
 * matches a public shop is NOT resolved here (the click build is
 * public-first and fetches the public menu); the caller treats that
 * as doubt, never as up-to-date.
 */
export function resolveLocalMenuShop(
  shopName: string,
  privateShops: MenuShopListEntry[],
): ResolvedMenuShop | null {
  const key = normalizeShopName(shopName);
  if (!key) return null;
  const privateHits = privateShops.filter((s) => normalizeShopName(s.name) === key);
  const privateHit = privateHits.find((s) => (s.items || []).length > 0) ?? privateHits[0];
  if (!privateHit) return null;
  return { shop: privateHit, isPublic: false };
}

/** Header-button pending state for the "refresh all menus" action. */
export interface GlobalMenuPendingState {
  /** Shops whose menu provably differs from the latest purchases. */
  pendingCount: number;
  /** True when some attributed shop could not be checked
      synchronously (public-shop match: the click build fetches its
      menu). Doubt means coloured, never dimmed. */
  hasDoubt: boolean;
  /** Attributed shops that resolved to a menu (private or public). */
  checkedCount: number;
  /** Resolved private shops whose menu already matches. */
  upToDateCount: number;
}

/**
 * [v7.6.46] Derive the header button's pending state SYNCHRONOUSLY
 * from already-loaded data — no fetching, no async resolve. The
 * diff uses buildMenuPromptRows, the exact helper the click build
 * uses, so the two can never disagree on a private shop. Pure and
 * memoizable on [transactions, categories, shops, publicShops].
 */
export function deriveGlobalMenuPending(args: {
  transactions: Transaction[];
  suggestions: UnifiedItemInfo[];
  privateShops: MenuShopListEntry[];
  publicShopNames: string[];
  isSignedIn: boolean;
  /** [v7.6.54] Maintenance logs for the labor-row synthesis. */
  maintenanceLogs?: VehicleMaintenance[];
}): GlobalMenuPendingState {
  const { transactions, suggestions, privateShops, publicShopNames, isSignedIn, maintenanceLogs } = args;
  const latestByShop = collectLatestItemsByShop(transactions, suggestions, maintenanceLogs);
  const publicKeys = new Set(publicShopNames.map((n) => normalizeShopName(n)));
  let pendingCount = 0;
  let hasDoubt = false;
  let checkedCount = 0;
  let upToDateCount = 0;
  for (const [key, entry] of latestByShop) {
    const items = [...entry.latest.values()];
    if (items.length === 0) continue;
    const local = resolveLocalMenuShop(entry.displayName, privateShops);
    const publicMatch = publicKeys.has(key);
    if (publicMatch) {
      // Public-first resolution: the click build fetches this menu.
      // Unknown here — doubt, never up-to-date.
      hasDoubt = true;
      checkedCount++;
      continue;
    }
    if (!local) continue; // Deleted/renamed shop: the click build skips it.
    checkedCount++;
    const rows = buildMenuPromptRows(items, local, isSignedIn);
    if (rows) pendingCount++;
    else upToDateCount++;
  }
  return { pendingCount, hasDoubt, checkedCount, upToDateCount };
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
