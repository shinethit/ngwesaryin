// [v7.6.45] Statement-period bounds for the Reports "PDF
// စာရင်းရှင်းတမ်း" print view (AnalyticsView). Pure date math so the
// presets are unit-testable: the component memo is a thin wrapper
// over this function.
//
// Conventions (matching the rest of the app):
// - Week starts on Sunday, like the calendar grid
//   (SmartCalendarCard: getDay() 0 = Sunday, no offset).
// - Quarter is the calendar quarter (Jan–Mar, Apr–Jun, …).
// - Bounds may run into the future (like the month bounds) — no
//   record is dated in the future, so the result is unchanged.
// - 'all' is unbounded (null/null); 'custom' uses the caller's dates.
import { getLocalDateString } from './dateUtils';

export type StatementPeriodId =
  | 'thisMonth'
  | 'lastMonth'
  | 'day'
  | 'week'
  | 'quarter'
  | 'year'
  | 'all'
  | 'custom';

export interface StatementBounds {
  start: string | null;
  end: string | null;
}

export function statementPeriodBounds(
  period: StatementPeriodId,
  now: Date,
  custom: { start: string; end: string },
): StatementBounds {
  const monthBounds = (d: Date): StatementBounds => ({
    start: getLocalDateString(new Date(d.getFullYear(), d.getMonth(), 1)),
    end: getLocalDateString(new Date(d.getFullYear(), d.getMonth() + 1, 0)),
  });
  if (period === 'all') return { start: null, end: null };
  if (period === 'lastMonth') {
    return monthBounds(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  }
  if (period === 'custom') return { start: custom.start, end: custom.end };
  if (period === 'day') {
    const today = getLocalDateString(now);
    return { start: today, end: today };
  }
  if (period === 'week') {
    const start = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - now.getDay(),
    );
    return {
      start: getLocalDateString(start),
      end: getLocalDateString(
        new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6),
      ),
    };
  }
  if (period === 'quarter') {
    const qStartMonth = Math.floor(now.getMonth() / 3) * 3;
    return {
      start: getLocalDateString(new Date(now.getFullYear(), qStartMonth, 1)),
      end: getLocalDateString(new Date(now.getFullYear(), qStartMonth + 3, 0)),
    };
  }
  if (period === 'year') {
    return {
      start: getLocalDateString(new Date(now.getFullYear(), 0, 1)),
      end: getLocalDateString(new Date(now.getFullYear(), 11, 31)),
    };
  }
  return monthBounds(now);
}
