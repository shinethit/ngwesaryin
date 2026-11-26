// [v7.6.48] The complete pictorial icon library: 463 keys in 14
// manifest packs. Pins the manifest order, per-group counts, the
// first-10-Free tier rule, and the selection-time lock matrix, plus
// the service-worker precache holding every icon. Source reads use
// `new URL` — NO path comparisons.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  DEFAULT_PICTORIAL_BY_CATEGORY,
  PICTORIAL_ICON_GROUPS,
  PICTORIAL_ICON_KEYS,
  isPictorialLocked,
  parsePictorialValue,
  resolvePictorialIcon,
} from '../categoryPictures';

const SRC = (rel: string) => readFileSync(new URL(rel, import.meta.url), 'utf8');

const GROUP_ORDER = [
  'home',
  'repairing',
  'food',
  'kitchen',
  'daily-care',
  'beauty',
  'pets',
  'health-charity',
  'love',
  'vehicle-travel',
  'money',
  'entertainment-other',
  'seasonal',
  'other',
] as const;

const GROUP_COUNTS: Record<string, number> = {
  home: 45,
  repairing: 20,
  food: 60,
  kitchen: 22,
  'daily-care': 37,
  beauty: 18,
  pets: 19,
  'health-charity': 19,
  love: 20,
  'vehicle-travel': 54,
  money: 19,
  'entertainment-other': 31,
  seasonal: 54,
  other: 45,
};

const LEGACY_17 = [
  'salary',
  'business',
  'freelance',
  'bonus',
  'investment',
  'income-other',
  'transfer',
  'reconcile',
  'food',
  'transport',
  'vehicle',
  'utilities',
  'shopping',
  'health',
  'charity',
  'entertainment',
  'expense-other',
];

describe('pictorial library scale (v7.6.48)', () => {
  it('holds 463 keys in 14 groups, in manifest order, with the manifest counts', () => {
    expect(PICTORIAL_ICON_KEYS).toHaveLength(463);
    expect(PICTORIAL_ICON_GROUPS.map((g) => g.key)).toEqual([...GROUP_ORDER]);
    for (const group of PICTORIAL_ICON_GROUPS) {
      expect(group.icons).toHaveLength(GROUP_COUNTS[group.key]);
      expect(group.labelMy.trim().length).toBeGreaterThan(0);
      expect(group.labelEn.trim().length).toBeGreaterThan(0);
    }
    const total = PICTORIAL_ICON_GROUPS.reduce((n, g) => n + g.icons.length, 0);
    expect(total).toBe(463);
  });

  it('every key appears in exactly one group', () => {
    const seen: string[] = [];
    for (const group of PICTORIAL_ICON_GROUPS) {
      for (const entry of group.icons) seen.push(entry.key);
    }
    expect(seen.sort()).toEqual([...PICTORIAL_ICON_KEYS].sort());
    expect(new Set(seen).size).toBe(463);
  });

  it('the first 10 entries of each group are basic; the rest are premium', () => {
    for (const group of PICTORIAL_ICON_GROUPS) {
      group.icons.forEach((entry, index) => {
        expect(entry.tier).toBe(index < 10 ? 'basic' : 'premium');
      });
    }
  });

  it('all 17 v7.6.47 legacy keys stay basic in their new groups', () => {
    for (const key of LEGACY_17) {
      expect(PICTORIAL_ICON_KEYS).toContain(key);
      const group = PICTORIAL_ICON_GROUPS.find((g) =>
        g.icons.some((e) => e.key === key),
      )!;
      const entry = group.icons.find((e) => e.key === key)!;
      expect(entry.tier).toBe('basic');
    }
  });

  it('the default-category map is unchanged: exactly the 17 seeded categories', () => {
    expect(Object.keys(DEFAULT_PICTORIAL_BY_CATEGORY)).toHaveLength(17);
    expect(DEFAULT_PICTORIAL_BY_CATEGORY.cat_food).toBe('food');
    expect(DEFAULT_PICTORIAL_BY_CATEGORY.cat_salary).toBe('salary');
    expect(DEFAULT_PICTORIAL_BY_CATEGORY.cat_vehicle).toBe('vehicle');
    expect(DEFAULT_PICTORIAL_BY_CATEGORY.cat_expense_other).toBe('expense-other');
  });
});

describe('pictorial lock matrix (v7.6.48)', () => {
  it('guest locks all 463; premium unlocks all 463', () => {
    for (const key of PICTORIAL_ICON_KEYS) {
      expect(isPictorialLocked(key, 'guest')).toBe(true);
      expect(isPictorialLocked(key, 'premium')).toBe(false);
    }
  });

  it('free unlocks exactly the 140 basics (10 per group) and locks the 323 premium entries', () => {
    let unlocked = 0;
    let locked = 0;
    for (const key of PICTORIAL_ICON_KEYS) {
      if (isPictorialLocked(key, 'free')) locked += 1;
      else unlocked += 1;
    }
    expect(unlocked).toBe(140);
    expect(locked).toBe(323);
  });

  it('premium-tier keys stay parseable and selectable-by-value (grandfathering renders them)', () => {
    expect(parsePictorialValue('pic:iron')).toBe('iron');
    expect(parsePictorialValue('pic:santa-belt')).toBe('santa-belt');
    expect(resolvePictorialIcon({ categoryId: 'cat_food', iconName: 'pic:iron' })).toBe('iron');
  });
});

describe('pictorial precache + files (v7.6.48)', () => {
  it('the service worker precaches all 463 icons under cache v11', () => {
    const src = SRC('../../../public/sw.js');
    expect(src).toContain("const CACHE_NAME = 'ngwesaryin-live-v11'");
    const matches = src.match(/'\/icons\/[a-z0-9-]+\.webp'/g) || [];
    expect(matches).toHaveLength(463);
    expect(new Set(matches).size).toBe(463);
    for (const key of PICTORIAL_ICON_KEYS) {
      expect(src).toContain(`'/icons/${key}.webp'`);
    }
  });

  it('every pictorial file exists, is WebP, and the library totals over 2MB', () => {
    let total = 0;
    for (const key of PICTORIAL_ICON_KEYS) {
      const bytes = readFileSync(new URL(`../../../public/icons/${key}.webp`, import.meta.url));
      expect(bytes.length).toBeGreaterThan(1000);
      expect(bytes.subarray(0, 4).toString('latin1')).toBe('RIFF');
      expect(bytes.subarray(8, 12).toString('latin1')).toBe('WEBP');
      total += bytes.length;
    }
    expect(total).toBeGreaterThan(2_000_000);
  });
});
