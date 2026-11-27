// [v7.6.63] The Records balance card: self-hosted Padauk +
// generous leading. v7.6.62's system font + leading 1.4 still
// collided stacked Myanmar glyphs (the figure and the grid rows
// share one tight line box). The fix is typographic only: the
// card — and only the card — renders in self-hosted Padauk (full
// static WOFF2 files, no unicode-range, no variable subsets, no
// CDN), real Bold 700 with font-synthesis:none, and leading 1.7
// on the title, figure, grid and summary strip. COLOURS ARE
// UNTOUCHED (user order 2026-11-27 09:31): the v62 indigo
// gradient, the -400 tone shades, soft emerald/rose net and
// slate-300 labels are exactly as v62 shipped them. Eye + Refresh
// are equal 44px targets; Refresh stays signed-in-only.
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';

const TX_SRC = readFileSync(
  new URL('../../components/TransactionsView.tsx', import.meta.url),
  'utf8',
);

const CSS_SRC = readFileSync(
  new URL('../../index.css', import.meta.url),
  'utf8',
);

const SW_SRC = readFileSync(
  new URL('../../../public/sw.js', import.meta.url),
  'utf8',
);

const BT_SRC = readFileSync(
  new URL('../balanceTone.ts', import.meta.url),
  'utf8',
);

const FST_SRC = readFileSync(
  new URL('../../components/FinancialSummaryTable.tsx', import.meta.url),
  'utf8',
);

describe('balance card typography fix (v7.6.63)', () => {
  it('the card ground is the untouched v62 two-stop deep-indigo gradient', () => {
    expect(TX_SRC).toContain(
      'bg-gradient-to-br from-indigo-950 to-indigo-900',
    );
    expect(TX_SRC).not.toContain('bg-[#0F172A]');
    expect(TX_SRC).not.toContain('bg-[#1E3A5F]');
    expect(TX_SRC).not.toContain('via-indigo-950');
    expect(TX_SRC).toContain('balance-card-font rounded-3xl bg-gradient-to-br');
  });

  it('the figure and grid use generous leading, no tight leading anywhere', () => {
    const figLine = TX_SRC.split('\n').find((l) =>
      l.includes('text-3xl sm:text-4xl'),
    );
    expect(figLine).toContain(
      'text-3xl sm:text-4xl font-bold tabular-nums leading-[1.7]',
    );
    expect(figLine).not.toContain('font-extrabold');
    expect(figLine).not.toContain('font-black');
    expect(TX_SRC).not.toContain('leading-tight');
    expect(TX_SRC).not.toContain('leading-[1.4]');
  });

  it('the stylesheet self-hosts static Padauk 400/700, card-only class', () => {
    expect(CSS_SRC).toContain('@font-face');
    expect(CSS_SRC).toContain("font-family: 'Padauk';");
    expect(CSS_SRC).toContain("src: url('/fonts/padauk-regular.woff2') format('woff2');");
    expect(CSS_SRC).toContain('font-weight: 400;');
    expect(CSS_SRC).toContain("src: url('/fonts/padauk-bold.woff2') format('woff2');");
    expect(CSS_SRC).toContain('font-weight: 700;');
    expect(CSS_SRC).toContain('.balance-card-font');
    expect(CSS_SRC).toContain('font-synthesis: none;');
    expect(CSS_SRC).not.toContain('Noto Sans Myanmar Variable');
    expect(CSS_SRC).not.toContain('unicode-range:');
    expect(CSS_SRC).not.toContain('wght');
  });

  it('the service worker precaches both Padauk files under a bumped cache name', () => {
    expect(SW_SRC).toContain("const CACHE_NAME = 'ngwesaryin-live-v14'");
    expect(SW_SRC).toContain("'/fonts/padauk-regular.woff2'");
    expect(SW_SRC).toContain("'/fonts/padauk-bold.woff2'");
    expect(SW_SRC).not.toContain('/fonts/noto-sans-myanmar');
  });

  it('the shipped font files are the Padauk pair plus the licence; Noto is gone', () => {
    expect(
      existsSync(
        new URL('../../../public/fonts/padauk-regular.woff2', import.meta.url),
      ),
    ).toBe(true);
    expect(
      existsSync(
        new URL('../../../public/fonts/padauk-bold.woff2', import.meta.url),
      ),
    ).toBe(true);
    expect(
      existsSync(new URL('../../../public/fonts/OFL.txt', import.meta.url)),
    ).toBe(true);
    expect(
      existsSync(
        new URL(
          '../../../public/fonts/noto-sans-myanmar-myanmar-wght-normal.woff2',
          import.meta.url,
        ),
      ),
    ).toBe(false);
    expect(
      existsSync(
        new URL(
          '../../../public/fonts/noto-sans-myanmar-latin-wght-normal.woff2',
          import.meta.url,
        ),
      ),
    ).toBe(false);
  });

  it('eye and refresh are equal 44px targets; refresh stays signed-in-only', () => {
    const hits = TX_SRC.split('min-w-11 min-h-11 p-2').length - 1;
    expect(hits).toBeGreaterThanOrEqual(2);
    expect(TX_SRC).toContain('{user && (');
    expect(TX_SRC).not.toContain('TEMP-RENDER-OVERRIDE');
  });

  it('the summary strip shares the generous leading', () => {
    expect(FST_SRC).toContain('leading-[1.7]');
  });

  it('tone shades are the restored -400 values, net is soft emerald/rose, labels are slate-300', () => {
    expect(BT_SRC).toContain("'text-rose-400'");
    expect(BT_SRC).toContain("'text-amber-400'");
    expect(BT_SRC).not.toContain('text-red-400');
    expect(BT_SRC).not.toContain('text-amber-300');
    expect(TX_SRC).toContain(
      "monthBalance.net >= 0 ? 'text-emerald-300' : 'text-rose-300'",
    );
    expect(TX_SRC).toContain('text-slate-300');
    expect(TX_SRC).not.toContain('text-white/70');
  });
});
