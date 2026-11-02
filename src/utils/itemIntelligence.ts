import { Category, Transaction } from '../types';

export interface UnifiedItemInfo {
  name: string;
  normalizedName: string;
  /** Unit derived from the name, e.g. "ပြည်" / "kg" — "" when unknown. */
  unit?: string;
  latestPrice: number;
  latestDate: string;
  categoryId?: string;
  subCategoryId?: string;
  source: 'shopping_item' | 'unit_price' | 'note' | 'subcategory';
  frequency: number;
}

// [v7.5.53] Smarter item-name matching for price comparison.
// The old code only lowercased the name, so "ဆန်", "ဆန် ၁ပြည်" and
// "ဆန် 1 ပြည်" were treated as three different items and their prices
// were never compared. This normalizer:
//  - converts Myanmar digits (၀-၉) to Latin digits,
//  - strips a trailing quantity (number and/or unit word, e.g. "1 ပြည်",
//    "10လုံး", "350ml") and returns it as the unit, so the same item in
//    different pack sizes still groups together, while different units
//    (kg vs ပြည်) stay separate and are never averaged together.
const MYANMAR_DIGITS: Record<string, string> = {
  '၀': '0', '၁': '1', '၂': '2', '၃': '3', '၄': '4',
  '၅': '5', '၆': '6', '၇': '7', '၈': '8', '၉': '9',
};

const ITEM_UNIT_WORDS = new Set([
  // Myanmar units
  'ပြည်', 'လုံး', 'ကီလို', 'ကီလိုဂရမ်', 'ဂရမ်', 'ထုပ်', 'ဘူး', 'ပုလင်း',
  'ဗူး', 'အိတ်', 'ပိဿာ', 'ကျပ်သား', 'ခု', 'ချောင်း', 'ပါကင်', 'ဖာ',
  'ကတ်', 'လီတာ', 'ဒါဇင်', 'ခွက်', 'ဇွန်း', 'တင်း', 'စား',
  // English units
  'kg', 'g', 'mg', 'ml', 'l', 'pcs', 'pc', 'pack', 'box', 'bottle',
  'litre', 'liter', 'can', 'dozen',
]);

export interface NormalizedItemName {
  /** Lowercased base name, quantity stripped — the grouping key. */
  key: string;
  /** Base name with original casing, quantity stripped — for display. */
  display: string;
  /** Unit word stripped from the end, "" when none. */
  unit: string;
}

export function normalizeItemName(rawName: string): NormalizedItemName {
  const empty = { key: '', display: '', unit: '' };
  if (!rawName) return empty;
  const converted = rawName.replace(/[၀-၉]/g, (d) => MYANMAR_DIGITS[d] ?? d);
  const collapsed = converted.trim().replace(/\s+/g, ' ');
  if (!collapsed) return empty;

  const tokens = collapsed.split(' ');
  let unit = '';
  const isUnitWord = (t: string) => ITEM_UNIT_WORDS.has(t.toLowerCase());
  const isPureNumber = (t: string) => /^\d+([.,]\d+)?$/.test(t);
  const gluedUnit = (t: string): string | null => {
    const m = /^(\d+(?:[.,]\d+)?)(.+)$/.exec(t);
    if (m && isUnitWord(m[2])) return m[2].toLowerCase();
    return null;
  };

  // Strip trailing quantity tokens ("1 ပြည်", "10လုံး", "350ml", "10"),
  // but never strip the last remaining token.
  while (tokens.length > 1) {
    const last = tokens[tokens.length - 1];
    const glued = gluedUnit(last);
    if (glued) {
      if (!unit) unit = glued;
      tokens.pop();
      continue;
    }
    if (isUnitWord(last)) {
      if (!unit) unit = last.toLowerCase();
      tokens.pop();
      continue;
    }
    if (isPureNumber(last)) {
      tokens.pop();
      continue;
    }
    break;
  }

  const display = tokens.join(' ');
  if (!display) return empty;
  return { key: display.toLowerCase(), display, unit };
}

/**
 * Extracts and aggregates all historical item names, past prices, and categories across:
 * 1. Shopping list items (t.items)
 * 2. Unit price x quantity items (t.unitPrice, t.quantity, t.note)
 * 3. Direct transaction notes (t.note, t.amount)
 * 4. SubCategories (cat.subCategories)
 */
export function getAllItemSuggestions(
  transactions: Transaction[] = [],
  categories: Category[] = []
): UnifiedItemInfo[] {
  const itemMap = new Map<string, UnifiedItemInfo>();

  // Helper to record or update an item
  const recordItem = (
    rawName: string | undefined,
    price: number,
    date: string,
    categoryId?: string,
    subCategoryId?: string,
    source: 'shopping_item' | 'unit_price' | 'note' | 'subcategory' = 'note'
  ) => {
    if (!rawName) return;
    const cleanName = rawName.trim();
    if (cleanName.length < 1) return;

    // Filter out pure numbers or special symbols
    if (/^\d+$/.test(cleanName)) return;

    // [v7.5.53] Group by normalized name so "ဆန်", "ဆန် ၁ပြည်" and
    // "ဆန် 1 ပြည်" count as one item; the stripped unit is kept for display.
    const norm = normalizeItemName(cleanName);
    if (!norm.key) return;
    const existing = itemMap.get(norm.key);

    if (!existing) {
      itemMap.set(norm.key, {
        name: norm.display,
        normalizedName: norm.key,
        unit: norm.unit || undefined,
        latestPrice: price > 0 ? price : 0,
        latestDate: date || new Date().toISOString().split('T')[0],
        categoryId,
        subCategoryId,
        source,
        frequency: 1,
      });
    } else {
      existing.frequency += 1;
      // If this transaction is newer, update price, date, and category associations
      if (date && date >= existing.latestDate && price > 0) {
        existing.latestPrice = price;
        existing.latestDate = date;
        if (categoryId) existing.categoryId = categoryId;
        if (subCategoryId) existing.subCategoryId = subCategoryId;
        existing.source = source;
      } else if (existing.latestPrice <= 0 && price > 0) {
        existing.latestPrice = price;
      }
    }
  };

  // 1. Scan all transactions (sorted ascending by date so newest takes precedence)
  const sortedTxs = [...transactions].sort((a, b) => {
    const aTime = new Date(a.date).getTime() || 0;
    const bTime = new Date(b.date).getTime() || 0;
    return aTime - bTime;
  });

  sortedTxs.forEach((tx) => {
    const txDate = tx.date;
    const catId = tx.category;
    const subCatId = tx.subCategoryId;

    // A. Shopping list items
    if (tx.items && tx.items.length > 0) {
      tx.items.forEach((item) => {
        if (item.name) {
          const unitPrice =
            item.price > 0
              ? item.price
              : item.quantity > 0 && item.amount
              ? Math.round(item.amount / item.quantity)
              : item.amount || 0;

          recordItem(item.name, unitPrice, txDate, catId, subCatId, 'shopping_item');
        }
      });
    }

    // B. Unit Price x Quantity transactions
    if (tx.unitPrice && tx.unitPrice > 0 && tx.note) {
      recordItem(tx.note, tx.unitPrice, txDate, catId, subCatId, 'unit_price');
    }

    // C. Direct Note transactions
    if (tx.note && tx.note.trim()) {
      // If note contains multi-item formula (e.g. "ကြက်သား + ဆီ"), split or record
      const noteStr = tx.note.trim();
      const unitAmount = tx.amount || 0;
      recordItem(noteStr, unitAmount, txDate, catId, subCatId, 'note');
    }
  });

  // 2. Scan categories and subcategories
  categories.forEach((cat) => {
    if (cat.subCategories && cat.subCategories.length > 0) {
      cat.subCategories.forEach((sub) => {
        if (sub.name) {
          recordItem(sub.name, 0, '', cat.id, sub.id, 'subcategory');
        }
      });
    }
  });

  // Convert to array and sort by frequency (descending) then latest date (descending)
  return Array.from(itemMap.values()).sort((a, b) => {
    if (b.frequency !== a.frequency) {
      return b.frequency - a.frequency;
    }
    return (b.latestDate || '').localeCompare(a.latestDate || '');
  });
}

/**
 * Searches and finds the best matching item from the unified database items
 */
export function findMatchingItemInfo(
  query: string,
  items: UnifiedItemInfo[]
): UnifiedItemInfo | null {
  if (!query || query.trim().length === 0) return null;
  // [v7.5.53] Normalize the query the same way, so typing "ဆန် ၁ပြည်"
  // finds the "ဆန်" entry and its last price.
  const clean = normalizeItemName(query).key;
  if (!clean) return null;

  // 1. Exact match
  const exact = items.find((it) => it.normalizedName === clean);
  if (exact) return exact;

  // 2. Starts with match
  const startsWith = items.find((it) => it.normalizedName.startsWith(clean));
  if (startsWith) return startsWith;

  // 3. Substring match
  const includes = items.find((it) => it.normalizedName.includes(clean));
  return includes || null;
}
