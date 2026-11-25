// [v7.6.41 C] ShopModal React #310 regression: hooks AFTER the
// `if (!isOpen) return null;` early return crash React (error #310)
// whenever the always-mounted modal toggles closed → open. The fix
// moves every hook above the early return; these tests pin the
// ordering in source text (the repo pattern: components have no
// test renderer) and pin the whole-modal sweep. Source reads use
// `new URL` — NO path comparisons.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const SRC = (rel: string) => readFileSync(new URL(rel, import.meta.url), 'utf8');

// A hook call at the top level of a component body: an assignment
// from useX(...) or a bare useEffect/useLayoutEffect call. Comment
// lines are stripped first, so a comment merely MENTIONING a hook
// (ShopModal's own fix comment does) never counts.
const HOOK_LINE =
  /^\s*(?:(?:const|let|var)\s+[^=]*=\s*)?use(?:State|Effect|Memo|Ref|Callback|Context|LayoutEffect|ImperativeHandle|DeferredValue|Transition|Id|SyncExternalStore)\s*\(/;
const EARLY_RETURN = /^  if \([^)]*\) return null;?\s*$/;

function hookLinesAfterEarlyReturn(source: string): { line: number; text: string }[] {
  const lines = source.split('\n');
  const earlyIdx = lines.findIndex((l) => EARLY_RETURN.test(l));
  if (earlyIdx === -1) return [];
  const bad: { line: number; text: string }[] = [];
  for (let i = earlyIdx + 1; i < lines.length; i++) {
    const code = lines[i].replace(/\/\/.*$/, '');
    if (HOOK_LINE.test(code)) bad.push({ line: i + 1, text: lines[i].trim() });
  }
  return bad;
}

describe('ShopModal hooks-before-early-return (v7.6.41 C)', () => {
  const src = SRC('../../components/shops/ShopModal.tsx');

  it('the early return still exists (the fix moves hooks, not the return)', () => {
    expect(src).toContain('if (!isOpen) return null;');
  });

  it('no hook call sits below the early return', () => {
    expect(hookLinesAfterEarlyReturn(src)).toEqual([]);
  });

  it('customTownships useMemo sits above the early return', () => {
    const lines = src.split('\n');
    const memoIdx = lines.findIndex((l) => l.includes('const customTownships = useMemo('));
    const earlyIdx = lines.findIndex((l) => EARLY_RETURN.test(l));
    expect(memoIdx).toBeGreaterThan(-1);
    expect(earlyIdx).toBeGreaterThan(-1);
    expect(memoIdx).toBeLessThan(earlyIdx);
  });

  it('every hook in the file sits above the early return', () => {
    const lines = src.split('\n');
    const earlyIdx = lines.findIndex((l) => EARLY_RETURN.test(l));
    const hookIdxs = lines
      .map((l, i) => ({ l: l.replace(/\/\/.*$/, ''), i }))
      .filter(({ l }) => HOOK_LINE.test(l))
      .map(({ i }) => i);
    expect(hookIdxs.length).toBeGreaterThan(0);
    for (const h of hookIdxs) expect(h).toBeLessThan(earlyIdx);
  });
});

describe('ShopModal stays always-mounted (v7.6.41 C)', () => {
  it('ShopsView renders <ShopModal> unconditionally', () => {
    const src = SRC('../../components/ShopsView.tsx');
    expect(src).toContain('<ShopModal');
    expect(src).toContain('isOpen={isModalOpen}');
    expect(src).not.toContain('{isModalOpen && <ShopModal');
    expect(src).not.toContain('{isModalOpen ? <ShopModal');
  });
});

describe('hooks-after-early-return sweep (v7.6.41 C)', () => {
  // Every modal/component checked in the v7.6.41 sweep. Files with
  // no indent-2 early return pass vacuously (no violation possible);
  // files WITH one must have zero hook calls below it. AuthContext
  // is excluded: its indent-2 `return null` lives inside the
  // module-level parseExpiryTime helper, not a component body.
  const files = [
    '../../components/AccountModal.tsx',
    '../../components/BudgetModal.tsx',
    '../../components/CategoryPickerModal.tsx',
    '../../components/DatabaseSyncTrackerModal.tsx',
    '../../components/DebtModal.tsx',
    '../../components/FeedbackModal.tsx',
    '../../components/FinancialHealthModal.tsx',
    '../../components/GlobalSearchModal.tsx',
    '../../components/ItemPriceHistoryModal.tsx',
    '../../components/LanguagePickerModal.tsx',
    '../../components/NotificationModal.tsx',
    '../../components/AdminPanel.tsx',
    '../../components/ConflictBanner.tsx',
    '../../components/AdBanner.tsx',
    '../../components/AdminBroadcastBanner.tsx',
    '../../components/shops/ShopReportModal.tsx',
    '../../components/WalletModal.tsx',
    '../../components/TransactionModal.tsx',
    '../../components/TransactionsView.tsx',
    '../../components/ShopsView.tsx',
  ];
  for (const file of files) {
    it(`${file} has no hook below its early return`, () => {
      expect(hookLinesAfterEarlyReturn(SRC(file))).toEqual([]);
    });
  }
});
