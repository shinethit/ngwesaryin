// [v7.6.43] Two-level shop taxonomy: Category -> Subcategory.
// The subcategory VALUE is what a shop stores in `note`; the parent
// is derived on read, so legacy shops need no doc rewrite. These
// tests pin the approved mapping (user-approved 2026-11-25) and the
// read-time fallback rules. No path comparisons: module imports for
// behavior, new-URL reads for the wiring pins.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  PRESET_TAGS,
  SHOP_CATEGORIES,
  SHOP_CATEGORY_IDS,
  SUBCATEGORY_PARENT,
  resolveShopTaxonomy,
} from '../../components/shops/shopConstants';

const read = (rel: string) =>
  readFileSync(new URL(rel, import.meta.url), 'utf8');

const OLD_FLAT_VALUES = [
  'grocery',
  'pharmacy',
  'restaurant',
  'workshop',
  'wholesale',
  'car-rental',
  'real-estate',
  'advertising',
  'oversea-employment',
  'insurance',
  'local-employment',
  'seaman-shipping',
  'general-services',
  'custom-clearance',
  'other',
  'unknown',
] as const;

const EXPECTED_PARENT: Record<string, string> = {
  grocery: 'food',
  restaurant: 'food',
  wholesale: 'food',
  pharmacy: 'health',
  clinic: 'health',
  hospital: 'health',
  workshop: 'vehicle',
  'car-rental': 'vehicle',
  'oversea-employment': 'jobs',
  'local-employment': 'jobs',
  'seaman-shipping': 'jobs',
  'general-services': 'services',
  insurance: 'services',
  'real-estate': 'services',
  advertising: 'services',
  'custom-clearance': 'services',
  other: 'other',
  unknown: 'other',
};

describe('taxonomy shape (v7.6.43)', () => {
  it('has exactly the six approved parent categories, in order, Other last', () => {
    expect(SHOP_CATEGORY_IDS).toEqual([
      'food',
      'health',
      'vehicle',
      'jobs',
      'services',
      'other',
    ]);
    for (const cat of SHOP_CATEGORIES) {
      expect(cat.labelMy.length).toBeGreaterThan(0);
      expect(cat.labelEn.length).toBeGreaterThan(0);
      expect(cat.subTypes.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('every subcategory value belongs to exactly one parent', () => {
    const seen = new Map<string, string>();
    for (const cat of SHOP_CATEGORIES) {
      for (const sub of cat.subTypes) {
        expect(seen.has(sub)).toBe(false);
        seen.set(sub, cat.id);
      }
    }
    expect(seen.size).toBe(18);
    for (const [sub, parent] of Object.entries(EXPECTED_PARENT)) {
      expect(seen.get(sub)).toBe(parent);
      expect(SUBCATEGORY_PARENT[sub]).toBe(parent);
    }
  });

  it('covers every old flat PRESET_TAGS value plus the two new health sub-types', () => {
    for (const value of OLD_FLAT_VALUES) {
      expect(SUBCATEGORY_PARENT[value]).toBeDefined();
    }
    expect(SUBCATEGORY_PARENT['clinic']).toBe('health');
    expect(SUBCATEGORY_PARENT['hospital']).toBe('health');
    // 'all' is a filter-only pseudo value, never a subcategory.
    expect(SUBCATEGORY_PARENT['all']).toBeUndefined();
  });

  it('PRESET_TAGS carries the new clinic/hospital labels for the card pill', () => {
    const clinic = PRESET_TAGS.find((t) => t.value === 'clinic');
    const hospital = PRESET_TAGS.find((t) => t.value === 'hospital');
    expect(clinic?.labelMy).toBe('ဆေးခန်း');
    expect(clinic?.labelEn).toBe('Clinic');
    expect(hospital?.labelMy).toBe('ဆေးရုံ');
    expect(hospital?.labelEn).toBe('Hospital');
  });
});

describe('resolveShopTaxonomy — legacy read mapping (v7.6.43)', () => {
  it('maps every legacy flat value with NO stored parent', () => {
    for (const value of OLD_FLAT_VALUES) {
      const resolved = resolveShopTaxonomy({ name: 'Some Shop', note: value });
      expect(resolved.categoryId).toBe(EXPECTED_PARENT[value]);
      expect(resolved.subType).toBe(value);
    }
  });

  it('maps the new health sub-types', () => {
    expect(resolveShopTaxonomy({ note: 'clinic' })).toEqual({
      categoryId: 'health',
      subType: 'clinic',
    });
    expect(resolveShopTaxonomy({ note: 'hospital' })).toEqual({
      categoryId: 'health',
      subType: 'hospital',
    });
  });

  it('a known value always wins over a conflicting stored parent', () => {
    // Deterministic: the stored field can never silently move a
    // legacy shop to another parent.
    expect(
      resolveShopTaxonomy({ note: 'pharmacy', shopCategory: 'food' })
    ).toEqual({ categoryId: 'health', subType: 'pharmacy' });
  });

  it('custom text trusts a valid stored parent, else falls back to Other', () => {
    expect(
      resolveShopTaxonomy({ note: 'စာအုပ်ဆိုင်', shopCategory: 'food' })
    ).toEqual({ categoryId: 'food', subType: 'စာအုပ်ဆိုင်' });
    expect(resolveShopTaxonomy({ note: 'စာအုပ်ဆိုင်' })).toEqual({
      categoryId: 'other',
      subType: 'စာအုပ်ဆိုင်',
    });
    expect(
      resolveShopTaxonomy({ note: 'စာအုပ်ဆိုင်', shopCategory: 'bogus' })
    ).toEqual({ categoryId: 'other', subType: 'စာအုပ်ဆိုင်' });
  });

  it('an empty note reads as Other and is never lost', () => {
    expect(resolveShopTaxonomy({ name: 'Nameless' })).toEqual({
      categoryId: 'other',
      subType: 'other',
    });
    expect(resolveShopTaxonomy({ note: '  ' })).toEqual({
      categoryId: 'other',
      subType: 'other',
    });
  });

  it('Unknown import stubs always read as Unknown under Other', () => {
    expect(
      resolveShopTaxonomy({ name: 'Unknown Shop 12', note: 'pharmacy' })
    ).toEqual({ categoryId: 'other', subType: 'unknown' });
  });
});

describe('two-step picker + two-level filter wiring (v7.6.43)', () => {
  it('ShopModal renders parent chips then subcategory chips; the custom input is gated on the custom fallback', () => {
    const modal = read('../../components/shops/ShopModal.tsx');
    expect(modal).toContain('data-testid="shop-category-picker"');
    expect(modal).toContain('data-testid="shop-subcategory-picker"');
    expect(modal).toContain('data-testid="shop-custom-subtype"');
    expect(modal).toContain("{formSubType === 'custom' && (");
    expect(modal).toContain('shopCategory: formCategory,');
    expect(modal).not.toContain('formCustomCategory');
  });

  it('ShopsView filters and groups by the resolved two levels', () => {
    const view = read('../../components/ShopsView.tsx');
    expect(view).toContain('selectedCategoryFilter');
    expect(view).toContain('selectedSubTypeFilter');
    expect(view).toContain('id="shop-subcategory-filter"');
    expect(view).toContain('resolveShopTaxonomy(shop)');
    expect(view).toContain('SHOP_CATEGORIES.forEach((catDef)');
    expect(view).not.toContain('selectedTagFilter');
  });

  it('new saves write both levels through the shared builders', () => {
    const save = read('../shopSave.ts');
    expect(save).toContain('shopCategory: string;');
    expect(save).toContain('shopCategory: data.shopCategory,');
  });
});
