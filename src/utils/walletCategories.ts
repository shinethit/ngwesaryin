// [v7.6.31] Per-wallet category visibility — ONE place.
//
// The wallet carries a DENYLIST (`Wallet.hiddenCategoryIds`, opt-OUT):
// a category id listed there is hidden from THAT wallet's entry-form
// pickers only. Absent/undefined/empty means every category is
// visible, so wallets created before v7.6.31 and every category
// added later behave exactly as before until the owner hides it.
//
// Rules, all enforced here so every caller agrees:
//   - Sub-categories follow their PARENT: hiding a parent hides its
//     subs. There are no per-sub-category ids in the list, and the
//     filter runs at category level only.
//   - `cat_transfer` is NEVER hidden: the transfer form has no
//     picker, and the helper must still never exclude it even if a
//     stale denylist names it.
//   - `alwaysIncludeIds` (the record being edited / the form's
//     current selection) is always shown, even when hidden in this
//     wallet — editing a record must never strand its own category.
//   - Reports, Records filter, Analytics, Budget, Price Compare and
//     CategoriesView never call this: the denylist affects ONLY the
//     entry-form pickers (TransactionModal main + split-row).
//   - Inputs are never mutated; the result is a new array in the
//     caller's original order.
import { Category, Wallet } from '../types';

export const TRANSFER_CATEGORY_ID = 'cat_transfer';

export function isCategoryHiddenForWallet(
  categoryId: string | undefined | null,
  wallet: Wallet | null | undefined,
): boolean {
  if (!categoryId) return false;
  // Defensive: the transfer category is never hidden.
  if (categoryId === TRANSFER_CATEGORY_ID) return false;
  if (!wallet) return false;
  const hidden = wallet.hiddenCategoryIds;
  if (!Array.isArray(hidden) || hidden.length === 0) return false;
  return hidden.includes(categoryId);
}

export function getVisibleCategories(
  categories: Category[],
  wallet: Wallet | null | undefined,
  alwaysIncludeIds?: Iterable<string | undefined | null>,
): Category[] {
  const alwaysInclude = new Set<string>();
  if (alwaysIncludeIds) {
    for (const id of alwaysIncludeIds) {
      if (id) alwaysInclude.add(id);
    }
  }
  // No denylist (or no wallet yet — the form has no wallet selected):
  // everything is visible. Still a fresh array: callers may sort it.
  if (!wallet || !Array.isArray(wallet.hiddenCategoryIds) || wallet.hiddenCategoryIds.length === 0) {
    return [...categories];
  }
  const hidden = new Set(wallet.hiddenCategoryIds);
  return categories.filter(
    (c) => c.id === TRANSFER_CATEGORY_ID || alwaysInclude.has(c.id) || !hidden.has(c.id),
  );
}
