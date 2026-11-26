// [v7.6.45] Display-time icon-tile colours for Records rows.
// [v7.6.46] Rule change: the curated colour ALWAYS wins for the 17
// default category ids, regardless of the stored value.
//
// The 17 default categories in initialData.ts are mostly greens
// (six green/teal income colours), so the 40px row tiles read
// monochrome even though every category has its own colour. The
// stored colours are NEVER rewritten (no data migration, no
// Firestore write): for a default category id, the tile shows the
// curated distinct colour below.
//
// Why unconditional (the v7.6.45 gate failed on real accounts):
// v7.6.45 remapped only when the stored colour EXACTLY equalled
// the CURRENT shipped default. Real long-lived accounts carry
// stored colours seeded by OLDER defaults that differ from
// today's, so the gate failed silently and nothing visibly
// changed. And no colour-picker UI exists anywhere (no input
// type="color" in src; CategoryPickerModal only DISPLAYS
// cat.color), so stored colours on default ids are ALWAYS
// seed-derived, never user-picked — remapping them cannot
// override a choice the user made. A colour on a category the
// user added IS shown exactly as stored.
//
// The detail-modal tile keeps the stored colour (v7.6.45
// decision, unchanged); CategoryPickerModal tiles unchanged.
// Only the Records row call site uses this helper.
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
  // [v7.6.46] Default ids always show the curated colour, whatever
  // the stored value is (see the header comment).
  if (cat.id && DISPLAY_TILE_COLORS[cat.id]) return DISPLAY_TILE_COLORS[cat.id];
  const stored = (cat.color || '').trim().toLowerCase();
  return stored || fallback;
}
