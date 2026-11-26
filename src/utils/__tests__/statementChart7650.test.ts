// [v7.6.51] PDF stacked-column chart + Dashboard compacting: the
// statement's per-category/per-sub horizontal bars are replaced by
// ONE hand-rolled SVG stacked-column chart (print-safe, like the
// donut — no recharts in the print flow); the Dashboard header is
// one row, Quick Access is one row of 6, the period + sync controls
// moved into the Hero gap, and the duplicate Dashboard search
// button is removed. Wiring pins are source-text assertions (no
// test renderer in this repo; vitest node env). NO path
// comparisons: sources are read via new URL(..., import.meta.url).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  CURRENT_APP_VERSION,
  CURRENT_BUILD_NUMBER,
  VERSION_HISTORY,
} from '../../data/versionHistory';

const VERSION_JSON = JSON.parse(
  readFileSync(new URL('../../../public/version.json', import.meta.url), 'utf8'),
) as { version: string; buildNumber: number; changesMy: string[]; changesEn: string[] };

const DASH_SRC = readFileSync(
  new URL('../../components/Dashboard.tsx', import.meta.url),
  'utf8',
);
const PRINT_VIEW_SRC = readFileSync(
  new URL('../../components/StatementPrintView.tsx', import.meta.url),
  'utf8',
);
const CSS_SRC = readFileSync(new URL('../../index.css', import.meta.url), 'utf8');
const APP_SRC = readFileSync(new URL('../../App.tsx', import.meta.url), 'utf8');
const NAVBAR_SRC = readFileSync(
  new URL('../../components/Navbar.tsx', import.meta.url),
  'utf8',
);
const SIDEBAR_SRC = readFileSync(
  new URL('../../components/Sidebar.tsx', import.meta.url),
  'utf8',
);
const TXN_SRC = readFileSync(
  new URL('../../components/TransactionsView.tsx', import.meta.url),
  'utf8',
);

function count(src: string, needle: string): number {
  return src.split(needle).length - 1;
}

describe('PDF stacked-column chart (v7.6.51 item 1)', () => {
  it('renders one hand-rolled SVG chart, capped columns + legend, no bars, no recharts', () => {
    expect(PRINT_VIEW_SRC).toContain('stmt-chart-svg');
    expect(PRINT_VIEW_SRC).toContain('CHART_MAX_COLUMNS = 8');
    expect(PRINT_VIEW_SRC).toContain('CHART_SEGMENT_COLORS');
    expect(PRINT_VIEW_SRC).toContain('stmt-chart-legend');
    expect(PRINT_VIEW_SRC).toContain('truncateChartLabel');
    expect(PRINT_VIEW_SRC).toContain('formatLakhs');
    expect(PRINT_VIEW_SRC).toContain('stmt-chart-seg-text');
    expect(PRINT_VIEW_SRC).toContain('stmt-donut');
    expect(PRINT_VIEW_SRC).toContain('stmt-group-row');
    expect(PRINT_VIEW_SRC).not.toContain('stmt-bar-fill');
    expect(PRINT_VIEW_SRC).not.toContain('stmt-bars');
    expect(PRINT_VIEW_SRC).not.toContain('recharts');
    expect(PRINT_VIEW_SRC).not.toContain('BarChart');
  });

  it('keeps the % explainer note and the detail table', () => {
    expect(PRINT_VIEW_SRC).toContain('stmt-chart-note');
    expect(PRINT_VIEW_SRC).toContain('groupStatementDetails');
    expect(PRINT_VIEW_SRC).toContain('Detailed records');
  });

  it('chart CSS exists and the bar CSS is gone', () => {
    expect(CSS_SRC).toContain('stmt-chart-svg');
    expect(CSS_SRC).toContain('stmt-chart-seg-text');
    expect(CSS_SRC).toContain('stmt-chart-legend-row');
    expect(CSS_SRC).not.toContain('stmt-bar-fill');
    expect(CSS_SRC).not.toContain('stmt-bar-track');
  });
});

describe('Dashboard one-row header + Hero gap (v7.6.51 items 2, 4, 5)', () => {
  it('header is one row: date + wallet pill, no wallet-count subline', () => {
    // [v7.6.51 render fix] gap-1.5 (was gap-2): the full date only
    // fits beside the pill at 360px with the tighter gap + 40% pill
    // cap. The negative pin still rules out the old wrapping row.
    expect(DASH_SRC).toContain('flex items-center justify-between gap-1.5');
    expect(DASH_SRC).not.toContain('flex flex-wrap items-center justify-between gap-1.5');
    expect(DASH_SRC).toContain('max-w-[40%]');
    expect(DASH_SRC).toContain('{todayStr}');
    expect(DASH_SRC).not.toContain("(စုစုပေါင်း ${wallets.length} ခု)");
    expect(DASH_SRC).not.toContain('(total ${wallets.length})');
  });

  it('period dropdown + sync live in the Hero row, restyled dark, popover right-aligned', () => {
    expect(DASH_SRC).toContain('periodDropdownRef');
    expect(DASH_SRC).toContain('bg-white/10 hover:bg-white/20 border border-white/20');
    expect(DASH_SRC).toContain('absolute top-full mt-1 right-0 z-40');
    expect(DASH_SRC).toContain('setHeroBalanceHidden(!heroBalanceHidden)');
    expect(DASH_SRC).toContain('min-h-[44px] min-w-[44px]');
    expect(DASH_SRC).toContain('heroBalanceHidden');
  });

  it('Dashboard search button is gone; Navbar, Sidebar and Records search remain', () => {
    expect(DASH_SRC).not.toContain('onOpenSearch');
    expect(count(APP_SRC, 'onOpenSearch={() => setIsSearchModalOpen(true)}')).toBe(2);
    expect(NAVBAR_SRC).toContain('navbar-search-btn');
    expect(SIDEBAR_SRC).toContain('onOpenSearch');
    expect(TXN_SRC).toContain('DebouncedSearchInput');
    expect(TXN_SRC).toContain('tx-search-input');
  });

  it('wallet pill keeps its count visible + the popover stays 320px wide', () => {
    // [v7.6.51 render fixes] Compact label wraps to two lines (the
    // count used to truncate away in the narrow one-row pill), and
    // the popover width is independent of the trigger width.
    const SELECTOR_SRC = readFileSync(
      new URL('../../components/MultiWalletSelector.tsx', import.meta.url),
      'utf8',
    );
    expect(SELECTOR_SRC).toContain('line-clamp-2 leading-snug text-left break-words');
    expect(SELECTOR_SRC).toContain('w-[min(20rem,calc(100vw-2rem))]');
    expect(SELECTOR_SRC).not.toContain('w-full sm:w-80');
  });
});

describe('Quick Access one row of 6 (v7.6.51 item 3)', () => {
  it('grid is 6 columns with 6 compact chips, all targets unchanged', () => {
    expect(DASH_SRC).toContain('grid grid-cols-6 gap-1');
    expect(count(DASH_SRC, 'px-1 py-1.5 rounded-xl bg-')).toBe(6);
    expect(count(DASH_SRC, 'w-6 h-6 rounded-lg')).toBe(6);
    for (const tab of ['budget', 'reports', 'compare', 'education', 'feedback', 'plans']) {
      expect(DASH_SRC).toContain(`onSelectTab('${tab}')`);
    }
  });
});

describe('Version pins roll to v7.6.52 / build 366', () => {
  it('constants, version.json and the top history entry agree', () => {
    expect(CURRENT_APP_VERSION).toBe('v7.6.54');
    expect(CURRENT_BUILD_NUMBER).toBe(368);
    expect(VERSION_JSON.version).toBe('v7.6.54');
    expect(VERSION_JSON.buildNumber).toBe(368);
    const top = VERSION_HISTORY[0];
    expect(top.version).toBe('v7.6.54');
    expect(top.buildNumber).toBe(368);
    expect(top.changesMy).toEqual(VERSION_JSON.changesMy);
    expect(top.changesEn).toEqual(VERSION_JSON.changesEn);
    expect(top.changesMy).toHaveLength(2);
    expect(top.changesEn).toHaveLength(2);
    expect(top.changesMy.join(' ')).not.toContain('Admin');
    expect(top.changesEn.join(' ')).not.toContain('Admin');
    expect(VERSION_JSON.changesMy.join(' ')).not.toContain('Admin');
    expect(VERSION_JSON.changesEn.join(' ')).not.toContain('Admin');
  });
});
