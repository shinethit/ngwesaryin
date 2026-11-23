// [v7.6.06] Expiry reminders — overdue + due-within-30-days
// license/insurance expiries and debt due dates, in Notifications
// with a bell-badge count. Pure helper tests (no Firestore, no
// component state) + wiring assertions (same pattern as
// smallFixBatch7605.test.ts — the components have no test renderer
// in this repo; layout behaviour is verified by renders).
//
// Investigation locked in here: VehicleMaintenance stores NO expiry
// field (derived date + expectedLifespanDays, local time, canonical
// sites AddMaintenanceModal deriveExpiryDate + the v7.6.05
// TransactionModal restore); there is NO insurance-only service
// type (license_renewal covers license/tax/insurance); every one of
// the 14 service types carries expectedLifespanDays, so a missing /
// non-positive lifespan is the only maintenance exclusion; fuel
// logs and tire-pressure logs are separate types with no lifespan
// and are never passed in. Debts use `dueDate` + `status`.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  EXPIRY_REMINDER_LEAD_DAYS,
  deriveMaintenanceExpiryDate,
  expiryReminderId,
  getExpiryReminders,
  type DebtExpiryInput,
  type MaintenanceExpiryInput,
} from '../expiryReminders';
import {
  VERSION_HISTORY,
  CURRENT_APP_VERSION,
  CURRENT_BUILD_NUMBER,
} from '../../data/versionHistory';

const HELPER_SRC = readFileSync(
  new URL('../expiryReminders.ts', import.meta.url),
  'utf8',
);
const MODAL_SRC = readFileSync(
  new URL('../../components/NotificationModal.tsx', import.meta.url),
  'utf8',
);
const APP_SRC = readFileSync(
  new URL('../../App.tsx', import.meta.url),
  'utf8',
);
const VERSION_JSON = JSON.parse(
  readFileSync(new URL('../../../public/version.json', import.meta.url), 'utf8'),
);

/** Fixed "today" so every band boundary is deterministic. */
const TODAY = '2026-11-23';

function maint(
  overrides: Partial<MaintenanceExpiryInput> & { id: string },
): MaintenanceExpiryInput {
  return {
    date: '2025-11-23',
    serviceType: 'license_renewal',
    title: '🪪 လိုင်စင် သက်တမ်းတိုး',
    expectedLifespanDays: 365,
    vehicleId: 'veh1',
    vehicleName: 'Starex',
    ...overrides,
  };
}

function debt(
  overrides: Partial<DebtExpiryInput> & { id: string },
): DebtExpiryInput {
  return {
    personName: 'Aung',
    type: 'payable',
    totalAmount: 100000,
    paidAmount: 0,
    status: 'active',
    dueDate: '2026-11-28',
    ...overrides,
  };
}

/** Maintenance record expiring exactly `daysOut` from TODAY. */
function expiringIn(daysOut: number, id = 'm1'): MaintenanceExpiryInput {
  // date + 365 lands on 2026-11-23 + daysOut.
  const expiry = new Date(2026, 10, 23 + daysOut);
  const date = new Date(expiry.getFullYear(), expiry.getMonth(), expiry.getDate() - 365);
  const pad = (n: number) => String(n).padStart(2, '0');
  const dateStr = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return maint({ id, date: dateStr, expectedLifespanDays: 365 });
}

describe('expiry bands (v7.6.06)', () => {
  it('overdue (past) vs expiring soon (1/7/30 days) vs beyond 30 days (excluded)', () => {
    const list = getExpiryReminders(
      [expiringIn(-5, 'm-over'), expiringIn(1, 'm-1'), expiringIn(7, 'm-7'), expiringIn(30, 'm-30'), expiringIn(31, 'm-31')],
      [debt({ id: 'd-40', dueDate: '2026-12-24' })],
      TODAY,
    );
    const ids = list.map((r) => r.recordId);
    expect(ids).toContain('m-over');
    expect(ids).toContain('m-1');
    expect(ids).toContain('m-7');
    expect(ids).toContain('m-30');
    expect(ids).not.toContain('m-31');
    expect(ids).not.toContain('d-40');
    expect(list.find((r) => r.recordId === 'm-over')?.band).toBe('overdue');
    expect(list.find((r) => r.recordId === 'm-over')?.daysUntilExpiry).toBe(-5);
    expect(list.find((r) => r.recordId === 'm-30')?.band).toBe('expiring_soon');
    expect(list.find((r) => r.recordId === 'm-30')?.daysUntilExpiry).toBe(30);
  });

  it('boundary: exactly 30 days in is included, 31 days out is excluded', () => {
    const list = getExpiryReminders(
      [expiringIn(30, 'm-30'), expiringIn(31, 'm-31')],
      [],
      TODAY,
    );
    expect(list.map((r) => r.recordId)).toEqual(['m-30']);
  });

  it('due TODAY counts as expiring soon, never overdue', () => {
    const list = getExpiryReminders(
      [expiringIn(0, 'm-today')],
      [debt({ id: 'd-today', dueDate: TODAY })],
      TODAY,
    );
    expect(list).toHaveLength(2);
    for (const r of list) {
      expect(r.band).toBe('expiring_soon');
      expect(r.daysUntilExpiry).toBe(0);
    }
  });

  it('sorting: overdue first (most overdue first), then soonest first; maintenance before debt on ties', () => {
    const list = getExpiryReminders(
      [
        expiringIn(20, 'm-20'),
        expiringIn(-3, 'm-neg3'),
        expiringIn(2, 'm-2'),
        expiringIn(-40, 'm-neg40'),
        expiringIn(0, 'm-0'),
      ],
      [debt({ id: 'd-0', dueDate: TODAY })],
      TODAY,
    );
    expect(list.map((r) => r.recordId)).toEqual([
      'm-neg40',
      'm-neg3',
      'm-0',
      'd-0',
      'm-2',
      'm-20',
    ]);
  });

  it('the 30-day lead time is ONE named constant', () => {
    expect(EXPIRY_REMINDER_LEAD_DAYS).toBe(30);
    expect(HELPER_SRC).toContain('export const EXPIRY_REMINDER_LEAD_DAYS = 30;');
    expect(HELPER_SRC.match(/export const EXPIRY_REMINDER_LEAD_DAYS/g)).toHaveLength(1);
    expect(HELPER_SRC).toContain('daysUntilExpiry > EXPIRY_REMINDER_LEAD_DAYS');
  });
});

describe('maintenance derivation matches the v7.6.05 local-time rule (v7.6.06)', () => {
  it('date + days in local time, across month/year/leap boundaries', () => {
    expect(deriveMaintenanceExpiryDate('2026-01-15', 365)).toBe('2027-01-15');
    expect(deriveMaintenanceExpiryDate('2026-11-22', 30)).toBe('2026-12-22');
    expect(deriveMaintenanceExpiryDate('2026-02-27', 2)).toBe('2026-03-01');
    expect(deriveMaintenanceExpiryDate('2026-12-31', 1)).toBe('2027-01-01');
    expect(deriveMaintenanceExpiryDate('2024-02-28', 1)).toBe('2024-02-29');
    expect(deriveMaintenanceExpiryDate('2026-01-31', 30)).toBe('2026-03-02');
  });

  it('timezone edge: DST-transition dates and a Date-object today use local midnights, never a UTC parse', () => {
    // 2026-03-08 is a DST-transition date in observing zones; the
    // local-midnight derivation must still land on the next day.
    expect(deriveMaintenanceExpiryDate('2026-03-08', 1)).toBe('2026-03-09');
    expect(deriveMaintenanceExpiryDate('2026-11-01', 1)).toBe('2026-11-02');
    // The helper never parses the date string with `new Date(str)`
    // (UTC midnight, a day-shift either side of 06:30 MMT) — it
    // splits YYYY-MM-DD and builds a local date.
    expect(HELPER_SRC).not.toContain('new Date(date');
    expect(HELPER_SRC).not.toContain("new Date(record.date");
    expect(HELPER_SRC).not.toContain("new Date(debt.dueDate");
    // A Date today at local midnight agrees with the string today.
    const asDate = getExpiryReminders([expiringIn(5, 'm-5')], [], new Date(2026, 10, 23));
    const asString = getExpiryReminders([expiringIn(5, 'm-5')], [], TODAY);
    expect(asDate).toEqual(asString);
  });

  it('records without a usable lifespan are skipped silently', () => {
    const list = getExpiryReminders(
      [
        maint({ id: 'm-nolife' }),
        maint({ id: 'm-undef', expectedLifespanDays: undefined }),
        maint({ id: 'm-zero', expectedLifespanDays: 0 }),
        maint({ id: 'm-neg', expectedLifespanDays: -10 }),
        maint({ id: 'm-nan', expectedLifespanDays: Number.NaN }),
        maint({ id: 'm-inf', expectedLifespanDays: Number.POSITIVE_INFINITY }),
      ],
      [],
      TODAY,
    );
    // 'm-nolife' uses the factory default 365 days: its expiry is
    // 2026-11-23, i.e. due today — it DOES appear. The rest skip.
    expect(list.map((r) => r.recordId)).toEqual(['m-nolife']);
    expect(deriveMaintenanceExpiryDate('2026-01-15', 0)).toBe('');
    expect(deriveMaintenanceExpiryDate('2026-01-15', undefined)).toBe('');
    expect(deriveMaintenanceExpiryDate('not-a-date', 365)).toBe('');
    expect(deriveMaintenanceExpiryDate('2026-02-30', 365)).toBe('');
  });

  it('fuel / tire-pressure records can never produce reminders', () => {
    // A tire-pressure-shaped record (nextCheckDate, no lifespan)
    // carries nothing the helper reads, so it is skipped.
    const tireShaped = {
      id: 'tire1',
      date: '2026-11-01',
      nextCheckDate: '2026-11-20',
    } as unknown as MaintenanceExpiryInput;
    // A fuel-shaped record has no date/lifespan fields at all.
    const fuelShaped = { id: 'fuel1' } as unknown as MaintenanceExpiryInput;
    expect(getExpiryReminders([tireShaped, fuelShaped], [], TODAY)).toEqual([]);
    // Structural: the helper never mentions the other log types.
    expect(HELPER_SRC).not.toContain('FuelLog');
    expect(HELPER_SRC).not.toContain('TirePressureLog');
    expect(HELPER_SRC).not.toContain('nextCheckDate');
    expect(HELPER_SRC).not.toContain('fuel');
    // Wiring: only maintenance + debts are ever passed in.
    expect(MODAL_SRC).toContain('getExpiryReminders(maintenanceLogs, debts, todayStr)');
    expect(APP_SRC.match(/getExpiryReminders\(vehicleMaintenance, debts, todayStr\)/g)).toHaveLength(2);
    expect(APP_SRC).not.toContain('getExpiryReminders(tirePressureLogs');
    expect(APP_SRC).not.toContain('getExpiryReminders(fuelLogs');
  });
});

describe('debt due dates (v7.6.06)', () => {
  it('closed / settled debts never appear', () => {
    const list = getExpiryReminders(
      [],
      [debt({ id: 'd-settled', status: 'settled', dueDate: '2026-11-20' })],
      TODAY,
    );
    expect(list).toEqual([]);
  });

  it('fully-repaid debts never appear, even when still marked active', () => {
    const list = getExpiryReminders(
      [],
      [
        debt({ id: 'd-repaid', paidAmount: 100000, dueDate: '2026-11-20' }),
        debt({ id: 'd-overpaid', paidAmount: 120000, dueDate: '2026-11-20' }),
      ],
      TODAY,
    );
    expect(list).toEqual([]);
  });

  it('debts without a due date, or with an invalid one, are excluded', () => {
    const list = getExpiryReminders(
      [],
      [
        debt({ id: 'd-nodate', dueDate: undefined }),
        debt({ id: 'd-bad', dueDate: 'not-a-date' }),
        debt({ id: 'd-impossible', dueDate: '2026-02-30' }),
      ],
      TODAY,
    );
    expect(list).toEqual([]);
  });

  it('active debts with a balance inside the window appear, with the remaining amount', () => {
    const list = getExpiryReminders(
      [],
      [
        debt({ id: 'd-soon', dueDate: '2026-11-28', paidAmount: 40000 }),
        debt({ id: 'd-over', dueDate: '2026-11-18', paidAmount: 0 }),
        debt({ id: 'd-far', dueDate: '2027-01-15', paidAmount: 0 }),
      ],
      TODAY,
    );
    expect(list.map((r) => r.recordId)).toEqual(['d-over', 'd-soon']);
    expect(list.find((r) => r.recordId === 'd-soon')?.remainingAmount).toBe(60000);
    expect(list.find((r) => r.recordId === 'd-soon')?.expiryDate).toBe('2026-11-28');
    expect(list.find((r) => r.recordId === 'd-over')?.band).toBe('overdue');
  });

  it('invalid today / empty inputs produce no reminders', () => {
    expect(getExpiryReminders([expiringIn(1, 'm-1')], [], 'not-a-date')).toEqual([]);
    expect(getExpiryReminders([], [], TODAY)).toEqual([]);
    expect(getExpiryReminders([maint({ id: 'm-bad', date: 'garbage' })], [], TODAY)).toEqual([]);
  });

  it('reminder ids are stable, distinct per kind/record/date, and shared by badge and modal', () => {
    expect(expiryReminderId('maintenance', 'm1', '2026-12-23')).toBe(
      'notif_expiry_maintenance_m1_2026-12-23',
    );
    expect(expiryReminderId('debt', 'm1', '2026-12-23')).toBe(
      'notif_expiry_debt_m1_2026-12-23',
    );
    const list = getExpiryReminders(
      [expiringIn(5, 'same')],
      [debt({ id: 'same', dueDate: '2026-11-28' })],
      TODAY,
    );
    expect(new Set(list.map((r) => r.id)).size).toBe(list.length);
    // The modal renders the helper's own ids (same ids App counts).
    expect(MODAL_SRC).toContain('id: r.id,');
  });
});

describe('expiry section wiring — modal + bell badge (v7.6.06)', () => {
  it('the helper is pure: no Firestore, no storage, no Premium gate', () => {
    expect(HELPER_SRC).not.toContain('firestore');
    expect(HELPER_SRC).not.toContain('firebase');
    expect(HELPER_SRC).not.toContain('localStorage');
    expect(HELPER_SRC).not.toContain('premium');
    expect(HELPER_SRC).not.toContain('Premium');
  });

  it('NotificationModal gains the grouped section and Expiry tab, nothing else moves', () => {
    expect(MODAL_SRC).toContain("type: 'debt' | 'budget' | 'vehicle' | 'recurring' | 'system' | 'shop' | 'expiry'");
    expect(MODAL_SRC).toContain("setFilterTab('expiry')");
    expect(MODAL_SRC).toContain('renderExpiryRow');
    expect(MODAL_SRC).toContain('သက်တမ်းလွန်ပြီး');
    expect(MODAL_SRC).toContain('မကြာမီ ကုန်ဆုံးမည်');
    expect(MODAL_SRC).toContain('Expiry & Due-Date Reminders');
    expect(MODAL_SRC).toContain('hasExpiryNotifications');
    expect(MODAL_SRC).toContain('expiryOverdueItems');
    expect(MODAL_SRC).toContain('expirySoonItems');
    // Read-only v1: no snooze anywhere in the modal.
    expect(MODAL_SRC.toLowerCase()).not.toContain('snooze');
    // The existing sections are untouched: shop + tire + maintenance
    // alert wiring still present, badge behaviour for shop reminders
    // unchanged.
    expect(MODAL_SRC).toContain('getMaintenanceAlerts');
    expect(MODAL_SRC).toContain('useShopDetailReminders');
    expect(MODAL_SRC).toContain('notif_tire_');
  });

  it('App counts expiry reminders in the bell badge and clears them on mark-all-read, via the same helper', () => {
    // Exactly two call sites: mark-all-read + badge count.
    expect(APP_SRC.match(/getExpiryReminders\(vehicleMaintenance, debts, todayStr\)/g)).toHaveLength(2);
    expect(APP_SRC).toContain('if (!readNotificationIds.includes(r.id)) count++;');
    // The existing counting mechanism is extended, not replaced:
    // shop reminders still count through the same badge.
    expect(APP_SRC).toContain('shopDetailReminders.forEach');
    expect(APP_SRC).toContain('getMaintenanceAlerts(vehicle, vLogs, lang)');
  });
});

describe('version pins rolled forward to v7.6.20 (build 334)', () => {
  it('versionHistory + version.json agree, releasedAt present-only', () => {
    expect(CURRENT_APP_VERSION).toBe('v7.6.20');
    expect(CURRENT_BUILD_NUMBER).toBe(334);
    expect(VERSION_JSON.version).toBe('v7.6.20');
    expect(VERSION_JSON.buildNumber).toBe(334);
    expect(typeof VERSION_JSON.releasedAt).toBe('string');
    expect(VERSION_JSON.releasedAt.length).toBeGreaterThan(0);
  });

  it('the top history entry carries the neutral-open entry, no Admin strings', () => {
    const top = VERSION_HISTORY[0];
    expect(top.version).toBe('v7.6.20');
    expect(top.buildNumber).toBe(334);
    expect(top.releaseDate).toBe('2026-11-23');
    expect(top.tag).toBe('fix');
    expect(top.titleMy).toBe('Smart Calendar အသေးစိတ် ပြခြင်း');
    expect(top.titleEn).toBe('Smart Calendar detail view');
    expect(top.changesMy).toEqual([
      'Smart Calendar မှာ ရက်တစ်ရက်ရဲ့ စာရင်းအသေးစိတ်မှာ အရေအတွက်၊ နှုန်း၊ ဆိုင်တို့ကို စာရင်းထဲကအတိုင်း ပြမည်',
    ]);
    expect(top.changesEn).toEqual([
      'The Smart Calendar day detail now shows quantity, rate and shop, matching the Records list.',
    ]);
    expect(JSON.stringify(top)).not.toContain('Admin');
    expect(VERSION_JSON.changesMy).toEqual(top.changesMy);
    expect(VERSION_JSON.changesEn).toEqual(top.changesEn);
  });

  it('the fix-script guard is raw string equality: accepts exactly 7.6.08/7.6.08, rejects the mangled form', () => {
    const FROM_VERSION = '7.6.08';
    const TO_VERSION = '7.6.08';
    const guardFails = (pkgVersion: string): boolean =>
      pkgVersion !== FROM_VERSION && pkgVersion !== TO_VERSION;
    const mangled = TO_VERSION.split('.').map(Number).join('.');
    expect(mangled).not.toBe(TO_VERSION);
    expect(TO_VERSION).toBe('7.6.08');
    expect(guardFails('7.6.08')).toBe(false);
    expect(guardFails('7.6.08')).toBe(false);
    expect(guardFails(mangled)).toBe(true);
    expect(guardFails('')).toBe(true);
  });
});
