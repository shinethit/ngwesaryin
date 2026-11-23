// [v7.6.16] Filter-notice gate for the Records list.
//
// A wallet pick is a SCOPE choice (like the Dashboard wallet
// filter, which shows no such banner), not a "you are missing
// records" warning. The amber notice bar therefore shows only
// when the shown count is reduced AND at least one NON-WALLET
// record filter is active. Wallet state never satisfies the
// predicate on its own, and the financial-system toggle does
// not affect the filtered count, so it is not part of the
// predicate either.
export interface FilterNoticeFilterState {
  typeFilter: string;
  effectiveDataScope: string;
  timeFilter: string;
  selectedCategory: string;
  searchTerm: string;
}

/**
 * Whether the amber "Filter active" notice bar should render:
 * the list is reduced AND a non-wallet filter is active. A
 * wallet-only pick (reduced count, no non-wallet filter) hides
 * the bar; no filters at all hides it too.
 */
export function shouldShowFilterNotice(
  totalCount: number,
  shownCount: number,
  filters: FilterNoticeFilterState,
): boolean {
  if (!(totalCount > 0 && shownCount < totalCount)) return false;
  return (
    filters.typeFilter !== 'all' ||
    filters.effectiveDataScope !== 'all' ||
    filters.timeFilter !== 'all' ||
    filters.selectedCategory !== 'all' ||
    filters.searchTerm.trim() !== ''
  );
}
