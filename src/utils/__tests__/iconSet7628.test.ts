// [v7.6.28] Expanded category icon set, grouped by category, and the
// calendar day-detail label showing both names. Source-text
// assertions (same pattern as vehicleTextFixes794.test.ts) — the
// components have no test renderer in this repo (vitest node env,
// no testing-library); glyph rendering is verified by renders.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import * as lucide from 'lucide-react';
import {
  AVAILABLE_CATEGORY_ICONS,
  CATEGORY_ICON_GROUPS,
} from '../../components/CategoryIcon';
import { resolveCalendarDetailMainLabel } from '../calendarDetailLabels';

const ICON_SRC = readFileSync(
  new URL('../../components/CategoryIcon.tsx', import.meta.url),
  'utf8',
);
const PICKER_SRC = readFileSync(
  new URL('../../components/CategoriesView.tsx', import.meta.url),
  'utf8',
);

// The 36 icons offered before v7.6.28 — stored categories reference
// these names, so none may ever be removed or renamed.
const ORIGINAL_36 = [
  'ArrowLeftRight',
  'Utensils',
  'ShoppingBag',
  'Car',
  'Bus',
  'Wrench',
  'Home',
  'Coffee',
  'Fuel',
  'ShoppingCart',
  'HeartPulse',
  'Wifi',
  'Briefcase',
  'Store',
  'Laptop',
  'GraduationCap',
  'Plane',
  'Gift',
  'HeartHandshake',
  'Film',
  'Music',
  'Tv',
  'Dumbbell',
  'Baby',
  'BookOpen',
  'TrendingUp',
  'Coins',
  'Landmark',
  'Banknote',
  'CreditCard',
  'Smartphone',
  'Zap',
  'Sparkles',
  'Shield',
  'Tag',
  'MoreHorizontal',
];

describe('icon set size and grouping', () => {
  it('offers at least 100 icons', () => {
    expect(AVAILABLE_CATEGORY_ICONS.length).toBeGreaterThanOrEqual(100);
  });

  it('pins the v7.6.28 count (144)', () => {
    expect(AVAILABLE_CATEGORY_ICONS.length).toBe(144);
  });

  it('keeps all original 36 names', () => {
    for (const name of ORIGINAL_36) {
      expect(AVAILABLE_CATEGORY_ICONS).toContain(name);
    }
  });

  it('groups cover every listed name exactly once', () => {
    const grouped = CATEGORY_ICON_GROUPS.flatMap((g) => g.icons);
    expect(grouped).toHaveLength(AVAILABLE_CATEGORY_ICONS.length);
    expect([...grouped].sort()).toEqual(
      [...AVAILABLE_CATEGORY_ICONS].sort(),
    );
    expect(new Set(grouped).size).toBe(grouped.length);
  });

  it('every group has a key and Myanmar + English headings', () => {
    const keys = new Set<string>();
    for (const group of CATEGORY_ICON_GROUPS) {
      expect(group.key.trim().length).toBeGreaterThan(0);
      expect(keys.has(group.key)).toBe(false);
      keys.add(group.key);
      expect(group.labelMy.trim().length).toBeGreaterThan(0);
      expect(group.labelEn.trim().length).toBeGreaterThan(0);
      expect(group.icons.length).toBeGreaterThan(0);
    }
    expect(CATEGORY_ICON_GROUPS.length).toBe(8);
  });
});

describe('every icon renders a real glyph', () => {
  it('every listed name is a real export of the installed lucide-react', () => {
    const missing = AVAILABLE_CATEGORY_ICONS.filter(
      (name) => typeof (lucide as Record<string, unknown>)[name] === 'undefined',
    );
    expect(missing).toEqual([]);
  });

  it('every listed name has an import and a switch case (except the fallback itself)', () => {
    for (const name of AVAILABLE_CATEGORY_ICONS) {
      expect(ICON_SRC).toContain(`  ${name},`);
      // MoreHorizontal IS the default fallback branch, so it has no
      // case of its own — rendering it returns the fallback glyph.
      if (name !== 'MoreHorizontal') {
        expect(ICON_SRC).toContain(`case '${name}':`);
      }
    }
    expect(ICON_SRC).toContain('default:');
    expect(ICON_SRC).toContain('return <MoreHorizontal');
  });

  it('the picker renders groups with headings, not a flat list', () => {
    expect(PICKER_SRC).toContain('CATEGORY_ICON_GROUPS.map');
    expect(PICKER_SRC).toContain('group.labelMy');
    expect(PICKER_SRC).toContain('group.labelEn');
    expect(PICKER_SRC).not.toContain('AVAILABLE_CATEGORY_ICONS.map');
  });
});

describe('calendar main label shows both names', () => {
  const CAT = {
    subCategories: [
      { id: 'sub_food_snack', name: 'သွားရည်စာ', nameEn: 'Snacks' },
      { id: 'sub_food_noen', name: 'အချိုပွဲ', nameEn: '' },
    ],
  };

  it('shows category + sub-category in Myanmar', () => {
    expect(
      resolveCalendarDetailMainLabel(
        'sub_food_snack',
        CAT,
        'အစားအသောက်',
        'my',
      ),
    ).toBe('အစားအသောက် · သွားရည်စာ');
  });

  it('shows category + sub-category in English', () => {
    expect(
      resolveCalendarDetailMainLabel('sub_food_snack', CAT, 'Food', 'en'),
    ).toBe('Food · Snacks');
  });

  it('falls back to the Myanmar sub-category name when nameEn is empty', () => {
    expect(
      resolveCalendarDetailMainLabel('sub_food_noen', CAT, 'Food', 'en'),
    ).toBe('Food · အချိုပွဲ');
  });

  it('shows only the category name with no sub-category', () => {
    expect(
      resolveCalendarDetailMainLabel(undefined, CAT, 'အစားအသောက်', 'my'),
    ).toBe('အစားအသောက်');
    expect(
      resolveCalendarDetailMainLabel('sub_missing', CAT, 'Food', 'en'),
    ).toBe('Food');
  });
});
