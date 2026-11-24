// [v7.5.94] Smart Calendar day-detail rows: the main line shows the
// sub-category name when the transaction has one (falling back to the
// category name), and the detail line shows the transaction's item
// names (winning over the note) so rows for the same category can be
// told apart. Pure helpers, unit-tested in calendarDetailLabels794.
// [v7.6.20] The detail line now shows each item's quantity / unit /
// price (the same per-item data the Records list item table shows),
// and the fuel line wins when a fuel log is linked — see
// formatCalendarDetailItemsDetailed / resolveCalendarDetailLine.
// The names-only formatCalendarDetailItems is unchanged.
// [v7.6.28] The main line now shows BOTH names when a sub-category
// exists — `category · sub-category` — so the parent category is
// readable as text, not only via the row icon.
import type { SubCategory, TransactionItem } from '../types';
import { formatMMK } from './formatters';
import { displayMenuUnit } from './shopMenuUpdate';

export function resolveCalendarDetailMainLabel(
  subCategoryId: string | undefined,
  category: { subCategories?: SubCategory[] } | undefined,
  categoryName: string,
  lang: 'my' | 'en',
): string {
  if (subCategoryId && category?.subCategories) {
    const sub = category.subCategories.find((s) => s.id === subCategoryId);
    if (sub) {
      const subName = lang === 'my' ? sub.name : sub.nameEn || sub.name;
      return `${categoryName} · ${subName}`;
    }
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

/**
 * [v7.6.20] Detailed item line for the Smart Calendar day detail:
 * each item renders as `name (price × qty unit)` — the same per-item
 * data the Records list item table shows (formatMMK price, raw
 * quantity, displayMenuUnit unit) — first 2 items, then `+N မျိုး`
 * / `more`, exactly like formatCalendarDetailItems. Items with a
 * blank name are skipped; null when nothing nameable is present, so
 * the note fallback still applies.
 */
export function formatCalendarDetailItemsDetailed(
  items: TransactionItem[] | undefined,
  lang: 'my' | 'en',
): string | null {
  if (!items) return null;
  const named = items.filter(
    (i) => typeof i.name === 'string' && i.name.trim().length > 0,
  );
  if (named.length === 0) return null;
  const render = (i: TransactionItem): string => {
    const unit = i.unit && i.unit.trim() ? ` ${displayMenuUnit(i.unit)}` : '';
    return `${i.name} (${formatMMK(i.price)} × ${i.quantity}${unit})`;
  };
  const shown = named.slice(0, 2).map(render).join(' · ');
  if (named.length <= 2) return shown;
  const extra = named.length - 2;
  return `${shown} · +${extra} ${lang === 'my' ? 'မျိုး' : 'more'}`;
}

/**
 * [v7.6.20] Day-detail detail-line precedence for one record: the
 * fuel line (with rate) wins when a fuel log is linked; otherwise
 * the detailed item line; otherwise null and the caller falls back
 * to the note, exactly as before. Pure, so the precedence is
 * unit-tested in calendarDetail7620.
 */
export function resolveCalendarDetailLine(
  fuelLine: string,
  items: TransactionItem[] | undefined,
  lang: 'my' | 'en',
): string | null {
  if (fuelLine) return fuelLine;
  return formatCalendarDetailItemsDetailed(items, lang);
}
