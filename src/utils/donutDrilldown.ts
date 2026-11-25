// [v7.6.32] Donut drill-down + outside labels — pure helpers for the
// current-month expense donut (CurrentMonthExpenseDonutChart). The
// sub-category breakdown and the record list are computed from the
// SAME month-scoped expenses the donut itself aggregates, slice by
// slice (getSplitAttribution), with the same per-wallet MMK
// conversion the caller already uses — so the panel always foots to
// the donut. Label placement is pure geometry: slices start at 12
// o'clock and run clockwise (the SVG is -rotate-90), and only
// slices at or above DONUT_LABEL_MIN_PERCENT get a callout label
// beside the donut — with 9 slices and several slivers, labelling
// all of them would overlap; the list below the donut already shows
// every slice. Pure, unit-tested in donutDrilldown7632.
import type { Category, Transaction } from '../types';
import { formatCalendarDetailItems } from './calendarDetailLabels';
import { getSplitAttribution } from './transactionSplits';

/** Displayed (rounded) percentage at or above which a slice gets a
 *  callout label beside the donut. The filter uses the SAME rounded
 *  percentage the legend shows, so a slice displaying 5% is labelled
 *  even when its exact share is 4.6%. */
export const DONUT_LABEL_MIN_PERCENT = 5;

/** Vertical separation enforced between two labels on the same side
 *  of the donut, in percent of the donut wrapper height. */
// [v7.6.32] Minimum center-to-center separation between two labels on
// the same side, in percent of the donut wrapper height. 24pct of the
// 176px wrapper is ~42px: a label is ~30px tall with a one-line value
// and ~42px when an exact-mode value (e.g. "510,000 MMK · 51%") wraps
// onto two lines inside its 88px box — the gap keeps wrapped labels
// from overlapping each other.
export const DONUT_LABEL_MIN_GAP_PCT = 24;

function generalLabel(lang: 'my' | 'en'): string {
  return lang === 'my' ? 'အထွေထွေ' : 'General';
}

/**
 * Sub-category display name for a donut slice, mirroring the
 * statementData resolveSubName precedent: no sub-category id, or an
 * id the category does not know, is the General row — never blank,
 * never the raw id.
 */
export function resolveDonutSubName(
  category: Category | undefined,
  subCategoryId: string | undefined,
  lang: 'my' | 'en',
): string {
  if (!subCategoryId) return generalLabel(lang);
  const sub = category?.subCategories?.find((s) => s.id === subCategoryId);
  if (!sub) return generalLabel(lang);
  return lang === 'my' ? sub.name : sub.nameEn || sub.name;
}

export interface DonutSubRow {
  /** '' for the General row (no sub-category id). */
  key: string;
  subCategoryId: string;
  name: string;
  amount: number;
  /** Share of the CATEGORY total, not of the month. */
  percentage: number;
}

/**
 * Sub-category breakdown for one donut category: this month's slices
 * in the category, grouped by sub-category id, MMK-converted with
 * the caller's converter, amount-desc. Percentages are shares of the
 * category total, so the rows foot to the donut slice.
 */
export function buildDonutSubBreakdown(
  expenses: Transaction[],
  categoryId: string,
  category: Category | undefined,
  convert: (t: Transaction, amount?: number) => number,
  lang: 'my' | 'en',
): DonutSubRow[] {
  const map = new Map<string, number>();
  let total = 0;
  for (const t of expenses) {
    for (const slice of getSplitAttribution(t)) {
      if (slice.categoryId !== categoryId) continue;
      const amount = convert(t, slice.amount);
      total += amount;
      map.set(slice.subCategoryId || '', (map.get(slice.subCategoryId || '') || 0) + amount);
    }
  }
  return [...map.entries()]
    .map(([key, amount]) => ({
      key,
      subCategoryId: key,
      name: resolveDonutSubName(category, key || undefined, lang),
      amount,
      percentage: total > 0 ? Math.round((amount / total) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}

export interface DonutRecordRow {
  tx: Transaction;
  /** This record's slice amount(s) in the category, MMK-converted. */
  amount: number;
}

/**
 * The category's records for the expanded panel: every month-scoped
 * expense with at least one slice in the category, date-desc (id
 * breaks ties, so the order is deterministic). A split record
 * appears ONCE, with only its in-category slice amount — never the
 * whole record amount, which would double-count against the donut.
 */
export function buildDonutCategoryRecords(
  expenses: Transaction[],
  categoryId: string,
  convert: (t: Transaction, amount?: number) => number,
): DonutRecordRow[] {
  const rows: DonutRecordRow[] = [];
  for (const t of expenses) {
    let amount = 0;
    let hit = false;
    for (const slice of getSplitAttribution(t)) {
      if (slice.categoryId !== categoryId) continue;
      amount += convert(t, slice.amount);
      hit = true;
    }
    if (hit) rows.push({ tx: t, amount });
  }
  rows.sort((a, b) => {
    const byDate = b.tx.date.localeCompare(a.tx.date);
    return byDate !== 0 ? byDate : a.tx.id.localeCompare(b.tx.id);
  });
  return rows;
}

/**
 * Record-row label for the expanded panel: item names first, then
 * the note — the same precedence as the Smart Calendar detail line
 * (formatCalendarDetailItems) — falling back to the record's
 * sub-category name so the row is never blank.
 */
export function donutRecordLabel(
  tx: Transaction,
  category: Category | undefined,
  lang: 'my' | 'en',
): string {
  const items = formatCalendarDetailItems(tx.items, lang);
  if (items) return items;
  const note = tx.note?.trim();
  if (note) return note;
  return resolveDonutSubName(category, tx.subCategoryId, lang);
}

export interface DonutLabelSliceInput {
  categoryId: string;
  /** Displayed (rounded) percentage — the same value the legend shows. */
  percentage: number;
  /** Exact share of the total, 0..1. */
  fraction: number;
  /** Exact accumulated share before this slice, 0..1. */
  startFraction: number;
}

export interface DonutLabelPlacement {
  categoryId: string;
  side: 'left' | 'right';
  /** Vertical center of the label, in percent of the donut wrapper height. */
  topPct: number;
}

/**
 * Callout-label placement for the slices that clear the threshold.
 * The mid-angle of each slice (start + half its share, clockwise
 * from 12 o'clock) decides the side — angles in (180, 360) sit on
 * the left, everything else on the right — and the vertical center
 * on the ring point at that angle. Labels on the same side are
 * pushed apart to at least DONUT_LABEL_MIN_GAP_PCT and clamped to
 * [7, 93] so none clips off the top or bottom of the wrapper. The
 * caller anchors labels at the wrapper's left/right edges at
 * topPct, so only the side + vertical position are computed here.
 */
export function buildDonutLabelPlacements(
  slices: DonutLabelSliceInput[],
): DonutLabelPlacement[] {
  const placed: DonutLabelPlacement[] = [];
  for (const s of slices) {
    if (s.percentage < DONUT_LABEL_MIN_PERCENT) continue;
    const midFraction = s.startFraction + s.fraction / 2;
    const angleDeg = midFraction * 360;
    const rad = (angleDeg * Math.PI) / 180;
    const topPct = 50 - 40 * Math.cos(rad);
    placed.push({
      categoryId: s.categoryId,
      side: angleDeg > 180 && angleDeg < 360 ? 'left' : 'right',
      topPct,
    });
  }
  for (const side of ['left', 'right'] as const) {
    const group = placed
      .filter((p) => p.side === side)
      .sort((a, b) => a.topPct - b.topPct);
    for (let i = 1; i < group.length; i++) {
      const min = group[i - 1].topPct + DONUT_LABEL_MIN_GAP_PCT;
      if (group[i].topPct < min) group[i].topPct = min;
    }
    const last = group[group.length - 1];
    if (last && last.topPct > 93) {
      const shift = last.topPct - 93;
      group.forEach((p) => {
        p.topPct -= shift;
      });
    }
    group.forEach((p) => {
      p.topPct = Math.min(93, Math.max(7, p.topPct));
    });
  }
  return placed;
}
