/**
 * [v7.6.41] Records search debounce — the Part D input-lag fix.
 *
 * MEASURED (production build, Playwright 390px, guest, seeded data —
 * harness: render-390/perf-7641.mjs + anatomy-7641.mjs, BEFORE = v7.6.40):
 * - 1,000 shops / 500 txns: Records search first keystrokes echoed in
 *   252ms then 169ms (keystroke→paint, double-rAF); steady state ~30ms.
 *   The list mounts 23,080 DOM nodes (30 visible days); each keystroke
 *   re-filtered + reconciled the whole list (250 nodes removed on the
 *   2nd keystroke alone).
 * - Entry-form note field: ~28ms median. Shop-name field (1,000-shop
 *   datalist): 8–21ms. Shops search: ~29ms. Idle after settle: zero
 *   long tasks — no runaway timer; the churn is boot + first-filter
 *   cost, not a background loop.
 * - Boot: dozens of 50–90ms main-thread tasks + spikes to 1,087ms
 *   (mounting every tab + the full list at once).
 * On a phone CPU (~3–4x slower than the harness VM) the 170–250ms
 * first-key echo becomes ~0.5–1s of visible stutter — the reported
 * "typed text does not appear immediately".
 *
 * FIX: the search input keeps showing `searchTerm` at once (immediate
 * echo) while the list filters on `debouncedSearchTerm` (150ms — the
 * same delay ShopsView already uses for its item query), so fast
 * typing re-filters once per pause instead of once per keystroke.
 * No behavior change: same results, same controls, same 30-day
 * pagination (reset once per pause, not per keystroke).
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';

const TX_VIEW_SRC = fs.readFileSync(
  new URL('../../components/TransactionsView.tsx', import.meta.url),
  'utf8',
);

describe('Records search debounce (v7.6.41 Part D)', () => {
  it('the list filters on a debounced term, 150ms like ShopsView', () => {
    expect(TX_VIEW_SRC).toContain('debouncedSearchTerm');
    expect(TX_VIEW_SRC).toContain(
      'setTimeout(() => setDebouncedSearchTerm(searchTerm), 150)',
    );
    // The debounced term drives the filter, not the raw keystrokes.
    expect(TX_VIEW_SRC).toContain('if (debouncedSearchTerm.trim())');
    expect(TX_VIEW_SRC).toContain('debouncedSearchTerm, catMap, subCatMap');
  });

  it('the input itself stays immediate (echo is not debounced)', () => {
    expect(TX_VIEW_SRC).toContain('value={searchTerm}');
    expect(TX_VIEW_SRC).toContain('onChange={(e) => setSearchTerm(e.target.value)}');
    expect(TX_VIEW_SRC).not.toContain('value={debouncedSearchTerm}');
  });

  it('pagination reset + filter notice follow the applied (debounced) term', () => {
    expect(TX_VIEW_SRC).toContain(
      '}, [typeFilter, timeFilter, debouncedSearchTerm, selectedCategory',
    );
    expect(TX_VIEW_SRC).toContain('searchTerm: debouncedSearchTerm })');
  });

  it('a global-search seed still lands in the box (then debounces)', () => {
    expect(TX_VIEW_SRC).toContain("useSearchSeed('transactions', setSearchTerm);");
  });
});
