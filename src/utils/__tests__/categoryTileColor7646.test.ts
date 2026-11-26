// [v7.6.46] Part H — regression: the curated tile colour wins for
// default category ids even when the stored colour DIVERGED from
// today's shipped default (real long-lived accounts carry colours
// seeded by older defaults). Stored data is never rewritten; the
// remap is display-time only, at the Records row call site.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { getCategoryTileColor } from '../categoryTileColor';

const TILE_SRC = readFileSync(new URL('../categoryTileColor.ts', import.meta.url), 'utf8');

describe('getCategoryTileColor diverged stored colours (v7.6.46 Part H)', () => {
  it('a diverged stored colour on a default id still maps to the curated colour', () => {
    // Arbitrary/old greens and reds a long-lived account may carry.
    expect(getCategoryTileColor({ id: 'cat_business', color: '#FF0000' }, true)).toBe('#2563EB');
    expect(getCategoryTileColor({ id: 'cat_business', color: '#00FF00' }, true)).toBe('#2563EB');
    expect(getCategoryTileColor({ id: 'cat_food', color: '#059669' }, false)).toBe('#EF4444');
    expect(getCategoryTileColor({ id: 'cat_transport', color: '#16A34A' }, false)).toBe('#CA8A04');
    expect(getCategoryTileColor({ id: 'cat_salary', color: '#ABCDEF' }, true)).toBe('#10B981');
    expect(getCategoryTileColor({ id: 'cat_charity', color: '#000000' }, false)).toBe('#EA580C');
  });

  it('every one of the 17 default ids maps, whatever is stored', () => {
    const ids = [
      'cat_salary', 'cat_business', 'cat_freelance', 'cat_bonus', 'cat_investment',
      'cat_income_other', 'cat_transfer', 'cat_reconcile', 'cat_food', 'cat_transport',
      'cat_vehicle', 'cat_utilities', 'cat_shopping', 'cat_health', 'cat_charity',
      'cat_entertainment', 'cat_expense_other',
    ];
    for (const id of ids) {
      const colour = getCategoryTileColor({ id, color: '#123456' }, true);
      expect(colour).not.toBe('#123456');
      expect(colour).toMatch(/^#[0-9A-F]{6}$/);
    }
  });

  it('user-added categories still keep their stored colour', () => {
    expect(getCategoryTileColor({ id: 'cat_custom_1', color: '#ABCDEF' }, false)).toBe('#abcdef');
    expect(getCategoryTileColor({ id: 'my-shop', color: '#123456' }, true)).toBe('#123456');
  });

  it('missing colours still fall back by type', () => {
    expect(getCategoryTileColor({ id: 'cat_custom_1' }, false)).toBe('#EF4444');
    expect(getCategoryTileColor({ id: 'cat_custom_1' }, true)).toBe('#10B981');
    expect(getCategoryTileColor({ id: 'cat_food' }, false)).toBe('#EF4444');
    expect(getCategoryTileColor(null, true)).toBe('#10B981');
  });

  it('no shipped-default gate remains: the module no longer reads INITIAL_CATEGORIES', () => {
    expect(TILE_SRC).not.toContain('INITIAL_CATEGORIES');
    expect(TILE_SRC).not.toContain('DEFAULT_COLOR_BY_ID');
  });
});
