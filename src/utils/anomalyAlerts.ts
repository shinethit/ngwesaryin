// [v7.6.08] Anomaly alerts — warn when this week's spending in a
// category is above usual. Pure helper: no stored state, no
// Firestore, no storage, no plan gate — it computes from local
// data at render time, so guests see the same alerts as signed-in
// users. The NotificationModal renders the alerts and App counts
// them on the bell badge through the SAME helper and ids, so the
// modal and the badge always agree (the v7.6.06 expiry pattern).
//
// WINDOWS (local time, whole days): the CURRENT window is the last
// 7 days ending today (today and the 6 days before it). The
// BASELINE is the 28 days before that, split into 4 weekly buckets
// (days 8-14, 15-21, 22-28 and 29-35 before today); a week with no
// spend counts as 0, so the baseline average is the 28-day total
// divided by 4, never divided by the number of weeks with spend.
// Day 7 before today belongs to NEITHER window (the gap between
// the two), by design: it is neither "this week" nor baseline.
//
// THRESHOLD (ONE place — the constants below, never hardcoded
// anywhere else): a category alerts when its current-week spend is
// at least ANOMALY_MULTIPLIER times its baseline weekly average
// AND at least ANOMALY_MIN_WEEK_SPEND. A baseline needs at least
// ANOMALY_MIN_BASELINE_WEEKS_WITH_SPEND of the 4 weeks to carry
// any spend; with fewer, no 2x comparison is made — EXCEPT the
// baseline-zero case: zero spend in all 4 baseline weeks but
// current-week spend at or above the floor DOES alert, with honest
// "new/unusual" wording and no multiplier (there is nothing to
// multiply). Only EXPENSE transactions count; transfers and income
// are excluded. Split-aware: attribution goes through the v7.6.07
// `getSplitAttribution` helper, so each split slice counts under
// its own category — never `tx.category` alone.
//
// AMOUNTS: the helper returns amounts in the units the caller
// converts to. By default (no converter) stored amounts pass
// through unchanged — in this app those are kyat for MMK wallets.
// Callers with multi-currency wallets pass the same per-wallet
// MMK converter they already use for every other notification
// total (NotificationModal / App badge), so returned amounts are
// MMK and the floor compares like with like. The modal renders
// amounts with formatLakhs, which respects the v7.5.99
// lakh/kyat display option; the helper itself returns raw numbers
// and never formats. NO percentages, NO scores, NO probability
// language anywhere in this feature.

import type { Transaction } from '../types';
import { getLocalDateString } from './dateUtils';
import { getSplitAttribution } from './transactionSplits';
import { isTransferTransaction } from './walletBalance';

/** The ONE multiplier — never hardcoded anywhere else. */
export const ANOMALY_MULTIPLIER = 2;
/** The ONE weekly-spend floor, in the caller's (MMK) units. */
export const ANOMALY_MIN_WEEK_SPEND = 10000;
/** The ONE baseline length, in weeks. */
export const ANOMALY_BASELINE_WEEKS = 4;
/** Baseline weeks that must carry any spend before a 2x
 *  comparison is made (the baseline-zero exception is separate). */
export const ANOMALY_MIN_BASELINE_WEEKS_WITH_SPEND = 2;

export type AnomalyAlertKind = 'multiple' | 'baseline_zero';

export interface AnomalyAlert {
  /** Stable notification id, shared by the bell badge (App) and the
   *  NotificationModal so "mark as read" agrees in both places. It
   *  carries the current-week start date, so a read mark expires
   *  when the week rolls — unlike a bare per-category id, which
   *  would stay read forever. */
  id: string;
  categoryId: string;
  kind: AnomalyAlertKind;
  /** Current-window (last 7 days) spend, in the caller's units. */
  currentWeekSpend: number;
  /** Baseline weekly average (28-day total / 4); 0 for
   *  baseline-zero alerts. */
  baselineWeeklyAverage: number;
  /** How many of the 4 baseline weeks carried any spend. */
  baselineWeeksWithSpend: number;
  /** current / baseline, rounded to 1 decimal, for 'multiple'
   *  alerts; null for baseline-zero alerts (no multiplier exists). */
  multiple: number | null;
  /** First date (YYYY-MM-DD, local) of the current 7-day window. */
  weekStart: string;
}

/** Notification-centre id for an alert — shared with App's bell
 *  badge so "mark as read" and the badge agree. */
export function anomalyAlertId(categoryId: string, weekStart: string): string {
  return `notif_anomaly_${categoryId}_${weekStart}`;
}

/** Strict YYYY-MM-DD parse in LOCAL time. Rejects malformed strings
 *  AND impossible calendar dates (2026-02-30) via a round-trip
 *  check. Never uses `new Date('YYYY-MM-DD')` — that parses as UTC
 *  midnight and shifts a day either side of 06:30 MMT. Datetime
 *  strings (ISO with a 'T') are reduced through the app's
 *  getLocalDateString first; anything else unparseable is null. */
function parseLocalDate(value: string): Date | null {
  if (typeof value !== 'string') return null;
  let candidate = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(candidate)) {
    if (!candidate.includes('T')) return null;
    candidate = getLocalDateString(candidate);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(candidate)) return null;
  }
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(candidate);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const date = new Date(y, mo - 1, d);
  if (
    date.getFullYear() !== y ||
    date.getMonth() !== mo - 1 ||
    date.getDate() !== d
  ) {
    return null;
  }
  return date;
}

function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Whole days from `from` to `to`, both local-midnight dates.
 *  Math.round (not ceil/floor): a DST-shortened/long day between two
 *  local midnights is 23/25 hours, which must still count as 1 day. */
function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 86400000);
}

function normalizeToday(today: string | Date): Date | null {
  if (today instanceof Date) {
    if (Number.isNaN(today.getTime())) return null;
    return parseLocalDate(getLocalDateString(today));
  }
  return parseLocalDate(today);
}

/** Optional per-slice converter: (record, slice amount) -> amount
 *  in the units the floor and the display use (MMK for the modal /
 *  badge, which pass their existing wallet converters). Defaults
 *  to the identity — stored amounts pass through unchanged. */
export type AnomalyAmountConverter = (
  tx: Transaction,
  amount: number,
) => number;

/**
 * Anomaly alerts for the given transactions as of `today` (a local
 * YYYY-MM-DD string, or a Date). Sorted: 'multiple' alerts first,
 * highest multiple first (ties: larger current spend first, then
 * category id); baseline-zero alerts after them (larger current
 * spend first, then category id). Pure: reads nothing, writes
 * nothing, and never mutates its inputs.
 */
export function getAnomalyAlerts(
  transactions: readonly Transaction[],
  today: string | Date,
  convert?: AnomalyAmountConverter,
): AnomalyAlert[] {
  const todayDate = normalizeToday(today);
  if (!todayDate) return [];
  const toAmount = convert ?? ((_tx: Transaction, amount: number) => amount);

  // Per category: current-week total + one total per baseline week.
  const currentByCategory = new Map<string, number>();
  const baselineByCategory = new Map<string, number[]>();

  for (const tx of transactions || []) {
    if (!tx || tx.type !== 'expense') continue;
    if (isTransferTransaction(tx)) continue;
    const txDate = parseLocalDate(tx.date);
    if (!txDate) continue;
    // daysAgo: 0 = today, 6 = 6 days ago (current window);
    // 8-35 = baseline weeks 0-3; 7 = the gap day (neither).
    const daysAgo = daysBetween(txDate, todayDate);
    let bucket = -1;
    if (daysAgo >= 0 && daysAgo <= 6) {
      bucket = -2; // current window
    } else if (daysAgo >= 8 && daysAgo <= 8 + ANOMALY_BASELINE_WEEKS * 7 - 1) {
      bucket = Math.floor((daysAgo - 8) / 7);
    } else {
      continue;
    }
    for (const slice of getSplitAttribution(tx)) {
      const amount = toAmount(tx, slice.amount);
      if (!Number.isFinite(amount) || amount === 0) continue;
      if (bucket === -2) {
        currentByCategory.set(
          slice.categoryId,
          (currentByCategory.get(slice.categoryId) || 0) + amount,
        );
      } else {
        let weeks = baselineByCategory.get(slice.categoryId);
        if (!weeks) {
          weeks = new Array(ANOMALY_BASELINE_WEEKS).fill(0);
          baselineByCategory.set(slice.categoryId, weeks);
        }
        weeks[bucket] += amount;
      }
    }
  }

  const weekStart = formatLocalDate(
    new Date(
      todayDate.getFullYear(),
      todayDate.getMonth(),
      todayDate.getDate() - 6,
    ),
  );

  const out: AnomalyAlert[] = [];
  for (const [categoryId, current] of currentByCategory) {
    if (current < ANOMALY_MIN_WEEK_SPEND) continue;
    const weeks = baselineByCategory.get(categoryId) || [];
    const baselineTotal = weeks.reduce((sum, w) => sum + w, 0);
    const weeksWithSpend = weeks.filter((w) => w > 0).length;
    if (baselineTotal === 0 && weeksWithSpend === 0) {
      // Baseline-zero: no spend at all in the prior 4 weeks.
      out.push({
        id: anomalyAlertId(categoryId, weekStart),
        categoryId,
        kind: 'baseline_zero',
        currentWeekSpend: current,
        baselineWeeklyAverage: 0,
        baselineWeeksWithSpend: 0,
        multiple: null,
        weekStart,
      });
      continue;
    }
    // A non-positive baseline total with spend in some week can
    // only come from corrupt (negative) slice amounts: no honest
    // average exists, so no comparison is made.
    if (baselineTotal <= 0) continue;
    if (weeksWithSpend < ANOMALY_MIN_BASELINE_WEEKS_WITH_SPEND) continue;
    const baselineWeeklyAverage = baselineTotal / ANOMALY_BASELINE_WEEKS;
    // Integer-safe multiplier check, in named constants only:
    // current >= MULTIPLIER * (total / WEEKS)  <=>  current * WEEKS
    // >= MULTIPLIER * total. No float-division edge at exactly 2.0x,
    // and no literal 2 anywhere in the comparison.
    if (current * ANOMALY_BASELINE_WEEKS < ANOMALY_MULTIPLIER * baselineTotal) continue;
    out.push({
      id: anomalyAlertId(categoryId, weekStart),
      categoryId,
      kind: 'multiple',
      currentWeekSpend: current,
      baselineWeeklyAverage,
      baselineWeeksWithSpend: weeksWithSpend,
      multiple: Math.round((current / baselineWeeklyAverage) * 10) / 10,
      weekStart,
    });
  }

  // Highest multiple first; baseline-zero alerts after every 2x
  // alert. Ties break deterministically: larger current spend,
  // then category id.
  out.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'multiple' ? -1 : 1;
    if (a.kind === 'multiple' && b.kind === 'multiple') {
      if ((a.multiple ?? 0) !== (b.multiple ?? 0)) {
        return (b.multiple ?? 0) - (a.multiple ?? 0);
      }
    }
    if (a.currentWeekSpend !== b.currentWeekSpend) {
      return b.currentWeekSpend - a.currentWeekSpend;
    }
    if (a.categoryId !== b.categoryId) return a.categoryId < b.categoryId ? -1 : 1;
    return 0;
  });
  return out;
}
