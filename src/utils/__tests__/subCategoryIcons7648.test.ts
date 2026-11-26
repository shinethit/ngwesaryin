// [v7.6.48] Sub-category icons: the resolver (own icon wins, else the
// default-id map, else the parent icon), the default map's consistency
// with the seed data in initialData.ts, the shared picker in
// CategoriesView, and the render-site wiring. Source reads use
// `new URL` — NO path comparisons.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  DEFAULT_SUBCATEGORY_ICONS,
  PICTORIAL_ICON_KEYS,
  isPictorialLocked,
  resolveSubCategoryIconValue,
} from '../categoryPictures';
import { INITIAL_CATEGORIES } from '../../data/initialData';

const SRC = (rel: string) => readFileSync(new URL(rel, import.meta.url), 'utf8');

// Sub-categories with no fitting pictorial in the library keep the
// parent fallback (no icon in the seed data, no map entry).
const FALLBACK_IDS = ['sub_tf_out', 'sub_tf_in', 'sub_veh_tire', 'sub_exp_misc'];

const PARENT_PIC = { id: 'cat_food', icon: 'pic:food' };
const PARENT_LUCIDE = { id: 'cat_custom_1', icon: 'Coffee' };

describe('resolveSubCategoryIconValue', () => {
  it('own pic: icon wins over the default map and the parent', () => {
    expect(
      resolveSubCategoryIconValue(
        { id: 'sub_food_breakfast', name: 'x', nameEn: 'x', icon: 'pic:coffee-cup' },
        PARENT_PIC,
      ),
    ).toBe('pic:coffee-cup');
  });

  it('own lucide icon wins over the default map and the parent', () => {
    expect(
      resolveSubCategoryIconValue(
        { id: 'sub_food_breakfast', name: 'x', nameEn: 'x', icon: 'Pizza' },
        PARENT_PIC,
      ),
    ).toBe('Pizza');
  });

  it('unset icon resolves through the default-id map', () => {
    expect(
      resolveSubCategoryIconValue(
        { id: 'sub_food_breakfast', name: 'x', nameEn: 'x' },
        PARENT_PIC,
      ),
    ).toBe('pic:fried-egg');
    expect(
      resolveSubCategoryIconValue(
        { id: 'sub_veh_fuel', name: 'x', nameEn: 'x' },
        PARENT_PIC,
      ),
    ).toBe('pic:petrol-pump');
  });

  it('unknown default id falls back to the parent pictorial in pic: form', () => {
    expect(
      resolveSubCategoryIconValue(
        { id: 'sub_custom_9', name: 'x', nameEn: 'x' },
        PARENT_PIC,
      ),
    ).toBe('pic:food');
  });

  it('unknown id with a lucide parent falls back to the raw parent icon', () => {
    expect(
      resolveSubCategoryIconValue(
        { id: 'sub_custom_9', name: 'x', nameEn: 'x' },
        PARENT_LUCIDE,
      ),
    ).toBe('Coffee');
  });

  it('a default-category parent pictorial wins over a stored lucide parent icon', () => {
    expect(
      resolveSubCategoryIconValue(
        { id: 'sub_custom_9', name: 'x', nameEn: 'x' },
        { id: 'cat_food', icon: 'Utensils' },
      ),
    ).toBe('pic:food');
  });

  it('no sub and no parent resolves to Tag', () => {
    expect(resolveSubCategoryIconValue(undefined, undefined)).toBe('Tag');
    expect(resolveSubCategoryIconValue(null, null)).toBe('Tag');
  });

  it('grandfathering: a Premium pictorial chosen while Premium keeps resolving with no plan check', () => {
    // 'santa-belt' is past the first 10 of its group, so Free locks it at
    // selection time — yet the resolver (rendering) returns it as-is.
    expect(isPictorialLocked('santa-belt', 'free')).toBe(true);
    expect(
      resolveSubCategoryIconValue(
        { id: 'sub_custom_9', name: 'x', nameEn: 'x', icon: 'pic:santa-belt' },
        PARENT_PIC,
      ),
    ).toBe('pic:santa-belt');
  });
});

describe('DEFAULT_SUBCATEGORY_ICONS consistency with seed data', () => {
  it('covers 50 of the 54 default sub-categories; the other 4 keep the parent fallback', () => {
    const seeded = INITIAL_CATEGORIES.flatMap((c) => c.subCategories || []);
    expect(seeded).toHaveLength(54);
    const seededIds = seeded.map((s) => s.id);
    expect(new Set(seededIds).size).toBe(54);
    expect(Object.keys(DEFAULT_SUBCATEGORY_ICONS)).toHaveLength(50);
    for (const id of FALLBACK_IDS) {
      expect(DEFAULT_SUBCATEGORY_ICONS[id]).toBeUndefined();
      expect(seeded.find((s) => s.id === id)?.icon).toBeUndefined();
    }
    for (const id of Object.keys(DEFAULT_SUBCATEGORY_ICONS)) {
      expect(seededIds).toContain(id);
    }
  });

  it('every seeded sub-category icon equals its map entry', () => {
    const seeded = INITIAL_CATEGORIES.flatMap((c) => c.subCategories || []);
    for (const sub of seeded) {
      const mapped = DEFAULT_SUBCATEGORY_ICONS[sub.id];
      if (mapped) expect(sub.icon).toBe(mapped);
    }
  });

  it('every mapped value is a pic: key that exists in the 463-key library', () => {
    for (const [id, value] of Object.entries(DEFAULT_SUBCATEGORY_ICONS)) {
      expect(value.startsWith('pic:')).toBe(true);
      expect(PICTORIAL_ICON_KEYS).toContain(value.slice(4));
    }
  });

  it('every mapped pictorial file exists on disk', () => {
    for (const value of Object.values(DEFAULT_SUBCATEGORY_ICONS)) {
      const key = value.slice(4);
      const bytes = readFileSync(
        new URL(`../../../public/icons/${key}.webp`, import.meta.url),
      );
      expect(bytes.length).toBeGreaterThan(0);
    }
  });
});

describe('sub-category icon wiring in components', () => {
  it('CategoriesView uses ONE shared IconPickerGrid for the category form and the sub modal', () => {
    const src = SRC('../../components/CategoriesView.tsx');
    expect(src).toContain('function IconPickerGrid({');
    expect(src.match(/<IconPickerGrid/g)?.length).toBe(2);
    expect(src).toContain('selectedValue={catIcon}');
    expect(src).toContain('selectedValue={editingSubModal.icon}');
    expect(src).toContain('resolveSubCategoryIconValue(sub, category)');
  });

  it('clearing the sub icon drops the stored key so the fallback applies', () => {
    const src = SRC('../../components/CategoriesView.tsx');
    expect(src).toContain('buildUpdatedSubCategory');
    expect(src).toContain('const { icon: _droppedIcon, ...rest } = m.subCategory;');
    expect(src).toContain("...(m.icon ? { icon: m.icon } : {})");
    expect(src.match(/buildUpdatedSubCategory\(editingSubModal\)/g)?.length).toBe(3);
  });

  it('every sub-category render site resolves through resolveSubCategoryIconValue without a categoryId', () => {
    const sites: Array<[string, string]> = [
      ['../../components/CategoryPickerModal.tsx', 'resolveSubCategoryIconValue(sub, cat)'],
      ['../../components/TransactionsView.tsx', 'resolveSubCategoryIconValue(subCat, cat)'],
      ['../../components/TransactionDetailModal.tsx', 'resolveSubCategoryIconValue(subCat, cat)'],
      ['../../components/TransactionDetailModal.tsx', 'resolveSubCategoryIconValue(sliceSub, sliceCat)'],
      ['../../components/TransactionModal.tsx', 'resolveSubCategoryIconValue(sub, selectedCatObj)'],
      ['../../components/SmartCalendarCard.tsx', 'resolveSubCategoryIconValue(tileSub, cat)'],
      ['../../components/GlobalSearchModal.tsx', 'resolveSubCategoryIconValue(subCat, cat)'],
      ['../../components/SpendingComparisonView.tsx', 'resolveSubCategoryIconValue(subObj, sub.category)'],
    ];
    for (const [rel, pin] of sites) {
      expect(SRC(rel)).toContain(pin);
    }
    // The picker sub-row tile must NOT pass categoryId (it would let the
    // parent pictorial override a lucide sub icon).
    const picker = SRC('../../components/CategoryPickerModal.tsx');
    const tileBlock = picker.slice(
      picker.indexOf('resolveSubCategoryIconValue(sub, cat)'),
    );
    expect(tileBlock.slice(0, 400)).not.toContain('categoryId={cat.id}');
  });
});
