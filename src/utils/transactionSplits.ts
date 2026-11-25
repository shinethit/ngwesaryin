// [v7.6.07] Split transactions — pure helpers. One record's total
// amount can be divided across several categories (e.g. one
// supermarket receipt: food + household). Budgets, reports and
// charts count each slice under its own category; every total that
// is about the RECORD (day totals, wallet balances, income/expense
// sums, plan-limit counting) keeps using `transaction.amount`
// directly and never touches these helpers.
//
// STORAGE SHAPE (types.ts): `Transaction.splits` is optional.
// A split row is { categoryId, subCategoryId?, amount, note? }.
// The record's own `category` field is the FIRST split's category
// (the primary), and `subCategoryId` the first split's, so unsplit
// readers see exactly what they saw before. No Firestore rules
// change: the transaction rules validate only id/walletId/amount/
// type/userId/date — there is no field whitelist (firestore.rules
// shared-wallet block ~line 522, owner block ~line 646).
//
// AMOUNTS: split amounts are in the record's wallet currency, like
// `amount`. Callers convert each slice with the same wallet lookup
// they already use for the whole amount (convertToMMK per slice),
// never by converting the total and apportioning it.

import type { Transaction, TransactionItem, TransactionSplit } from '../types';
import { parseMyanmarNumber } from './myanmarDigits';
import { findMatchingItemInfo } from './itemIntelligence';
import type { UnifiedItemInfo } from './itemIntelligence';

/** One category slice of a record, in the record's wallet currency. */
export interface SplitAttribution {
  categoryId: string;
  subCategoryId?: string;
  amount: number;
  note?: string;
  /** Effective shop for this slice: the row's own shop, else the
   *  record's shop. Undefined when the record names no shop. */
  shopName?: string;
}

/** A form row in the TransactionModal split section. Amounts stay
 *  strings here (Myanmar digits allowed) until save time. `shopName`
 *  is the TYPED row shop; '' means "same as the entry shop" and is
 *  never stored (rowsToSplits drops it). */
export interface SplitFormRow {
  categoryId: string;
  subCategoryId: string;
  amount: string;
  note: string;
  shopName: string;
}

const isFiniteNumber = (n: unknown): n is number =>
  typeof n === 'number' && Number.isFinite(n);

/** Kyat amounts have no smaller unit in practice; comparing at 2dp
 *  absorbs binary-float representation noise (e.g. 33333.33 +
 *  66666.67) without tolerating a real 1-kyat difference. */
const toKyat = (n: number): number => Math.round(n * 100) / 100;

/** True when the record carries at least one split row. */
export function hasSplits(tx: Transaction): boolean {
  return Array.isArray(tx.splits) && tx.splits.length > 0;
}

/**
 * True when an EDIT must actively clear splits in the cloud: the
 * previous record HAD splits and the new payload has none (split
 * section switched off, or every row deleted, or the entry left
 * the general unit_qty mode). A merge write (setDoc { merge: true },
 * the sync-queue replay, the REST PATCH fallback) leaves an
 * omitted field untouched, so merely omitting `splits` resurrects
 * the stale slices on the next pull. The edit handler therefore
 * writes `splits: []` — empty is unsplit by contract (types.ts,
 * hasSplits, getSplitAttribution), and the explicit empty array
 * overwrites the stored slices through every merge path in the
 * SAME write, with no sentinel and no second write. This is the
 * v7.5.93 `items: []` precedent for the identical stale-array
 * problem. New records (no previous splits) and still-split edits
 * return false: no clearing write, behaviour exactly as today.
 */
export function shouldClearSplits(
  prevSplits: TransactionSplit[] | undefined,
  nextSplits: TransactionSplit[] | undefined,
): boolean {
  return (
    Array.isArray(prevSplits) &&
    prevSplits.length > 0 &&
    (!Array.isArray(nextSplits) || nextSplits.length === 0)
  );
}

/**
 * Effective shop for one stored split row: the row's own shop when
 * the user gave it one, else the record's shop. Blank/whitespace-only
 * counts as absent — the form never stores it, and old data never
 * has it.
 */
export function resolveSplitShopName(
  split: TransactionSplit,
  entryShopName: string | undefined,
): string | undefined {
  const row = (split.shopName || '').trim();
  if (row) return row;
  const entry = (entryShopName || '').trim();
  return entry || undefined;
}

/**
 * Per-category attribution of a record. Splits present/non-empty →
 * one attribution per split row (in stored order; the first row is
 * the primary), each carrying its effective shop ([v7.6.41] row shop
 * or the record's shop). Otherwise the whole amount under the
 * record's own category/sub-category — today's behaviour exactly. A
 * split row with a non-finite amount contributes 0 rather than NaN
 * (corrupt stored data must never poison a report total).
 */
export function getSplitAttribution(tx: Transaction): SplitAttribution[] {
  if (hasSplits(tx)) {
    return (tx.splits as TransactionSplit[]).map((s) => ({
      categoryId: s.categoryId || 'other',
      subCategoryId: s.subCategoryId || undefined,
      amount: isFiniteNumber(s.amount) ? s.amount : 0,
      note: s.note || undefined,
      shopName: resolveSplitShopName(s, tx.shopName),
    }));
  }
  return [
    {
      categoryId: tx.category || 'other',
      subCategoryId: tx.subCategoryId || undefined,
      amount: isFiniteNumber(tx.amount) ? tx.amount : 0,
      shopName: (tx.shopName || '').trim() || undefined,
    },
  ];
}

/** One shop's portion of a record: its attributions + their sum. */
export interface SplitShopGroup {
  /** Effective shop name; undefined when the record names no shop. */
  shopName: string | undefined;
  attributions: SplitAttribution[];
  amount: number;
}

/**
 * [v7.6.41] Group a record's attributions by effective shop, in
 * first-seen order; rows sharing a shop merge into one group (their
 * amounts sum — never double-counted: each attribution lands in
 * exactly one group). An unsplit record is one group; a record with
 * no shop anywhere is one group with `shopName: undefined`. Used by
 * the Records list to render one line per shop.
 */
export function splitShopGroups(tx: Transaction): SplitShopGroup[] {
  const groups: SplitShopGroup[] = [];
  const byKey = new Map<string, SplitShopGroup>();
  for (const a of getSplitAttribution(tx)) {
    const key = a.shopName || '';
    let g = byKey.get(key);
    if (!g) {
      g = { shopName: a.shopName, attributions: [], amount: 0 };
      byKey.set(key, g);
      groups.push(g);
    }
    g.attributions.push(a);
    g.amount += a.amount;
  }
  return groups;
}

/**
 * [v7.6.41] Attribute a record's items to shops for menu updates.
 * Stored items carry no shop and no category, and split rows carry
 * no items — so when a record's split rows name DIFFERENT shops,
 * items are attributed by inferred category: the item's category
 * (from the user's own purchase history, the same matcher the entry
 * form uses) matched against the split rows' categories; the first
 * matching row's shop wins. Items with no category match, and every
 * item of an unsplit or single-shop record, go to the entry shop.
 * The menu prompt still shows the user every row before anything is
 * written, so a wrong inference is skipped, not silently applied.
 * Returns shops in first-seen order, each with at least one item.
 * `splits` is the record's STORED splits (or undefined when
 * unsplit); row shops resolve through resolveSplitShopName.
 */
export function attributeItemsToShops(
  items: TransactionItem[],
  splits: TransactionSplit[] | undefined,
  entryShopName: string,
  suggestions: UnifiedItemInfo[],
): Map<string, TransactionItem[]> {
  const byShop = new Map<string, TransactionItem[]>();
  const put = (shop: string, item: TransactionItem) => {
    const list = byShop.get(shop);
    if (list) list.push(item);
    else byShop.set(shop, [item]);
  };
  const usable = (items || []).filter((i) => (i.name || '').trim());
  if (usable.length === 0) return byShop;
  const entryShop = (entryShopName || '').trim();
  const rows = (Array.isArray(splits) && splits.length > 0 ? splits : []).map((s) => ({
    categoryId: s.categoryId || 'other',
    shopName: resolveSplitShopName(s, entryShop),
  }));
  const distinctShops = new Set(rows.map((r) => r.shopName || ''));
  if (rows.length === 0 || distinctShops.size <= 1) {
    // One shop (or none) for the whole record: today's behaviour —
    // every item goes to the entry shop, no inference involved.
    const shop = rows[0]?.shopName || entryShop;
    if (shop) for (const item of usable) put(shop, item);
    return byShop;
  }
  for (const item of usable) {
    const match = findMatchingItemInfo(item.name, suggestions);
    const row = match?.categoryId
      ? rows.find((r) => r.categoryId === match.categoryId)
      : undefined;
    put(row?.shopName || entryShop || '', item);
  }
  // A blank-shop bucket (no shop anywhere) carries nothing a menu
  // update can use — drop it so no empty candidate is built.
  byShop.delete('');
  return byShop;
}

/** Sum of the given splits' amounts (0 for absent/empty). */
export function splitsTotal(splits: TransactionSplit[] | undefined): number {
  if (!Array.isArray(splits)) return 0;
  return splits.reduce((sum, s) => sum + (isFiniteNumber(s.amount) ? s.amount : 0), 0);
}

/** Total minus the splits' sum — the amount still unassigned. */
export function splitRemainder(total: number, splits: TransactionSplit[] | undefined): number {
  return toKyat(total) - toKyat(splitsTotal(splits));
}

/** Validation failure reason, or null when the splits are saveable:
 *  at least one row, every row has a category, every amount > 0, and
 *  the slices sum EXACTLY to the record total (kyat-exact at 2dp;
 *  no looser tolerance). */
export type SplitValidationError =
  | 'empty'
  | 'missing-category'
  | 'non-positive-amount'
  | 'unbalanced';

export function validateSplits(
  splits: TransactionSplit[] | undefined,
  total: number,
): SplitValidationError | null {
  if (!Array.isArray(splits) || splits.length === 0) return 'empty';
  if (splits.some((s) => !s.categoryId)) return 'missing-category';
  if (splits.some((s) => !isFiniteNumber(s.amount) || s.amount <= 0)) return 'non-positive-amount';
  if (toKyat(splitsTotal(splits)) !== toKyat(total)) return 'unbalanced';
  return null;
}

/**
 * Sum of the attributions matching a predicate, in the record's
 * wallet currency. The fallback (unsplit record) is the whole
 * amount when its single attribution matches, else 0 — so budget
 * "spent in these categories" and "everything else" (General pool)
 * both stay exact.
 */
export function splitAmountMatching(
  tx: Transaction,
  matches: (a: SplitAttribution) => boolean,
): number {
  return getSplitAttribution(tx)
    .filter(matches)
    .reduce((sum, a) => sum + a.amount, 0);
}

/** The two default rows when the split section is switched on:
 *  row 1 mirrors the record's current primary category, row 2 is
 *  blank for the user to pick. Both rows inherit the entry shop
 *  (shopName ''). */
export function defaultSplitRows(categoryId: string, subCategoryId: string): SplitFormRow[] {
  return [
    { categoryId, subCategoryId, amount: '', note: '', shopName: '' },
    { categoryId: '', subCategoryId: '', amount: '', note: '', shopName: '' },
  ];
}

/** [v7.6.30] The row appended by "Add row": copies the LAST row's
 *  category + sub-category, so the user only re-picks when the
 *  category changes. [v7.6.41] The last row's shop carries over too
 *  (same-shop splits are the common case). Amount and note NEVER
 *  carry over (always start empty). A blank last row (or no rows at
 *  all) yields a blank row, exactly as before. The copied fields
 *  stay fully editable — starting values, not links. */
export function nextSplitRow(rows: SplitFormRow[]): SplitFormRow {
  const last = rows[rows.length - 1];
  return {
    categoryId: last?.categoryId || '',
    subCategoryId: last?.subCategoryId || '',
    amount: '',
    note: '',
    shopName: last?.shopName || '',
  };
}

/** Restore a stored split record into form rows (edit mode), or
 *  null when the record has no splits (section stays off). A stored
 *  row shop restores verbatim — even when it equals the entry shop:
 *  it was typed explicitly, so it must not silently become
 *  "inherit" and follow a later entry-shop edit. Rows that inherited
 *  (nothing stored) restore as '' and keep following the entry shop. */
export function splitRowsFromTransaction(tx: Transaction): SplitFormRow[] | null {
  if (!hasSplits(tx)) return null;
  return (tx.splits as TransactionSplit[]).map((s) => ({
    categoryId: s.categoryId || '',
    subCategoryId: s.subCategoryId || '',
    amount: s.amount > 0 ? String(s.amount) : '',
    note: s.note || '',
    shopName: (s.shopName || '').trim(),
  }));
}

/** Form rows → stored splits. Never drops a row: an empty category
 *  or a zero/blank amount survives as-is so validateSplits can
 *  reject it with the right reason at save time. A blank row shop
 *  (inherit) is never stored — the row reads the entry shop back. */
export function rowsToSplits(rows: SplitFormRow[]): TransactionSplit[] {
  return rows.map((r) => ({
    categoryId: r.categoryId,
    ...(r.subCategoryId ? { subCategoryId: r.subCategoryId } : {}),
    amount: parseMyanmarNumber(r.amount) || 0,
    ...(r.note.trim() ? { note: r.note.trim() } : {}),
    ...(r.shopName.trim() ? { shopName: r.shopName.trim() } : {}),
  }));
}

/**
 * "Remaining → this row": the amount that would make this row
 * absorb everything not assigned to the OTHER rows. Returns '' when
 * the remainder is not positive (nothing left to fill).
 */
export function fillRemainderAmount(total: number, rows: SplitFormRow[], index: number): string {
  const others = rows.reduce(
    (sum, r, i) => (i === index ? sum : sum + (parseMyanmarNumber(r.amount) || 0)),
    0,
  );
  const remainder = toKyat(total) - toKyat(others);
  return remainder > 0 ? String(remainder) : '';
}

/** Keep row 1 in sync with the primary category picker (two-way:
 *  the modal calls this when the primary pick changes, and updates
 *  the primary state when row 1 changes). Other rows untouched. */
export function syncSplitRowToPrimary(
  rows: SplitFormRow[],
  categoryId: string,
  subCategoryId: string,
): SplitFormRow[] {
  if (rows.length === 0) return rows;
  return rows.map((r, i) =>
    i === 0 ? { ...r, categoryId, subCategoryId } : r,
  );
}
