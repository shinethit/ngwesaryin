import { useEffect } from 'react';

// [v7.5.55 E15] Consumes the search seed GlobalSearchModal dispatches when
// the user taps "View all" (or a row that only navigates): the destination
// list's search box is filled with the query, so the matching rows show.
// The event fires before the tab switch, and all tab views stay mounted
// (E14), so the listener is always live. The sessionStorage copy is cleared
// once consumed so a stale seed can never be applied later.
export function useSearchSeed(tab: string, apply: (query: string) => void) {
  useEffect(() => {
    const onSeed = (e: Event) => {
      const detail = (e as CustomEvent<{ tab?: string; query?: string }>).detail;
      if (detail?.tab === tab && detail.query) {
        apply(detail.query);
        try {
          sessionStorage.removeItem('ngwe_search_seed');
        } catch {
          /* ignore */
        }
      }
    };
    window.addEventListener('ngwe:search-seed', onSeed);
    return () => window.removeEventListener('ngwe:search-seed', onSeed);
  }, [tab, apply]);
}
