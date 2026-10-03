import { Category, Transaction } from '../types';

export interface UnifiedItemInfo {
  name: string;
  normalizedName: string;
  latestPrice: number;
  latestDate: string;
  categoryId?: string;
  subCategoryId?: string;
  source: 'shopping_item' | 'unit_price' | 'note' | 'subcategory';
  frequency: number;
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

    const norm = cleanName.toLowerCase();
    const existing = itemMap.get(norm);

    if (!existing) {
      itemMap.set(norm, {
        name: cleanName,
        normalizedName: norm,
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
  const clean = query.trim().toLowerCase();

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
