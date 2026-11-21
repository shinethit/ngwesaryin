// [v7.5.94] Smart Calendar day-detail rows: the main line shows the
// sub-category name when the transaction has one (falling back to the
// category name), and the detail line shows the transaction's item
// names (winning over the note) so rows for the same category can be
// told apart. Pure helpers, unit-tested in calendarDetailLabels794.
import type { SubCategory, TransactionItem } from '../types';

export function resolveCalendarDetailMainLabel(
  subCategoryId: string | undefined,
  category: { subCategories?: SubCategory[] } | undefined,
  categoryName: string,
  lang: 'my' | 'en',
): string {
  if (subCategoryId && category?.subCategories) {
    const sub = category.subCategories.find((s) => s.id === subCategoryId);
    if (sub) return lang === 'my' ? sub.name : sub.nameEn || sub.name;
  }
  return categoryName;
}

export function formatCalendarDetailItems(
  items: TransactionItem[] | undefined,
  lang: 'my' | 'en',
): string | null {
  if (!items) return null;
  const names = items
    .map((i) => i.name)
    .filter((n) => typeof n === 'string' && n.trim().length > 0);
  if (names.length === 0) return null;
  const shown = names.slice(0, 2).join(' · ');
  if (names.length <= 2) return shown;
  const extra = names.length - 2;
  return `${shown} · +${extra} ${lang === 'my' ? 'မျိုး' : 'more'}`;
}
