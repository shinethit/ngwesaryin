// [v7.6.45] Part D — display-time category tile colours. Stored
// colours are never rewritten: a DEFAULT category id always gets
// its curated distinct tile colour ([v7.6.46] rule change — the
// v7.6.45 "still exactly the shipped default" gate failed on real
// accounts carrying older defaults); a colour on a category the
// user added is shown exactly as stored.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { getCategoryTileColor } from '../categoryTileColor';
import {
  VERSION_HISTORY,
  CURRENT_APP_VERSION,
  CURRENT_BUILD_NUMBER,
} from '../../data/versionHistory';

const VERSION_JSON = JSON.parse(
  readFileSync(new URL('../../../public/version.json', import.meta.url), 'utf8'),
);

const TX_SRC = readFileSync(
  new URL('../../components/TransactionsView.tsx', import.meta.url),
  'utf8',
);

describe('getCategoryTileColor (v7.6.45 Part D)', () => {
  it('remaps the green-family defaults to distinct hues', () => {
    // Shipped defaults from initialData.ts.
    expect(getCategoryTileColor({ id: 'cat_business', color: '#059669' }, true)).toBe('#2563EB');
    expect(getCategoryTileColor({ id: 'cat_freelance', color: '#0D9488' }, true)).toBe('#0F766E');
    expect(getCategoryTileColor({ id: 'cat_bonus', color: '#14B8A6' }, true)).toBe('#D97706');
    expect(getCategoryTileColor({ id: 'cat_investment', color: '#047857' }, true)).toBe('#0891B2');
    expect(getCategoryTileColor({ id: 'cat_income_other', color: '#15803D' }, true)).toBe('#65A30D');
  });

  it('remaps the yellow default to a readable dark yellow', () => {
    expect(getCategoryTileColor({ id: 'cat_transport', color: '#EAB308' }, false)).toBe('#CA8A04');
  });

  it('keeps defaults that are already distinct', () => {
    expect(getCategoryTileColor({ id: 'cat_salary', color: '#10B981' }, true)).toBe('#10B981');
    expect(getCategoryTileColor({ id: 'cat_food', color: '#EF4444' }, false)).toBe('#EF4444');
    expect(getCategoryTileColor({ id: 'cat_vehicle', color: '#0284C7' }, false)).toBe('#0284C7');
  });

  it('a stored colour on a DEFAULT id never wins over the curated colour', () => {
    // [v7.6.46] No colour-picker UI exists, so stored colours on
    // default ids are always seed-derived — the curated colour wins
    // whatever is stored (see categoryTileColor7646.test.ts).
    expect(getCategoryTileColor({ id: 'cat_food', color: '#123456' }, false)).toBe('#EF4444');
    expect(getCategoryTileColor({ id: 'cat_salary', color: '#FF0000' }, true)).toBe('#10B981');
  });

  it("a colour equal to ANOTHER category's default is still remapped by id", () => {
    // Food carrying salary's default green: the id decides, not the
    // stored value.
    expect(getCategoryTileColor({ id: 'cat_food', color: '#10B981' }, false)).toBe('#EF4444');
  });

  it('comparison is case-insensitive', () => {
    expect(getCategoryTileColor({ id: 'cat_transport', color: '#eab308' }, false)).toBe('#CA8A04');
  });

  it('user-added categories keep their stored colour', () => {
    expect(getCategoryTileColor({ id: 'cat_custom_1', color: '#ABCDEF' }, false)).toBe('#abcdef');
  });

  it('missing colours fall back by type', () => {
    expect(getCategoryTileColor({ id: 'cat_food' }, false)).toBe('#EF4444');
    expect(getCategoryTileColor({ id: 'cat_salary' }, true)).toBe('#10B981');
    expect(getCategoryTileColor(null, true)).toBe('#10B981');
    expect(getCategoryTileColor(undefined, false)).toBe('#EF4444');
  });

  it('the Records row uses the display-time colour', () => {
    expect(TX_SRC).toContain('getCategoryTileColor(cat, isIncome)');
    expect(TX_SRC).not.toContain("cat?.color || (isIncome ? '#10B981' : '#EF4444')");
  });
});

describe('Version pins roll to v7.6.46 / build 360', () => {
  it('constants, version.json and the top history entry agree, with no Admin strings', () => {
    expect(CURRENT_APP_VERSION).toBe('v7.6.46');
    expect(CURRENT_BUILD_NUMBER).toBe(360);
    expect(VERSION_JSON.version).toBe('v7.6.46');
    expect(VERSION_JSON.buildNumber).toBe(360);
    const top = VERSION_HISTORY[0];
    expect(top.version).toBe('v7.6.46');
    expect(top.buildNumber).toBe(360);
    expect(top.changesMy.join(' ')).not.toContain('Admin');
    expect(top.changesEn.join(' ')).not.toContain('Admin');
    expect(top.changesMy.length).toBe(7);
    expect(top.changesEn.length).toBe(7);
    expect(VERSION_JSON.changesMy).toEqual(top.changesMy);
    expect(VERSION_JSON.changesEn).toEqual(top.changesEn);
  });
});
