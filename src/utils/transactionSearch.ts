import type { Category, SubCategory, Transaction, Wallet } from '../types';
import { getSplitAttribution } from './transactionSplits';
import { toLatinDigits, toMyanmarDigits } from './myanmarDigits';

// [v7.6.44] Records-search index: the per-transaction work for the
// search filter, done ONCE per data change instead of once per
// filter run.
//
// Before, the `filtered` memo in TransactionsView lower-cased every
// field, joined item names, ran getSplitAttribution, and built
// `new Date()` values INSIDE the sort comparator — on every debounced
// filter run over the whole list (measured 289ms spike at 1,500
// records). The memo still re-ran only on the debounced term, but
// each run paid the full per-transaction cost. The index below pays
// it once; a filter run is then one `includes` per field per record
// plus a numeric sort on precomputed keys. Match semantics are
// EXACTLY the pre-7.6.44 predicate (same fields, same normalisation,
// same amount/Myanmar-digit rules) — only the timing of the
// lower-casing/joining moved.
export interface TransactionSearchEntry {
  tx: Transaction;
  catName: string;
  catNameEn: string;
  subName: string;
  subNameEn: string;
  note: string;
  itemNames: string;
  shopName: string;
  rowShopNames: string;
  walletName: string;
  amountLatin: string;
  amountMyanmar: string;
  dateMs: number;
  createdMs: number;
}

function dateMsOf(date: string): number {
  return new Date(date).getTime() || 0;
}

function createdMsOf(tx: Transaction): number {
  if (typeof tx.createdAt === 'number') return tx.createdAt;
  return new Date(tx.createdAt || tx.date).getTime() || 0;
}

export function buildTransactionSearchIndex(
  transactions: Transaction[],
  catMap: Map<string, Category>,
  subCatMap: Map<string, Pick<SubCategory, 'name' | 'nameEn'>>,
  walletMap: Map<string, Wallet>,
): TransactionSearchEntry[] {
  return transactions.map((t) => {
    const cat = catMap.get(t.category);
    const subCat = t.subCategoryId ? subCatMap.get(t.subCategoryId) : undefined;
    const wallet = walletMap.get(t.walletId);
    const amountLatin = String(t.amount);
    return {
      tx: t,
      catName: (cat?.name || '').toLowerCase(),
      catNameEn: (cat?.nameEn || '').toLowerCase(),
      subName: (subCat?.name || '').toLowerCase(),
      subNameEn: (subCat?.nameEn || '').toLowerCase(),
      note: (t.note || '').toLowerCase(),
      itemNames: (t.items || []).map((it) => (it.name || '').toLowerCase()).join(' '),
      shopName: (t.shopName || '').toLowerCase(),
      // [v7.6.41] A split record matches a shop search when ANY row
      // carries that shop, not only the entry-level shop name.
      rowShopNames: getSplitAttribution(t)
        .map((a) => (a.shopName || '').toLowerCase())
        .join(' '),
      walletName: ((wallet?.name || '') + ' ' + (wallet?.nameEn || '')).toLowerCase(),
      amountLatin,
      amountMyanmar: toMyanmarDigits(amountLatin),
      dateMs: dateMsOf(t.date),
      createdMs: createdMsOf(t),
    };
  });
}

/** Normalise a raw search query exactly as the Records filter does. */
export function normalizeTransactionSearchQuery(rawQuery: string): { query: string; queryNoComma: string } {
  const query = toLatinDigits(rawQuery.trim().toLowerCase());
  return { query, queryNoComma: query.replace(/,/g, '') };
}

/**
 * The search half of the Records predicate, over a prebuilt entry.
 * `query`/`queryNoComma` come from normalizeTransactionSearchQuery.
 * Identical decisions to the pre-7.6.44 inline predicate.
 */
export function transactionSearchEntryMatches(
  entry: TransactionSearchEntry,
  query: string,
  queryNoComma: string,
): boolean {
  return (
    entry.catName.includes(query) ||
    entry.catNameEn.includes(query) ||
    entry.subName.includes(query) ||
    entry.subNameEn.includes(query) ||
    entry.note.includes(query) ||
    entry.itemNames.includes(query) ||
    entry.shopName.includes(query) ||
    entry.rowShopNames.includes(query) ||
    entry.walletName.includes(query) ||
    (!!queryNoComma && entry.amountLatin.includes(queryNoComma)) ||
    (!!queryNoComma && entry.amountMyanmar.includes(toMyanmarDigits(queryNoComma)))
  );
}

/** Newest-first order, identical to the pre-7.6.44 sort. */
export function compareTransactionSearchEntries(a: TransactionSearchEntry, b: TransactionSearchEntry): number {
  if (b.dateMs !== a.dateMs) return b.dateMs - a.dateMs;
  return b.createdMs - a.createdMs;
}
