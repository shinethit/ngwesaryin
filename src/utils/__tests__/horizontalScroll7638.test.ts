import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';

function readSrc(rel: string): string {
  return readFileSync(new URL(rel, import.meta.url), 'utf8');
}

const NOTIF_SRC = readSrc('../../components/NotificationModal.tsx');
const SPEND_SRC = readSrc('../../components/SpendingComparisonView.tsx');

function count(src: string, needle: string): number {
  return src.split(needle).length - 1;
}

describe('Notification filter chips never horizontal-scroll (v7.6.38)', () => {
  it('the chips row wraps and has no horizontal scroller', () => {
    expect(NOTIF_SRC).toContain('flex flex-wrap items-center justify-between');
    expect(NOTIF_SRC).toContain('flex flex-wrap items-center gap-1.5');
    expect(NOTIF_SRC).not.toContain('scrollbar-none');
    expect(NOTIF_SRC).not.toContain('overflow-x-auto');
  });

  it('every filter chip and the mark-all-read control stay', () => {
    for (const label of ['အားလုံး', 'အကြွေးများ', 'ဘတ်ဂျက်', 'ယာဉ်စနစ်', 'ဆိုင်များ', 'သက်တမ်းကုန်', 'အသုံးများခြင်း']) {
      expect(NOTIF_SRC).toContain(label);
    }
    expect(NOTIF_SRC).toContain('အားလုံးဖတ်ပြီး');
    expect(NOTIF_SRC).toContain("filterTab === 'all'");
  });
});

describe('Spending comparison tables fit at 390px (v7.6.38)', () => {
  it('both tables use a fixed layout with a colgroup', () => {
    expect(count(SPEND_SRC, 'table-fixed')).toBe(2);
    expect(count(SPEND_SRC, '<colgroup>')).toBe(2);
  });

  it('the Trend column is hidden on mobile and kept on sm+ (it duplicates the Change % pill)', () => {
    expect(count(SPEND_SRC, 'rounded-r-lg hidden sm:table-cell')).toBe(2);
    expect(count(SPEND_SRC, 'text-center hidden sm:table-cell')).toBe(2);
  });

  it('the sub-category Parent column is merged under the name, not dropped', () => {
    expect(SPEND_SRC).not.toContain('မိဘ ကဏ္ဍ');
    expect(SPEND_SRC).toContain('[v7.6.38] Parent category under the name');
    expect(SPEND_SRC).toContain('bg-slate-100');
  });

  it('amount cells wrap and the % pill compacts on mobile', () => {
    expect(SPEND_SRC).toContain('break-words text-[11px] sm:text-xs');
    expect(count(SPEND_SRC, 'text-[9px] sm:text-xs font-bold')).toBe(2);
  });

  it('the overflow-x-auto wrappers stay as a safety net only, with the drill-down intact', () => {
    expect(count(SPEND_SRC, 'className="overflow-x-auto"')).toBe(2);
    expect(count(SPEND_SRC, '[v7.6.38] overflow-x-auto is only a safety net')).toBe(2);
    expect(SPEND_SRC).toContain('colSpan={6}');
  });
});

describe('no hidden horizontal scrollers anywhere in src (v7.6.38)', () => {
  it('no source file uses scrollbar-none', () => {
    const root = new URL('../../', import.meta.url);
    const offenders: string[] = [];
    const walk = (dir: URL) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
        const child = new URL(entry.name + (entry.isDirectory() ? '/' : ''), dir);
        if (entry.isDirectory()) walk(child);
        else if (/\.(tsx?|jsx?|css)$/.test(entry.name)) {
          const text = readFileSync(child, 'utf8');
          if (text.includes('scrollbar-none')) offenders.push(entry.name);
        }
      }
    };
    walk(root);
    expect(offenders).toEqual([]);
  });
});
