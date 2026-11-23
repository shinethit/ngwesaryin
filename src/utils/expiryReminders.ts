// [v7.6.06] Expiry reminders — license/insurance expiries + debt due
// dates, warned about BEFORE they pass. Pure helper: no stored
// state, no component state, no plan gate — it computes from local
// data, so guests and signed-in users see the same reminders.
//
// DATA SOURCES (investigated, not assumed):
// - Maintenance expiry: VehicleMaintenance stores NO expiry field.
//   The expiry is DERIVED from `date + expectedLifespanDays` in LOCAL
//   time. The derivation below duplicates the 3-line rule whose
//   canonical sites are AddMaintenanceModal.tsx `deriveExpiryDate`
//   and the v7.6.05 linked-maintenance restore in TransactionModal
//   (`getLocalDateString(editTransaction.date)` + days). Do NOT
//   refactor those sites in this version; this duplicate is named
//   here so the three stay in step.
// - Which service types: there is NO insurance-only service type —
//   `license_renewal` covers license / tax / insurance (the
//   `sub_veh_license` sub-category is "လိုင်စင် / အခွန်နှင့် အာမခံ").
//   EVERY one of the 14 SERVICE_TYPE_CONFIG types carries an
//   expectedLifespanDays (the forms always store one; the config
//   carries a default for each), so "a meaningful lifespan" is the
//   stored value itself: a record with no / non-positive /
//   non-finite lifespan is skipped silently. Fuel logs and
//   tire-pressure logs are separate record types with no lifespan
//   field — they are never passed in here and can never produce a
//   reminder (tire checks already have their own check-date
//   notifications elsewhere).
// - Debts: the due-date field is `dueDate` (types.ts Debt; there is
//   no repaymentDate). Only `status === 'active'` debts with a set
//   due date and a positive remaining balance appear — `settled`
//   (closed) debts and fully-repaid debts (remaining <= 0) never do.
//
// BANDS: OVERDUE (expiry/due date already past; red) and EXPIRING
// SOON (within the next EXPIRY_REMINDER_LEAD_DAYS days, inclusive;
// amber). Due TODAY counts as expiring soon, never overdue. Items
// beyond the lead window do not appear. Sort: overdue first (most
// overdue first), then expiring soon (soonest first).

import type { DebtType, VehicleServiceType } from '../types';
import { getLocalDateString } from './dateUtils';

/** The ONE lead-time constant — never hardcoded anywhere else. */
export const EXPIRY_REMINDER_LEAD_DAYS = 30;

export type ExpiryReminderBand = 'overdue' | 'expiring_soon';
export type ExpiryReminderKind = 'maintenance' | 'debt';

/** Minimal structural shape a maintenance record needs here — the
 *  real VehicleMaintenance type satisfies it (extra fields ignored). */
export interface MaintenanceExpiryInput {
  id: string;
  vehicleId?: string;
  vehicleName?: string;
  date: string;
  serviceType?: VehicleServiceType;
  title?: string;
  expectedLifespanDays?: number;
}

/** Minimal structural shape a debt needs here — the real Debt type
 *  satisfies it (extra fields ignored). */
export interface DebtExpiryInput {
  id: string;
  type?: DebtType;
  personName: string;
  totalAmount: number;
  paidAmount: number;
  dueDate?: string;
  status?: string;
}

export interface ExpiryReminder {
  /** Stable notification id, shared by the bell badge (App) and the
   *  NotificationModal so "mark as read" agrees in both places. */
  id: string;
  kind: ExpiryReminderKind;
  band: ExpiryReminderBand;
  /** Expiry / due date, YYYY-MM-DD (local). */
  expiryDate: string;
  /** Days from today to the expiry date: negative = days overdue,
   *  0 = due today, positive = days remaining. */
  daysUntilExpiry: number;
  recordId: string;
  vehicleId?: string;
  vehicleName?: string;
  serviceType?: VehicleServiceType;
  title?: string;
  personName?: string;
  debtType?: DebtType;
  remainingAmount?: number;
}

/** Notification-centre id for a reminder — shared with App's bell
 *  badge so "mark as read" and the badge agree. */
export function expiryReminderId(
  kind: ExpiryReminderKind,
  recordId: string,
  expiryDate: string,
): string {
  return `notif_expiry_${kind}_${recordId}_${expiryDate}`;
}

/** Strict YYYY-MM-DD parse in LOCAL time. Rejects malformed strings
 *  AND impossible calendar dates (2026-02-30) via a round-trip
 *  check. Never uses `new Date('YYYY-MM-DD')` — that parses as UTC
 *  midnight and shifts a day either side of 06:30 MMT. */
function parseLocalDate(value: string): Date | null {
  if (typeof value !== 'string') return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
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

/**
 * Derive a maintenance record's expiry date: `date +
 * expectedLifespanDays`, in LOCAL time. This duplicates the rule
 * whose canonical site is AddMaintenanceModal.tsx `deriveExpiryDate`
 * (mirrored by the v7.6.05 TransactionModal restore) — `new
 * Date(y, m - 1, d + days)` with local getters, never a UTC parse.
 * Returns '' when the date is invalid or the lifespan is missing /
 * non-positive / non-finite.
 */
export function deriveMaintenanceExpiryDate(
  date: string,
  expectedLifespanDays: number | string | undefined,
): string {
  const base = parseLocalDate(date);
  const days = Number(expectedLifespanDays);
  if (!base || !Number.isFinite(days) || days <= 0) return '';
  const expiry = new Date(
    base.getFullYear(),
    base.getMonth(),
    base.getDate() + days,
  );
  return formatLocalDate(expiry);
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

/**
 * Grouped, sorted expiry reminders for the given records as of
 * `today` (a local YYYY-MM-DD string, or a Date). Records beyond
 * the lead window, records with no usable expiry/due date, and
 * closed / fully-repaid debts are excluded. Pure: reads nothing,
 * writes nothing, and never mutates its inputs.
 */
export function getExpiryReminders(
  maintenanceRecords: readonly MaintenanceExpiryInput[],
  debts: readonly DebtExpiryInput[],
  today: string | Date,
): ExpiryReminder[] {
  const todayDate = normalizeToday(today);
  if (!todayDate) return [];

  const out: ExpiryReminder[] = [];

  for (const record of maintenanceRecords || []) {
    if (!record || typeof record.id !== 'string' || !record.id) continue;
    const expiryDate = deriveMaintenanceExpiryDate(
      record.date,
      record.expectedLifespanDays,
    );
    if (!expiryDate) continue;
    const expiry = parseLocalDate(expiryDate);
    if (!expiry) continue;
    const daysUntilExpiry = daysBetween(todayDate, expiry);
    if (daysUntilExpiry > EXPIRY_REMINDER_LEAD_DAYS) continue;
    out.push({
      id: expiryReminderId('maintenance', record.id, expiryDate),
      kind: 'maintenance',
      band: daysUntilExpiry < 0 ? 'overdue' : 'expiring_soon',
      expiryDate,
      daysUntilExpiry,
      recordId: record.id,
      vehicleId: record.vehicleId,
      vehicleName: record.vehicleName,
      serviceType: record.serviceType,
      title: record.title,
    });
  }

  for (const debt of debts || []) {
    if (!debt || typeof debt.id !== 'string' || !debt.id) continue;
    // Closed (settled) debts never appear; nor do fully-repaid
    // ones (remaining <= 0) even if still marked active.
    if (debt.status !== 'active') continue;
    if (!debt.dueDate) continue;
    const due = parseLocalDate(debt.dueDate);
    if (!due) continue;
    const remaining = Number(debt.totalAmount) - Number(debt.paidAmount);
    if (!Number.isFinite(remaining) || remaining <= 0) continue;
    const daysUntilExpiry = daysBetween(todayDate, due);
    if (daysUntilExpiry > EXPIRY_REMINDER_LEAD_DAYS) continue;
    const dueDate = formatLocalDate(due);
    out.push({
      id: expiryReminderId('debt', debt.id, dueDate),
      kind: 'debt',
      band: daysUntilExpiry < 0 ? 'overdue' : 'expiring_soon',
      expiryDate: dueDate,
      daysUntilExpiry,
      recordId: debt.id,
      personName: debt.personName,
      debtType: debt.type,
      remainingAmount: remaining,
    });
  }

  // Overdue first (most overdue first), then expiring soon (soonest
  // first); ties break deterministically: maintenance before debt,
  // then record id.
  out.sort((a, b) => {
    if (a.band !== b.band) return a.band === 'overdue' ? -1 : 1;
    if (a.daysUntilExpiry !== b.daysUntilExpiry) {
      return a.daysUntilExpiry - b.daysUntilExpiry;
    }
    if (a.kind !== b.kind) return a.kind === 'maintenance' ? -1 : 1;
    if (a.recordId !== b.recordId) return a.recordId < b.recordId ? -1 : 1;
    return 0;
  });
  return out;
}
