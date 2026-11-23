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

import type { Transaction, TransactionSplit } from '../types';
import { parseMyanmarNumber } from './myanmarDigits';

/** One category slice of a record, in the record's wallet currency. */
export interface SplitAttribution {
  categoryId: string;
  subCategoryId?: string;
  amount: number;
  note?: string;
}

/** A form row in the TransactionModal split section. Amounts stay
 *  strings here (Myanmar digits allowed) until save time. */
export interface SplitFormRow {
  categoryId: string;
  subCategoryId: string;
  amount: string;
  note: string;
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
 * Per-category attribution of a record. Splits present/non-empty →
 * one attribution per split row (in stored order; the first row is
 * the primary). Otherwise the whole amount under the record's own
 * category/sub-category — today's behaviour exactly. A split row
 * with a non-finite amount contributes 0 rather than NaN (corrupt
 * stored data must never poison a report total).
 */
export function getSplitAttribution(tx: Transaction): SplitAttribution[] {
  if (hasSplits(tx)) {
    return (tx.splits as TransactionSplit[]).map((s) => ({
      categoryId: s.categoryId || 'other',
      subCategoryId: s.subCategoryId || undefined,
      amount: isFiniteNumber(s.amount) ? s.amount : 0,
      note: s.note || undefined,
    }));
  }
  return [
    {
      categoryId: tx.category || 'other',
      subCategoryId: tx.subCategoryId || undefined,
      amount: isFiniteNumber(tx.amount) ? tx.amount : 0,
    },
  ];
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
 *  blank for the user to pick. */
export function defaultSplitRows(categoryId: string, subCategoryId: string): SplitFormRow[] {
  return [
    { categoryId, subCategoryId, amount: '', note: '' },
    { categoryId: '', subCategoryId: '', amount: '', note: '' },
  ];
}

/** Restore a stored split record into form rows (edit mode), or
 *  null when the record has no splits (section stays off). */
export function splitRowsFromTransaction(tx: Transaction): SplitFormRow[] | null {
  if (!hasSplits(tx)) return null;
  return (tx.splits as TransactionSplit[]).map((s) => ({
    categoryId: s.categoryId || '',
    subCategoryId: s.subCategoryId || '',
    amount: s.amount > 0 ? String(s.amount) : '',
    note: s.note || '',
  }));
}

/** Form rows → stored splits. Never drops a row: an empty category
 *  or a zero/blank amount survives as-is so validateSplits can
 *  reject it with the right reason at save time. */
export function rowsToSplits(rows: SplitFormRow[]): TransactionSplit[] {
  return rows.map((r) => ({
    categoryId: r.categoryId,
    ...(r.subCategoryId ? { subCategoryId: r.subCategoryId } : {}),
    amount: parseMyanmarNumber(r.amount) || 0,
    ...(r.note.trim() ? { note: r.note.trim() } : {}),
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
