// [v7.6.61] Researched redesign pins: the Records balance card uses
// the self-hosted Noto Sans Myanmar Variable type (one family for
// Latin digits and the Myanmar unit), the Hero-family near-black
// ground, and the -300 tier shades. The font files are precached
// by the service worker so the card keeps its type offline.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

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

const MYANMAR_FONT = readFileSync(
  new URL(
    '../../../public/fonts/noto-sans-myanmar-myanmar-wght-normal.woff2',
    import.meta.url,
  ),
);

const LATIN_FONT = readFileSync(
  new URL(
    '../../../public/fonts/noto-sans-myanmar-latin-wght-normal.woff2',
    import.meta.url,
  ),
);

const OFL_TEXT = readFileSync(
  new URL('../../../public/fonts/OFL.txt', import.meta.url),
  'utf8',
);

describe('balance card typeface (v7.6.61 researched redesign)', () => {
  it('the card uses the Noto Sans Myanmar card font class, never monospace', () => {
    expect(TX_SRC).toContain('balance-card-font');
    expect(TX_SRC).toContain('text-3xl leading-tight font-black tracking-tight');
    expect(TX_SRC).not.toContain('font-black font-mono');
  });

  it('the card ground is the Hero-family near-black navy, flat', () => {
    expect(TX_SRC).toContain('bg-[#0F172A]');
    expect(TX_SRC).not.toContain('bg-[#1E3A5F]');
  });

  it('the stylesheet declares both variable subsets with Fontsource unicode ranges', () => {
    expect(CSS_SRC).toContain("font-family: 'Noto Sans Myanmar Variable'");
    expect(CSS_SRC).toContain('font-weight: 100 900');
    expect(CSS_SRC).toContain('font-display: swap');
    expect(CSS_SRC).toContain(
      "url('/fonts/noto-sans-myanmar-myanmar-wght-normal.woff2')",
    );
    expect(CSS_SRC).toContain(
      "url('/fonts/noto-sans-myanmar-latin-wght-normal.woff2')",
    );
    expect(CSS_SRC).toContain('U+1000-109F');
    expect(CSS_SRC).toContain('U+0000-00FF');
    expect(CSS_SRC).toContain('.balance-card-font');
    expect(CSS_SRC).toContain('font-variant-numeric: tabular-nums');
  });

  it('the service worker precaches both font files under a bumped cache name', () => {
    expect(SW_SRC).toContain("const CACHE_NAME = 'ngwesaryin-live-v12'");
    expect(SW_SRC).toContain(
      "'/fonts/noto-sans-myanmar-myanmar-wght-normal.woff2'",
    );
    expect(SW_SRC).toContain(
      "'/fonts/noto-sans-myanmar-latin-wght-normal.woff2'",
    );
  });

  it('the shipped font files are real woff2 binaries with content', () => {
    expect(MYANMAR_FONT.subarray(0, 4).toString('ascii')).toBe('wOF2');
    expect(LATIN_FONT.subarray(0, 4).toString('ascii')).toBe('wOF2');
    expect(MYANMAR_FONT.length).toBeGreaterThan(100000);
    expect(LATIN_FONT.length).toBeGreaterThan(10000);
  });

  it('the OFL licence travels with the fonts', () => {
    expect(OFL_TEXT).toContain('SIL OPEN FONT LICENSE');
    expect(OFL_TEXT).toContain('Noto Project Authors');
  });
});
