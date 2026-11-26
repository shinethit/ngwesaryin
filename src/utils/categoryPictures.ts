// [v7.6.47] Redrawn flat pictorial category icons (Money Lover-style:
// a detailed colourful flat illustration in a solid circle with a
// soft long shadow). Original artwork generated for this app —
// never Money Lover's assets, and never third-party brand logos.
//
// Storage: a category's `icon` field may hold a lucide name (as
// before) or `pic:<key>`. Resolution order in
// resolvePictorialIcon: an explicit `pic:` value wins; else the
// default category id maps to its pictorial; else null (the lucide
// fallback in CategoryIcon renders). Stored values are NEVER
// rewritten for plan changes — grandfathering falls out of this:
// a `pic:` icon chosen while Premium keeps rendering after Premium
// lapses, because rendering never checks the plan. The plan is
// checked ONLY at picker selection time (isPictorialLocked).
//
// Files live in public/icons/<key>.webp (bundled by Vite, listed
// in the service worker precache in public/sw.js) and render via
// <img> — see CategoryTile in CategoryIcon.tsx.
import type { PlanType } from '../types';

export type PictorialTier = 'basic' | 'premium';

export interface PictorialIconGroup {
  key: string;
  labelMy: string;
  labelEn: string;
  icons: { key: string; tier: PictorialTier }[];
}

/** The 17 pictorial keys shipped in v7.6.47 (one per default category). */
export const PICTORIAL_ICON_KEYS = [
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
] as const;

export type PictorialIconKey = (typeof PICTORIAL_ICON_KEYS)[number];

const PICTORIAL_KEY_SET = new Set<string>(PICTORIAL_ICON_KEYS);

/** Default category id -> its pictorial key (the v7.6.47 icon set). */
export const DEFAULT_PICTORIAL_BY_CATEGORY: Record<string, PictorialIconKey> = {
  cat_salary: 'salary',
  cat_business: 'business',
  cat_freelance: 'freelance',
  cat_bonus: 'bonus',
  cat_investment: 'investment',
  cat_income_other: 'income-other',
  cat_transfer: 'transfer',
  cat_reconcile: 'reconcile',
  cat_food: 'food',
  cat_transport: 'transport',
  cat_vehicle: 'vehicle',
  cat_utilities: 'utilities',
  cat_shopping: 'shopping',
  cat_health: 'health',
  cat_charity: 'charity',
  cat_entertainment: 'entertainment',
  cat_expense_other: 'expense-other',
};

/**
 * Pictorial packs, grouped like Money Lover's icon packs — each icon
 * in its proper group, never one flat list. Every icon in v7.6.47 is
 * 'basic': the first 10 icons of a group are the Free basics, and
 * later packs add 'premium' icons after them (see isPictorialLocked).
 */
export const PICTORIAL_ICON_GROUPS: PictorialIconGroup[] = [
  {
    key: 'money',
    labelMy: 'ငွေ / ဝင်ငွေ',
    labelEn: 'Money & Income',
    icons: [
      { key: 'salary', tier: 'basic' },
      { key: 'business', tier: 'basic' },
      { key: 'freelance', tier: 'basic' },
      { key: 'bonus', tier: 'basic' },
      { key: 'investment', tier: 'basic' },
      { key: 'income-other', tier: 'basic' },
      { key: 'transfer', tier: 'basic' },
      { key: 'reconcile', tier: 'basic' },
    ],
  },
  {
    key: 'food',
    labelMy: 'အစားအသောက်',
    labelEn: 'Food & Groceries',
    icons: [{ key: 'food', tier: 'basic' }],
  },
  {
    key: 'home-shopping',
    labelMy: 'အိမ် / ဈေးဝယ်',
    labelEn: 'Home & Shopping',
    icons: [
      { key: 'utilities', tier: 'basic' },
      { key: 'shopping', tier: 'basic' },
    ],
  },
  {
    key: 'vehicle-travel',
    labelMy: 'ယာဉ် / ခရီး',
    labelEn: 'Vehicle & Travel',
    icons: [
      { key: 'transport', tier: 'basic' },
      { key: 'vehicle', tier: 'basic' },
    ],
  },
  {
    key: 'health-charity',
    labelMy: 'ကျန်းမာရေး / အလှူ',
    labelEn: 'Health & Charity',
    icons: [
      { key: 'health', tier: 'basic' },
      { key: 'charity', tier: 'basic' },
    ],
  },
  {
    key: 'entertainment-other',
    labelMy: 'ဖျော်ဖြေရေး / အခြား',
    labelEn: 'Entertainment & Other',
    icons: [
      { key: 'entertainment', tier: 'basic' },
      { key: 'expense-other', tier: 'basic' },
    ],
  },
];

/** Public URL of a pictorial icon image (served from public/icons/). */
export function pictorialIconUrl(key: string): string {
  return `/icons/${key}.webp`;
}

function isPictorialKey(value: string): value is PictorialIconKey {
  return PICTORIAL_KEY_SET.has(value);
}

/**
 * Extract the pictorial key from a stored `icon` value (`pic:<key>`),
 * or null when the value is a lucide name, empty, or an unknown key
 * (unknown keys fall back to the lucide glyph, never a broken image).
 */
export function parsePictorialValue(value: string | undefined | null): PictorialIconKey | null {
  if (!value || !value.startsWith('pic:')) return null;
  const key = value.slice(4);
  return isPictorialKey(key) ? key : null;
}

/**
 * The pictorial key to render for a category: an explicit `pic:`
 * value on the category wins; otherwise the default category id
 * maps to its pictorial (so old accounts, seeded with lucide
 * names, show pictorials without any data rewrite); otherwise
 * null — the caller renders the lucide fallback.
 */
export function resolvePictorialIcon(args: {
  categoryId?: string | null;
  iconName?: string | null;
}): PictorialIconKey | null {
  const explicit = parsePictorialValue(args.iconName);
  if (explicit) return explicit;
  if (args.categoryId) {
    const mapped = DEFAULT_PICTORIAL_BY_CATEGORY[args.categoryId];
    if (mapped) return mapped;
  }
  return null;
}

function findGroupIndex(key: string): { group: PictorialIconGroup; index: number } | null {
  for (const group of PICTORIAL_ICON_GROUPS) {
    const index = group.icons.findIndex((entry) => entry.key === key);
    if (index >= 0) return { group, index };
  }
  return null;
}

/**
 * Selection-time gate for the pictorial picker (user rules,
 * 2026-11-25). Guest mode locks every pictorial, the same guest
 * lock as Analysis / Price Compare. Premium unlocks all icons.
 * Free unlocks only the BASIC icons of a group — the first 10
 * entries (a 'premium' tier entry past position 10, or any entry
 * marked premium, stays locked). Rendering never calls this, so a
 * Premium icon chosen earlier is never stripped when the plan
 * lapses; it only stops being re-selectable once changed away.
 */
export function isPictorialLocked(key: string, plan: PlanType): boolean {
  if (plan === 'premium') return false;
  if (plan === 'guest') return true;
  const found = findGroupIndex(key);
  if (!found) return true;
  const entry = found.group.icons[found.index];
  if (entry.tier === 'premium') return true;
  if (found.index >= 10) return true;
  return false;
}
