// [v7.6.26] CSV export data: labels + row order for the CSV file,
// exactly as the old Records export built them (v7.5.55). The
// Records header button moved to Data Management, which exports ALL
// transactions (no filters there) — the labels, columns (via
// exportToCSV) and row order are unchanged. No filtering happens
// here: the caller passes the rows to export.

import type { Category, Transaction, Wallet } from '../types';

export interface CsvExportData {
  rows: Transaction[];
  catLabels: Record<string, string>;
  walletLabels: Record<string, string>;
  subCatLabels: Record<string, string>;
}

/**
 * Build everything exportToCSV needs: `Name (NameEn)` labels for
 * categories / sub-categories, wallet names, and the rows sorted
 * newest-first (date desc, then createdAt desc) — the same order
 * the Records list's `filtered` memo produced. The input array is
 * never mutated.
 */
export function buildCsvExportData(
  transactions: Transaction[],
  categories: Category[],
  wallets: Wallet[],
): CsvExportData {
  const catLabels: Record<string, string> = {};
  const subCatLabels: Record<string, string> = {};
  categories.forEach((c) => {
    catLabels[c.id] = `${c.name} (${c.nameEn})`;
    (c.subCategories || []).forEach((s) => {
      subCatLabels[s.id] = `${s.name} (${s.nameEn})`;
    });
  });
  const walletLabels: Record<string, string> = {};
  wallets.forEach((w) => {
    walletLabels[w.id] = w.name;
  });
  const rows = [...transactions].sort((a, b) => {
    const bDate = new Date(b.date).getTime() || 0;
    const aDate = new Date(a.date).getTime() || 0;
    if (bDate !== aDate) return bDate - aDate;
    const bCreated =
      typeof b.createdAt === 'number'
        ? b.createdAt
        : new Date(b.createdAt || b.date).getTime() || 0;
    const aCreated =
      typeof a.createdAt === 'number'
        ? a.createdAt
        : new Date(a.createdAt || a.date).getTime() || 0;
    return bCreated - aCreated;
  });
  return { rows, catLabels, walletLabels, subCatLabels };
}
