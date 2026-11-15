import { useEffect } from 'react';

// [v7.5.55 E15] Consumes the search seed GlobalSearchModal dispatches when
// the user taps "View all" (or a row that only navigates): the destination
// list's search box is filled with the query, so the matching rows show.
// The event fires before the tab switch, and all tab views stay mounted
// (E14), so the listener is always live. The sessionStorage copy is cleared
// once consumed so a stale seed can never be applied later.
//
// [v7.5.87] Optional third param `onMode`: when the seed carries a
// `mode` (e.g. Price Compare tapping through to the Shops ITEM search),
// the destination applies it after the query. Kept generic (string) —
// validation lives in the caller, which only honours the modes it
// knows. Callers that do not pass onMode behave exactly as before.
export function useSearchSeed(
  tab: string,
  apply: (query: string) => void,
  onMode?: (mode: string) => void
) {
  useEffect(() => {
    const onSeed = (e: Event) => {
      const detail = (e as CustomEvent<{ tab?: string; query?: string; mode?: string }>).detail;
      if (detail?.tab === tab && detail.query) {
        apply(detail.query);
        if (detail.mode && onMode) onMode(detail.mode);
        try {
          sessionStorage.removeItem('ngwe_search_seed');
        } catch {
          /* ignore */
        }
      }
    };
    window.addEventListener('ngwe:search-seed', onSeed);
    return () => window.removeEventListener('ngwe:search-seed', onSeed);
  }, [tab, apply, onMode]);
}
