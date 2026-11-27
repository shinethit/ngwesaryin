// [v7.6.51] Console-error cleanup: the service-worker scheme guard and
// the recharts visibility gate. Source pins prove the guard is in the
// fetch handler, every ResponsiveContainer is wrapped, and the version
// surfaces agree. Source reads use `new URL` — NO path comparisons.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  CURRENT_APP_VERSION,
  CURRENT_BUILD_NUMBER,
  VERSION_HISTORY,
} from '../../data/versionHistory';

const SRC = (rel: string) => readFileSync(new URL(rel, import.meta.url), 'utf8');

const SW_SRC = SRC('../../../public/sw.js');
const GATE_SRC = SRC('../../components/DeferredChart.tsx');
const FUEL_SRC = SRC('../../components/vehicles/FuelPriceChart.tsx');
const TREND_SRC = SRC('../../components/CategorySpendingTrendLineChart.tsx');
const ITEM_SRC = SRC('../../components/ItemPriceAnalyticsView.tsx');
const COMP_SRC = SRC('../../components/MonthlyComparisonCard.tsx');
const SUMM_SRC = SRC('../../components/MonthlySummaryChart.tsx');

describe('service-worker scheme guard (v7.6.51 item 1)', () => {
  it('the fetch handler returns early for non-http(s) requests', () => {
    expect(SW_SRC).toContain("if (url.protocol !== 'http:' && url.protocol !== 'https:') {");
    // The guard sits right after the URL parse, before every branch.
    const guardAt = SW_SRC.indexOf("url.protocol !== 'http:'");
    const parseAt = SW_SRC.indexOf('const url = new URL(request.url);');
    const firstBranchAt = SW_SRC.indexOf('// Skip Firebase Auth');
    expect(parseAt).toBeGreaterThan(-1);
    expect(guardAt).toBeGreaterThan(parseAt);
    expect(guardAt).toBeLessThan(firstBranchAt);
  });

  it('caching behaviour for http(s) is untouched', () => {
    expect(SW_SRC).toContain("const CACHE_NAME = 'ngwesaryin-live-v12';");
    expect(SW_SRC).toContain("if (url.pathname === '/version.json') {");
    expect(SW_SRC.match(/cache\.put\(request, responseClone\)/g)).toHaveLength(2);
  });
});

describe('recharts visibility gate (v7.6.51 item 2)', () => {
  it('DeferredChart renders children only when its box has a real size', () => {
    expect(GATE_SRC).toContain('ResizeObserver');
    expect(GATE_SRC).toContain('getBoundingClientRect');
    expect(GATE_SRC).toContain('{visible ? children : null}');
    expect(GATE_SRC).toContain('h-full w-full');
  });

  it('every ResponsiveContainer is wrapped in DeferredChart', () => {
    const pairs: Array<[string, number]> = [
      [FUEL_SRC, 1],
      [TREND_SRC, 1],
      [ITEM_SRC, 2],
      [COMP_SRC, 2],
      [SUMM_SRC, 2],
    ];
    for (const [src, n] of pairs) {
      expect(src).toContain("import { DeferredChart } from '");
      expect(src.match(/<ResponsiveContainer /g)?.length ?? 0).toBe(n);
      expect(src.match(/<DeferredChart>/g)?.length ?? 0).toBe(n);
      expect(src.match(/<\/DeferredChart>/g)?.length ?? 0).toBe(n);
    }
  });

  it('no ResponsiveContainer is left unwrapped anywhere in src', () => {
    const total = [FUEL_SRC, TREND_SRC, ITEM_SRC, COMP_SRC, SUMM_SRC].reduce(
      (s, src) => s + (src.match(/<ResponsiveContainer /g)?.length ?? 0),
      0,
    );
    expect(total).toBe(8);
  });
});

describe('Version pins roll to v7.6.52 / build 366', () => {
  it('constants and the top history entry agree, with no Admin strings', () => {
    expect(CURRENT_APP_VERSION).toBe('v7.6.61');
    expect(CURRENT_BUILD_NUMBER).toBe(375);
    const VERSION_JSON = JSON.parse(
      readFileSync(new URL('../../../public/version.json', import.meta.url), 'utf8'),
    );
    expect(VERSION_JSON.version).toBe('v7.6.61');
    expect(VERSION_JSON.buildNumber).toBe(375);
    const top = VERSION_HISTORY[0];
    expect(top.version).toBe('v7.6.61');
    expect(top.buildNumber).toBe(375);
    expect(top.changesMy.join(' ')).not.toContain('Admin');
    expect(top.changesEn.join(' ')).not.toContain('Admin');
    expect(top.changesMy.length).toBe(5);
    expect(top.changesEn.length).toBe(5);
    expect(VERSION_JSON.changesMy).toEqual(top.changesMy);
    expect(VERSION_JSON.changesEn).toEqual(top.changesEn);
  });
});
