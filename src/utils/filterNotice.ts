// [v7.6.16] Filter-notice gate for the Records list; scope
// refined in v7.6.19 (see below).
//
// A wallet pick is a SCOPE choice (like the Dashboard wallet
// filter, which shows no such banner), not a "you are missing
// records" warning — and the data-scope pills (All / Personal /
// Shared) are part of that same wallet-scope choice, not a
// content filter. The amber notice bar therefore shows only
// when the shown count is reduced AND at least one CONTENT
// filter is active (type, time, category, or search). Wallet
// and scope state never satisfy the predicate on their own,
// and the financial-system toggle does not affect the filtered
// count, so it is not part of the predicate either.
export interface FilterNoticeFilterState {
  typeFilter: string;
  timeFilter: string;
  selectedCategory: string;
  searchTerm: string;
}

/**
 * Whether the amber "Filter active" notice bar should render:
 * the list is reduced AND a content filter is active. A
 * wallet-only or scope-only pick (reduced count, no content
 * filter) hides the bar; no filters at all hides it too.
 */
export function shouldShowFilterNotice(
  totalCount: number,
  shownCount: number,
  filters: FilterNoticeFilterState,
): boolean {
  if (!(totalCount > 0 && shownCount < totalCount)) return false;
  return (
    filters.typeFilter !== 'all' ||
    filters.timeFilter !== 'all' ||
    filters.selectedCategory !== 'all' ||
    filters.searchTerm.trim() !== ''
  );
}
