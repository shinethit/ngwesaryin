// [v7.6.45] Display-time icon-tile colours for Records rows.
//
// The 17 default categories in initialData.ts are mostly greens
// (six green/teal income colours), so the 40px row tiles read
// monochrome even though every category has its own colour. The
// stored colours are NEVER rewritten (no data migration, no
// Firestore write): when a category still carries exactly its
// shipped default colour, the tile shows a curated distinct colour
// instead. A colour the user changed — or any colour on a category
// the user added — is shown exactly as stored, so custom colours
// always win.
//
// The default-colour lookup is derived from INITIAL_CATEGORIES at
// runtime (single source of truth): if a future version ships
// different defaults, the "still default" test follows them.
import { INITIAL_CATEGORIES } from '../data/initialData';

const DEFAULT_COLOR_BY_ID = new Map<string, string>(
  INITIAL_CATEGORIES.map((c) => [c.id, (c.color || '').trim().toLowerCase()]),
);

// Curated display colours, one per default category id. Only used
// while the category still carries its shipped default colour.
// Hues are spread across the wheel (emerald/blue/teal/amber/cyan/
// lime/fuchsia/slate/red/yellow/sky/violet/pink/rose/orange/indigo/
// stone) so neighbouring rows read distinct at a glance; every
// colour keeps the white glyph readable.
const DISPLAY_TILE_COLORS: Record<string, string> = {
  cat_salary: '#10B981', // emerald (unchanged)
  cat_business: '#2563EB', // blue
  cat_freelance: '#0F766E', // dark teal
  cat_bonus: '#D97706', // amber
  cat_investment: '#0891B2', // cyan
  cat_income_other: '#65A30D', // lime
  cat_transfer: '#C026D3', // fuchsia
  cat_reconcile: '#64748B', // slate (unchanged)
  cat_food: '#EF4444', // red (unchanged)
  cat_transport: '#CA8A04', // dark yellow (readable white glyph)
  cat_vehicle: '#0284C7', // sky (unchanged)
  cat_utilities: '#8B5CF6', // violet (unchanged)
  cat_shopping: '#EC4899', // pink (unchanged)
  cat_health: '#F43F5E', // rose (unchanged)
  cat_charity: '#EA580C', // orange
  cat_entertainment: '#4F46E5', // indigo
  cat_expense_other: '#78716C', // stone
};

/**
 * The background colour for a category's icon tile in the Records
 * list. `isIncome` picks the fallback when the category (or its
 * colour) is missing — the same fallback the row used before.
 */
export function getCategoryTileColor(
  cat: { id?: string; color?: string } | undefined | null,
  isIncome: boolean,
): string {
  const fallback = isIncome ? '#10B981' : '#EF4444';
  if (!cat) return fallback;
  const stored = (cat.color || '').trim().toLowerCase();
  const shippedDefault = cat.id ? DEFAULT_COLOR_BY_ID.get(cat.id) : undefined;
  if (shippedDefault && stored === shippedDefault) {
    return (cat.id && DISPLAY_TILE_COLORS[cat.id]) || stored || fallback;
  }
  return stored || fallback;
}
