// [v7.6.44] Part H — four more maintenance service types, following
// the Part G (fan_belt) pattern exactly: union + SERVICE_TYPE_CONFIG
// + the one hardcoded status list; everything else derives.
// Wiper blades is TIME-ONLY (0 km, like license_renewal): the status
// computation and the remaining display must judge it by days alone
// (no divide-by-zero, no bogus "0 km overdue").
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  SERVICE_TYPE_CONFIG,
  calculateServiceHealthStatuses,
  getMaintenanceAlerts,
} from '../vehicleAnalytics';
import { ROW_SERVICE_TYPES } from '../vehicleServiceRows';
import { getExpiryReminders } from '../expiryReminders';
import type { Vehicle, VehicleMaintenance } from '../../types';

const SRC = (rel: string) => readFileSync(new URL(rel, import.meta.url), 'utf8');

const EXPECTED = {
  timing_belt: { labelMy: 'တိုင်မင်ကြိုး (Timing Belt)', labelEn: 'Timing Belt', km: 90000, days: 1825 },
  fuel_filter: { labelMy: 'ဆီစစ် (Fuel Filter)', labelEn: 'Fuel Filter', km: 30000, days: 720 },
  brake_fluid: { labelMy: 'ဘရိတ်ဆီ (Brake Fluid)', labelEn: 'Brake Fluid', km: 40000, days: 720 },
  wiper_blades: { labelMy: 'ဝိုင်ပါ (Wiper Blades)', labelEn: 'Wiper Blades', km: 0, days: 365 },
} as const;

describe('four new service types: config (v7.6.44 Part H)', () => {
  it.each(Object.entries(EXPECTED))(
    '%s carries the approved defaults and labels',
    (type, exp) => {
      const c = SERVICE_TYPE_CONFIG[type as keyof typeof SERVICE_TYPE_CONFIG];
      expect(c.labelMy).toBe(exp.labelMy);
      expect(c.labelEn).toBe(exp.labelEn);
      expect(c.defaultLifespanKm).toBe(exp.km);
      expect(c.defaultLifespanDays).toBe(exp.days);
    },
  );

  it('timing_belt is distinct from fan_belt, fuel_filter from oil_filter, brake_fluid from brake_pads', () => {
    expect(SERVICE_TYPE_CONFIG.timing_belt).not.toEqual(SERVICE_TYPE_CONFIG.fan_belt);
    expect(SERVICE_TYPE_CONFIG.fuel_filter).not.toEqual(SERVICE_TYPE_CONFIG.oil_filter);
    expect(SERVICE_TYPE_CONFIG.brake_fluid).not.toEqual(SERVICE_TYPE_CONFIG.brake_pads);
    expect(SERVICE_TYPE_CONFIG.timing_belt.defaultLifespanKm).toBe(90000);
    expect(SERVICE_TYPE_CONFIG.fan_belt.defaultLifespanKm).toBe(60000);
  });

  it('all four ride the derived row list and the health statuses', () => {
    for (const t of Object.keys(EXPECTED)) {
      expect(ROW_SERVICE_TYPES).toContain(t);
    }
    const rows = calculateServiceHealthStatuses({ id: 'v1', currentOdometer: 0 } as Vehicle, []);
    expect(rows).toHaveLength(19);
    for (const t of Object.keys(EXPECTED)) {
      expect(rows.some((r) => r.serviceType === t)).toBe(true);
    }
  });

  it('changes no other type', () => {
    expect(SERVICE_TYPE_CONFIG.engine_oil.defaultLifespanKm).toBe(5000);
    expect(SERVICE_TYPE_CONFIG.fan_belt.defaultLifespanKm).toBe(60000);
    expect(SERVICE_TYPE_CONFIG.license_renewal.defaultLifespanDays).toBe(365);
  });
});

describe('wiper_blades time-only safety (v7.6.44 Part H)', () => {
  const vehicle = { id: 'v1', currentOdometer: 50000 } as Vehicle;
  const maint = (over: Partial<VehicleMaintenance>): VehicleMaintenance => ({
    id: 'm1', vehicleId: 'v1', date: '2026-11-01', odometer: 50000,
    serviceType: 'wiper_blades', title: 'Wiper Blades', cost: 15000,
    syncToExpense: false, walletId: 'w1', userId: 'u1', createdAt: 1,
    expectedLifespanKm: 0, expectedLifespanDays: 365,
    ...over,
  });

  it('a fresh wiper change is good (days remain), never overdue-by-km', () => {
    const rows = calculateServiceHealthStatuses(vehicle, [maint({})]);
    const w = rows.find((r) => r.serviceType === 'wiper_blades')!;
    expect(w.remainingDays).toBeGreaterThan(300);
    expect(w.status).toBe('good');
    expect(Number.isFinite(w.healthPercent)).toBe(true);
  });

  it('goes overdue only when the 365 days pass, however far the vehicle drove', () => {
    const rows = calculateServiceHealthStatuses(
      { id: 'v1', currentOdometer: 200000 } as Vehicle,
      [maint({ date: '2026-11-01' })],
    );
    const w = rows.find((r) => r.serviceType === 'wiper_blades')!;
    // Days still remain (changed ~24 days ago) — 150,000 km driven
    // since must NOT make a time-only part overdue.
    expect(w.status).toBe('good');
  });

  it('an expired wiper change raises a date-based expiry reminder', () => {
    const rems = getExpiryReminders(
      [{ id: 'm1', vehicleId: 'v1', vehicleName: 'Hilux', date: '2025-01-01', serviceType: 'wiper_blades', title: 'Wiper Blades', expectedLifespanDays: 365 }],
      [],
      '2026-11-25',
    );
    expect(rems.some((r) => r.serviceType === 'wiper_blades' && r.band === 'overdue')).toBe(true);
  });

  it('the km-alert path safely skips a 0-km log (no crash, no bogus km alert)', () => {
    const alerts = getMaintenanceAlerts(vehicle, [maint({})], 'en');
    expect(alerts.filter((a) => /Wiper/i.test(a.title))).toHaveLength(0);
  });

  it('VehiclesView shows days alone for a 0-km lifespan', () => {
    const view = SRC('../../components/vehicles/VehiclesView.tsx');
    expect(view).toContain('item.expectedLifespanKm <= 0 ? daysPart');
  });
});

describe('timing_belt reminders + entry-form select (v7.6.44 Part H)', () => {
  it('an overdue timing-belt entry raises an expiry reminder', () => {
    const rems = getExpiryReminders(
      [{ id: 'm1', vehicleId: 'v1', vehicleName: 'Hilux', date: '2021-01-01', serviceType: 'timing_belt', title: 'Timing Belt', expectedLifespanDays: 1825 }],
      [],
      '2026-11-25',
    );
    expect(rems.some((r) => r.serviceType === 'timing_belt' && r.band === 'overdue')).toBe(true);
  });

  it('the entry-form service-type select lists all five new types', () => {
    const modal = SRC('../../components/TransactionModal.tsx');
    for (const t of ['fan_belt', 'timing_belt', 'fuel_filter', 'brake_fluid', 'wiper_blades']) {
      expect(modal).toContain(`value="${t}"`);
    }
  });

  it('AddMaintenanceModal still defaults to engine_oil', () => {
    const modal = SRC('../../components/vehicles/AddMaintenanceModal.tsx');
    expect(modal).toContain("useState<VehicleServiceType>('engine_oil')");
  });
});
