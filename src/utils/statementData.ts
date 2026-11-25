// [v7.6.27] PDF statement data — pure aggregation for the Reports
// "PDF စာရင်းရှင်းတမ်း" print view. The numbers MUST match the
// in-app Reports tab, so this reuses the same rules the Donut chart
// uses: split-aware attribution (getSplitAttribution), transfers
// excluded (isTransferTransaction), per-wallet currency conversion
// via an injected converter (the caller passes the same converter
// AnalyticsView uses). No second aggregation path: if Reports math
// changes, this follows it through the shared helpers.
import type { Category, Transaction } from '../types';
import { getSplitAttribution, hasSplits } from './transactionSplits';
import { isTransferTransaction } from './walletBalance';
import { getCategoryDisplayName } from './formatters';

export interface StatementSubRow {
  /** Empty/undefined sub-category groups under the General label. */
  subCategoryId: string | undefined;
  name: string;
  total: number;
  /** Share of the PARENT category (parent = 100%). Null when the
      parent total is 0 — displayed as '—', never NaN. */
  percent: number | null;
}

export interface StatementCategoryRow {
  categoryId: string;
  name: string;
  total: number;
  /** Share of TOTAL expense. Null when total expense is 0. */
  percent: number | null;
  /** Records touching this category (a split record counts once,
      under its first slice — same as the Donut chart). */
  count: number;
  subs: StatementSubRow[];
}

export interface StatementDetailRow {
  id: string;
  date: string;
  label: string;
  categoryName: string;
  subName: string | null;
  type: 'income' | 'expense';
  /** Converted (MMK) whole-record total. */
  amount: number;
  isSplit: boolean;
  splitCount: number;
}

export interface StatementData {
  /** Inclusive YYYY-MM-DD bounds; null = unbounded (all time). */
  start: string | null;
  end: string | null;
  income: number;
  expense: number;
  balance: number;
  /** Expense only, largest first. Zero-spend categories omitted. */
  categories: StatementCategoryRow[];
  /** Income + expense, oldest first. A split record appears ONCE
      with its whole total plus a split marker — the summaries above
      use split attribution, so summary totals still foot to the
      detail total. */
  details: StatementDetailRow[];
}

/** Whole-number percent, rounded like the Donut chart. Null when
    the denominator is 0 (v7.5.74 percent-null convention). */
export function percentOf(part: number, whole: number): number | null {
  if (!(whole > 0)) return null;
  return Math.round((part / whole) * 100);
}

/** Income-vs-expense shares of the total money flow, for the
    statement pie/donut chart (v7.6.36). The balance is NOT a
    slice — it is income minus expense — so only two shares
    exist; the balance is shown as the chart's centre label. */
export function flowShares(
  income: number,
  expense: number,
): { incomeShare: number; expenseShare: number } {
  const total = income + expense;
  if (!(total > 0)) return { incomeShare: 0, expenseShare: 0 };
  return { incomeShare: income / total, expenseShare: expense / total };
}

export interface StatementDetailGroup {
  /** Resolved display name of the sub-category; the General label
      when the record has no sub-category. */
  subName: string;
  rows: StatementDetailRow[];
}

export interface StatementCategoryGroup {
  /** Resolved display name of the category. */
  categoryName: string;
  subs: StatementDetailGroup[];
}

/** Group detail rows category → sub-category → records (v7.6.36).
    Category order follows the bar-chart section (data.categories,
    total desc); categories that appear only in the detail list
    (income categories — the chart is expense-only) follow after,
    ordered by their group total desc. Sub-category order follows
    the chart's sub order for charted categories, otherwise group
    total desc. Records keep the date-ascending order of
    data.details within each sub-group (the sort is stable and
    rows are appended in details order). */
export function groupStatementDetails(
  data: Pick<StatementData, 'categories' | 'details'>,
  generalLabel: string,
): StatementCategoryGroup[] {
  const chartOrder = new Map<string, number>();
  const chartSubs = new Map<string, string[]>();
  data.categories.forEach((cat, i) => {
    chartOrder.set(cat.name, i);
    chartSubs.set(cat.name, cat.subs.map((s) => s.name));
  });

  const byCat = new Map<string, Map<string, StatementDetailRow[]>>();
  for (const row of data.details) {
    let subs = byCat.get(row.categoryName);
    if (!subs) {
      subs = new Map();
      byCat.set(row.categoryName, subs);
    }
    const subKey = row.subName ?? generalLabel;
    const rows = subs.get(subKey);
    if (rows) rows.push(row);
    else subs.set(subKey, [row]);
  }

  const sum = (rows: StatementDetailRow[]) =>
    rows.reduce((s, r) => s + r.amount, 0);

  const groups: StatementCategoryGroup[] = Array.from(byCat.entries()).map(
    ([categoryName, subs]) => {
      const chartSubOrder = chartSubs.get(categoryName);
      const subGroups: StatementDetailGroup[] = Array.from(subs.entries()).map(
        ([subName, rows]) => ({ subName, rows }),
      );
      subGroups.sort((a, b) => {
        if (chartSubOrder) {
          const ai = chartSubOrder.indexOf(a.subName);
          const bi = chartSubOrder.indexOf(b.subName);
          if (ai !== -1 || bi !== -1) return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
        }
        return sum(b.rows) - sum(a.rows) || a.subName.localeCompare(b.subName);
      });
      return { categoryName, subs: subGroups };
    },
  );

  groups.sort((a, b) => {
    const ai = chartOrder.get(a.categoryName);
    const bi = chartOrder.get(b.categoryName);
    if (ai !== undefined || bi !== undefined) {
      return (ai === undefined ? 999 : ai) - (bi === undefined ? 999 : bi);
    }
    const at = a.subs.reduce((s, g) => s + sum(g.rows), 0);
    const bt = b.subs.reduce((s, g) => s + sum(g.rows), 0);
    return bt - at || a.categoryName.localeCompare(b.categoryName);
  });

  return groups;
}

function generalLabel(lang: 'my' | 'en'): string {
  return lang === 'my' ? 'အထွေထွေ' : 'General';
}

function resolveCategoryName(
  categoryId: string,
  categories: Category[],
  lang: 'my' | 'en',
): string {
  // getSplitAttribution normalises an empty category to 'other' —
  // that is the General bucket, not a real category id.
  if (!categoryId || categoryId === 'other') return generalLabel(lang);
  return getCategoryDisplayName(categoryId, categories, lang);
}

function resolveSubName(
  categoryId: string,
  subCategoryId: string | undefined,
  categories: Category[],
  lang: 'my' | 'en',
): string {
  if (!subCategoryId) return generalLabel(lang);
  const cat = categories.find((c) => c.id === categoryId);
  const sub = cat?.subCategories?.find((s) => s.id === subCategoryId);
  if (!sub) return generalLabel(lang);
  return lang === 'my' ? sub.name : sub.nameEn || sub.name;
}

function detailLabel(tx: Transaction, categories: Category[], lang: 'my' | 'en'): string {
  const names = (tx.items || [])
    .map((i) => i.name)
    .filter((n) => typeof n === 'string' && n.trim().length > 0);
  if (names.length > 0) {
    const first = names.slice(0, 2).join(' · ');
    return names.length > 2 ? `${first} · +${names.length - 2}` : first;
  }
  const note = tx.note?.trim();
  if (note) return note;
  // Pass the real category list: with [] the display-name helper falls
  // back to its legacy hardcoded map (e.g. 'အစားအသောက်နှင့် ကုန်စုံ'
  // for cat_food) instead of the user's actual category name.
  return resolveCategoryName(tx.category, categories, lang);
}

function inPeriod(tx: Transaction, start: string | null, end: string | null): boolean {
  // YYYY-MM-DD strings compare lexicographically. A dateless record
  // belongs to no bounded period but is included when unbounded.
  if (!tx.date) return start === null && end === null;
  if (start !== null && tx.date < start) return false;
  if (end !== null && tx.date > end) return false;
  return true;
}

export function buildStatementData(args: {
  transactions: Transaction[];
  categories: Category[];
  /** (tx, native amount) -> MMK. The caller passes AnalyticsView's
      wallet-aware converter so multi-currency records convert
      exactly as the on-screen totals do. */
  convertAmount: (tx: Transaction, amount: number) => number;
  start: string | null;
  end: string | null;
  lang: 'my' | 'en';
}): StatementData {
  const { transactions, categories, convertAmount, start, end, lang } = args;

  let income = 0;
  let expense = 0;
  const catMap = new Map<string, { total: number; count: number; subs: Map<string, number> }>();
  const details: StatementDetailRow[] = [];

  for (const tx of transactions) {
    if (isTransferTransaction(tx)) continue;
    if (!inPeriod(tx, start, end)) continue;
    const total = convertAmount(tx, tx.amount);
    if (tx.type === 'income') income += total;
    else expense += total;

    if (tx.type === 'expense') {
      getSplitAttribution(tx).forEach((slice, sliceIdx) => {
        const sliceTotal = convertAmount(tx, slice.amount);
        const entry = catMap.get(slice.categoryId) || { total: 0, count: 0, subs: new Map() };
        entry.total += sliceTotal;
        if (sliceIdx === 0) entry.count += 1;
        const subKey = slice.subCategoryId || '';
        entry.subs.set(subKey, (entry.subs.get(subKey) || 0) + sliceTotal);
        catMap.set(slice.categoryId, entry);
      });
    }

    details.push({
      id: tx.id,
      date: tx.date || '',
      label: detailLabel(tx, categories, lang),
      categoryName: resolveCategoryName(tx.category, categories, lang),
      subName: tx.subCategoryId
        ? resolveSubName(tx.category, tx.subCategoryId, categories, lang)
        : null,
      type: tx.type,
      amount: total,
      isSplit: hasSplits(tx),
      splitCount: tx.splits?.length ?? 0,
    });
  }

  details.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  const categoryRows: StatementCategoryRow[] = Array.from(catMap.entries())
    // Zero-spend categories never appear in the statement.
    .filter(([, entry]) => entry.total > 0)
    .map(([categoryId, entry]) => {
      const subs: StatementSubRow[] = Array.from(entry.subs.entries())
        .filter(([, subTotal]) => subTotal > 0)
        .map(([subKey, subTotal]) => ({
          subCategoryId: subKey || undefined,
          name: resolveSubName(categoryId, subKey || undefined, categories, lang),
          total: subTotal,
          percent: percentOf(subTotal, entry.total),
        }))
        .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
      return {
        categoryId,
        name: resolveCategoryName(categoryId, categories, lang),
        total: entry.total,
        percent: percentOf(entry.total, expense),
        count: entry.count,
        subs,
      };
    })
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));

  return {
    start,
    end,
    income,
    expense,
    balance: income - expense,
    categories: categoryRows,
    details,
  };
}
