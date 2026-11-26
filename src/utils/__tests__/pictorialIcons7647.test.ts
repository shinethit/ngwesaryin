// [v7.6.48] Redrawn flat pictorial category icons. Pure-helper
// coverage (resolution + Free/Premium/guest selection gating) plus
// wiring pins: the bundled image files exist and are real WebP,
// the service worker precaches all 463, every render surface uses
// CategoryTile with the category id, and the picker gates at
// selection time only (rendering never checks the plan, so a
// Premium icon chosen earlier is never stripped when the plan
// lapses). Source reads use `new URL` — NO path comparisons.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  DEFAULT_PICTORIAL_BY_CATEGORY,
  PICTORIAL_ICON_GROUPS,
  PICTORIAL_ICON_KEYS,
  isPictorialLocked,
  parsePictorialValue,
  pictorialIconUrl,
  resolvePictorialIcon,
} from '../categoryPictures';
import { INITIAL_CATEGORIES } from '../../data/initialData';
import {
  VERSION_HISTORY,
  CURRENT_APP_VERSION,
  CURRENT_BUILD_NUMBER,
} from '../../data/versionHistory';

const SRC = (rel: string) => readFileSync(new URL(rel, import.meta.url), 'utf8');

const VERSION_JSON = JSON.parse(
  readFileSync(new URL('../../../public/version.json', import.meta.url), 'utf8'),
);

describe('resolvePictorialIcon (v7.6.48)', () => {
  it('an explicit pic: value wins over the default-category map', () => {
    expect(resolvePictorialIcon({ categoryId: 'cat_food', iconName: 'pic:vehicle' })).toBe('vehicle');
    expect(resolvePictorialIcon({ categoryId: 'cat_salary', iconName: 'pic:food' })).toBe('food');
  });

  it('a default category id maps to its pictorial without any stored pic: value', () => {
    expect(resolvePictorialIcon({ categoryId: 'cat_food', iconName: 'Utensils' })).toBe('food');
    expect(resolvePictorialIcon({ categoryId: 'cat_salary', iconName: 'Briefcase' })).toBe('salary');
    expect(resolvePictorialIcon({ categoryId: 'cat_vehicle', iconName: 'Car' })).toBe('vehicle');
    expect(resolvePictorialIcon({ categoryId: 'cat_expense_other', iconName: 'MoreHorizontal' })).toBe('expense-other');
    expect(resolvePictorialIcon({ categoryId: 'cat_reconcile', iconName: 'Scale' })).toBe('reconcile');
  });

  it('the default map covers exactly the 17 seeded default categories', () => {
    const seededIds = INITIAL_CATEGORIES.map((c) => c.id).sort();
    expect(Object.keys(DEFAULT_PICTORIAL_BY_CATEGORY).sort()).toEqual(seededIds);
    expect(seededIds).toHaveLength(17);
  });

  it('custom categories and unknown values fall back to the lucide glyph (null)', () => {
    expect(resolvePictorialIcon({ categoryId: 'cat_custom_1', iconName: 'Dog' })).toBeNull();
    expect(resolvePictorialIcon({ categoryId: undefined, iconName: 'Tag' })).toBeNull();
    expect(resolvePictorialIcon({})).toBeNull();
    // An unknown pic: key never renders a broken image.
    expect(resolvePictorialIcon({ categoryId: 'cat_food', iconName: 'pic:nope' })).toBe('food');
    expect(parsePictorialValue('pic:nope')).toBeNull();
    expect(parsePictorialValue('')).toBeNull();
    expect(parsePictorialValue(null)).toBeNull();
  });

  it('pictorial URLs point at the bundled public/icons files', () => {
    expect(pictorialIconUrl('food')).toBe('/icons/food.webp');
    expect(pictorialIconUrl('income-other')).toBe('/icons/income-other.webp');
  });
});

describe('isPictorialLocked (v7.6.48 selection gating)', () => {
  it('guest mode locks every pictorial, like Analysis / Price Compare', () => {
    for (const key of PICTORIAL_ICON_KEYS) {
      expect(isPictorialLocked(key, 'guest')).toBe(true);
    }
  });

  it('premium unlocks every pictorial', () => {
    for (const key of PICTORIAL_ICON_KEYS) {
      expect(isPictorialLocked(key, 'premium')).toBe(false);
    }
  });

  it('free unlocks exactly the first 10 basics of each group; later entries stay locked', () => {
    for (const group of PICTORIAL_ICON_GROUPS) {
      group.icons.forEach((entry, index) => {
        expect(isPictorialLocked(entry.key, 'free')).toBe(index >= 10);
      });
    }
    // Spot checks at the tier boundary.
    expect(isPictorialLocked('sofa', 'free')).toBe(false);
    expect(isPictorialLocked('iron', 'free')).toBe(true);
    expect(isPictorialLocked('sleigh', 'free')).toBe(false);
    expect(isPictorialLocked('santa-belt', 'free')).toBe(true);
    expect(isPictorialLocked('dollar-bills', 'free')).toBe(true);
  });

  it('an unknown key stays locked for non-premium plans', () => {
    expect(isPictorialLocked('nope', 'free')).toBe(true);
    expect(isPictorialLocked('nope', 'guest')).toBe(true);
  });

  it('the premium-tier and beyond-10 branches exist for later packs', () => {
    const src = SRC('../categoryPictures.ts');
    expect(src).toContain("entry.tier === 'premium'");
    expect(src).toContain('found.index >= 10');
  });
});

describe('pictorial icon groups (v7.6.48)', () => {
  it('every key appears in exactly one group, and every group entry is a known key', () => {
    const seen: string[] = [];
    for (const group of PICTORIAL_ICON_GROUPS) {
      expect(group.labelMy.trim().length).toBeGreaterThan(0);
      expect(group.labelEn.trim().length).toBeGreaterThan(0);
      for (const entry of group.icons) {
        expect(PICTORIAL_ICON_KEYS).toContain(entry.key);
        seen.push(entry.key);
      }
    }
    expect(seen.sort()).toEqual([...PICTORIAL_ICON_KEYS].sort());
  });

  it('every pictorial file exists and is a non-trivial WebP image', () => {
    for (const key of PICTORIAL_ICON_KEYS) {
      const bytes = readFileSync(new URL(`../../../public/icons/${key}.webp`, import.meta.url));
      expect(bytes.length).toBeGreaterThan(1000);
      expect(bytes.subarray(0, 4).toString('latin1')).toBe('RIFF');
      expect(bytes.subarray(8, 12).toString('latin1')).toBe('WEBP');
    }
  });
});

describe('pictorial wiring pins (v7.6.48)', () => {
  it('CategoryIcon renders pictorials and exports the shared CategoryTile', () => {
    const src = SRC('../../components/CategoryIcon.tsx');
    expect(src).toContain('resolvePictorialIcon');
    expect(src).toContain('CategoryTile');
    expect(src).toContain('rounded-full object-cover');
    expect(src).toContain("categoryId?: string | null");
  });

  it('Records, detail modal, picker modal and calendar/budget surfaces use CategoryTile with the category id', () => {
    expect(SRC('../../components/TransactionsView.tsx')).toContain('categoryId={cat?.id}');
    expect(SRC('../../components/TransactionsView.tsx')).toContain('<CategoryTile');
    expect(SRC('../../components/TransactionDetailModal.tsx')).toContain('<CategoryTile');
    expect(SRC('../../components/CategoryPickerModal.tsx')).toContain('<CategoryTile');
    expect(SRC('../../components/CategoriesView.tsx')).toContain('<CategoryTile');
    expect(SRC('../../components/SmartCalendarCard.tsx')).toContain('<CategoryTile');
    expect(SRC('../../components/BudgetAnalyticsView.tsx')).toContain('<CategoryTile');
    expect(SRC('../../components/CurrentMonthExpenseDonutChart.tsx')).toContain('<CategoryTile');
  });

  it('the picker shows the pictorial packs first and gates selection, never stored data', () => {
    const src = SRC('../../components/CategoriesView.tsx');
    expect(src).toContain('PICTORIAL_ICON_GROUPS');
    expect(src).toContain('isPictorialLocked');
    expect(src).toContain('onOpenUpgradeModal');
    expect(src).toContain('pictorialIconUrl');
  });

  it('rendering never gates on the plan: only the picker references the lock helper', () => {
    expect(SRC('../../components/TransactionsView.tsx')).not.toContain('isPictorialLocked');
    expect(SRC('../../components/TransactionDetailModal.tsx')).not.toContain('isPictorialLocked');
  });

  it('the service worker precaches all 463 icons under a bumped cache name', () => {
    const src = SRC('../../../public/sw.js');
    expect(src).toContain("const CACHE_NAME = 'ngwesaryin-live-v11'");
    expect(src).toContain('bump CACHE_NAME on EVERY release');
    for (const key of PICTORIAL_ICON_KEYS) {
      expect(src).toContain(`'/icons/${key}.webp'`);
    }
  });
});

describe('Version pins roll to v7.6.52 / build 366', () => {
  it('constants, version.json and the top history entry agree, with no Admin strings', () => {
    expect(CURRENT_APP_VERSION).toBe('v7.6.55');
    expect(CURRENT_BUILD_NUMBER).toBe(369);
    expect(VERSION_JSON.version).toBe('v7.6.55');
    expect(VERSION_JSON.buildNumber).toBe(369);
    const top = VERSION_HISTORY[0];
    expect(top.version).toBe('v7.6.55');
    expect(top.buildNumber).toBe(369);
    expect(top.changesMy.join(' ')).not.toContain('Admin');
    expect(top.changesEn.join(' ')).not.toContain('Admin');
    expect(top.changesMy.length).toBe(7);
    expect(top.changesEn.length).toBe(7);
    expect(VERSION_JSON.changesMy).toEqual(top.changesMy);
    expect(VERSION_JSON.changesEn).toEqual(top.changesEn);
  });
});
