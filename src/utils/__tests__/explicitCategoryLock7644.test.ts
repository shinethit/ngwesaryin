// [v7.6.44] F1 — NEVER switch away from an explicitly picked
// category (user choice, option ခ). Item-name matching (ဆီ substring
// and friends) must not move the form's category once the user
// picked one; with no explicit pick, the old auto-switch behaviour
// stays exactly. Pure-helper coverage for the gate decision +
// wiring pins for the lock flag's set/clear sites (the repo pattern:
// components have no test renderer; visible behaviour is verified
// by renders). Source reads use `new URL` — NO path comparisons.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { canAutoSwitchCategory } from '../itemIntelligence';

const SRC = (rel: string) => readFileSync(new URL(rel, import.meta.url), 'utf8');

describe('canAutoSwitchCategory (v7.6.44 F1)', () => {
  it('(1) an explicitly picked grocery category never switches, even for a ဆီ match', () => {
    expect(canAutoSwitchCategory('cat_food', true)).toBe(false);
    expect(canAutoSwitchCategory('cat_health', true)).toBe(false);
    expect(canAutoSwitchCategory('', true)).toBe(false);
  });

  it('(2) with no explicit pick, an unset category may switch (old behaviour)', () => {
    expect(canAutoSwitchCategory('', false)).toBe(true);
    expect(canAutoSwitchCategory(undefined, false)).toBe(true);
  });

  it('with no explicit pick, Food / Other may switch (old behaviour)', () => {
    expect(canAutoSwitchCategory('cat_food', false)).toBe(true);
    expect(canAutoSwitchCategory('cat_expense_other', false)).toBe(true);
  });

  it('with no explicit pick, other settled categories do NOT switch (old behaviour)', () => {
    expect(canAutoSwitchCategory('cat_health', false)).toBe(false);
    expect(canAutoSwitchCategory('cat_shopping', false)).toBe(false);
    expect(canAutoSwitchCategory('cat_salary', false)).toBe(false);
  });

  it('vehicle categories never switch, explicit or not (old behaviour)', () => {
    expect(canAutoSwitchCategory('cat_vehicle', false)).toBe(false);
    expect(canAutoSwitchCategory('cat_vehicle_management', false)).toBe(false);
    expect(canAutoSwitchCategory('cat_expense_car', false)).toBe(false);
    expect(canAutoSwitchCategory('cat_vehicle', true)).toBe(false);
  });
});

describe('explicit-category lock wiring (v7.6.44 F1)', () => {
  const MODAL = SRC('../../components/TransactionModal.tsx');

  it('the row updater gates the category move on the helper + the lock ref', () => {
    expect(MODAL).toContain('canAutoSwitchCategory(categoryId, categoryExplicitRef.current)');
    expect(MODAL).toContain('const categoryExplicitRef = useRef(false);');
  });

  it('(3) both pick handlers set the lock', () => {
    const primary = MODAL.slice(MODAL.indexOf('const handlePrimaryCategorySelect'));
    expect(primary.slice(0, 400)).toContain('categoryExplicitRef.current = true;');
    const split = MODAL.slice(MODAL.indexOf('const handleSplitRowCategorySelect'));
    expect(split.slice(0, 400)).toContain('categoryExplicitRef.current = true;');
  });

  it('(4) a fresh open clears the lock; an edit restore re-locks from the record category', () => {
    expect(MODAL).toContain('categoryExplicitRef.current = false;');
    expect(MODAL).toContain('categoryExplicitRef.current = !!(editTransaction.category);');
  });

  it('type switches and leaving vehicle mode clear the lock with the category', () => {
    const clears = MODAL.match(/categoryExplicitRef\.current = false;/g) || [];
    expect(clears.length).toBeGreaterThanOrEqual(3);
  });

  it('matching itself is untouched: the lookup still runs and still fills the category when allowed', () => {
    expect(MODAL).toContain('const match = findMatchingItemInfo(val, unifiedItemSuggestions);');
    expect(MODAL).toContain('setCategoryId(match.categoryId);');
  });
});
