// [v7.6.17] Frequency ordering for the entry-form category picker.
// The sort already existed in CategoryPickerModal but counted from
// the OPTIONAL allTransactions prop, which TransactionModal never
// passed — so every count was 0 and the list fell back to pure
// alphabetical order. These pure helpers hold the ordering rules
// (tested directly in categoryFrequency7617.test.ts); the picker
// wires them to its own state, and TransactionModal passes its
// transactions in.
//
// Counting rule (mirrors TransactionModal's filteredCats): a
// transaction counts toward the active type tab when its type
// matches the tab, OR when it belongs to the transfer category
// (cat_transfer is shown on both tabs, so it keeps its
// cross-type count). Zero-use categories / sub-categories are
// NEVER hidden — they stay at the bottom in alphabetical order.
// Ties break alphabetically by display name, byte-identical to
// the picker's previous tie-break.
import type {
  Category,
  SubCategory,
  Transaction,
  TransactionType,
} from '../types';

type Lang = 'my' | 'en';

function displayName(
  item: { name: string; nameEn: string },
  lang: Lang,
): string {
  return lang === 'my' ? item.name : item.nameEn;
}

function countsForTab(t: Transaction, activeType: TransactionType): boolean {
  return t.type === activeType || t.category === 'cat_transfer';
}

function byCountThenName(
  countA: number,
  countB: number,
  a: { name: string; nameEn: string },
  b: { name: string; nameEn: string },
  lang: Lang,
): number {
  if (countB !== countA) return countB - countA;
  return displayName(a, lang).localeCompare(displayName(b, lang));
}

/** Categories most-used first (scoped to the active type tab). */
export function sortCategoriesByFrequency(
  categories: Category[],
  transactions: Transaction[] | undefined,
  activeType: TransactionType,
  lang: Lang,
): Category[] {
  const countMap = new Map<string, number>();
  if (transactions && transactions.length > 0) {
    transactions.forEach((t) => {
      if (t.category && countsForTab(t, activeType)) {
        countMap.set(t.category, (countMap.get(t.category) || 0) + 1);
      }
    });
  }
  return [...categories].sort((a, b) =>
    byCountThenName(
      countMap.get(a.id) || 0,
      countMap.get(b.id) || 0,
      a,
      b,
      lang,
    ),
  );
}

/** Sub-categories of one category, most-used first (same tab scoping). */
export function sortSubCategoriesByFrequency(
  subCategories: SubCategory[],
  transactions: Transaction[] | undefined,
  categoryId: string,
  activeType: TransactionType,
  lang: Lang,
): SubCategory[] {
  const countMap = new Map<string, number>();
  if (transactions && transactions.length > 0) {
    transactions.forEach((t) => {
      if (
        t.category === categoryId &&
        t.subCategoryId &&
        countsForTab(t, activeType)
      ) {
        countMap.set(
          t.subCategoryId,
          (countMap.get(t.subCategoryId) || 0) + 1,
        );
      }
    });
  }
  return [...subCategories].sort((a, b) =>
    byCountThenName(
      countMap.get(a.id) || 0,
      countMap.get(b.id) || 0,
      a,
      b,
      lang,
    ),
  );
}
