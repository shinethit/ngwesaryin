// [v7.6.62] The Records balance card: researched redesign, second
// study. v7.6.61 was rejected on the phone (black patch, broken
// text, wrong colours, terrible font). The custom Noto Sans
// Myanmar Variable webfont is removed: the variable-font +
// unicode-range subset + SW-precache path put Myanmar shaping at
// the mercy of the phone's font delivery. Ground is a two-stop
// deep-indigo diagonal (indigo-950 to indigo-900) from the
// studied fintech card pattern — depth without gaudiness, never
// flat black, and not a copy of any single reference. The figure
// is extrabold tabular numerals with generous leading (Burmese
// is a Tall script). Tone shades return to the v7.6.57 -400
// values; net keeps soft emerald-300/rose-300; labels stay
// slate-300. Tone semantics and boundaries unchanged.
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

describe('balance card researched redesign (v7.6.62)', () => {
  it('the card ground is a two-stop deep-indigo gradient, never flat black', () => {
    expect(TX_SRC).toContain(
      'bg-gradient-to-br from-indigo-950 to-indigo-900',
    );
    expect(TX_SRC).not.toContain('bg-[#0F172A]');
    expect(TX_SRC).not.toContain('bg-[#1E3A5F]');
    expect(TX_SRC).not.toContain('via-indigo-950');
  });

  it('the big figure is extrabold tabular numerals with generous leading', () => {
    const figLine = TX_SRC.split('\n').find((l) =>
      l.includes('text-3xl sm:text-4xl'),
    );
    expect(figLine).toContain(
      'text-3xl sm:text-4xl font-extrabold tabular-nums leading-[1.4]',
    );
    expect(figLine).not.toContain('font-black');
    expect(figLine).not.toContain('tracking-tight');
    expect(TX_SRC).not.toContain('text-3xl leading-tight font-black');
    expect(TX_SRC).not.toContain('balance-card-font');
  });

  it('the stylesheet has no webfont: no @font-face, no card font class', () => {
    expect(CSS_SRC).not.toContain('@font-face');
    expect(CSS_SRC).not.toContain('Noto Sans Myanmar Variable');
    expect(CSS_SRC).not.toContain('.balance-card-font');
    expect(CSS_SRC).not.toContain('font-synthesis');
    expect(CSS_SRC).not.toContain('/fonts/');
  });

  it('the service worker has no font precache entries under a bumped cache name', () => {
    expect(SW_SRC).toContain("const CACHE_NAME = 'ngwesaryin-live-v13'");
    expect(SW_SRC).not.toContain('/fonts/noto-sans-myanmar');
    expect(SW_SRC).not.toContain('woff2');
  });

  it('the shipped font files are gone', () => {
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
    expect(
      existsSync(new URL('../../../public/fonts/OFL.txt', import.meta.url)),
    ).toBe(false);
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
