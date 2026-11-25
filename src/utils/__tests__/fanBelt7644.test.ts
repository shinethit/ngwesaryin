// [v7.6.44] Part G — Fan Belt service type. The config carries the
// defaults (60,000 km / 1,460 days); every consumer derives from the
// config, so the new type must flow through the health statuses,
// the per-row pickers, and the expiry reminders with no other code
// change. Pins the defaults + the flow; the modal's own defaults
// display is verified by the harness render.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { SERVICE_TYPE_CONFIG, calculateServiceHealthStatuses } from '../vehicleAnalytics';
import { ROW_SERVICE_TYPES } from '../vehicleServiceRows';
import { getExpiryReminders } from '../expiryReminders';
import type { Vehicle, VehicleMaintenance } from '../../types';

const SRC = (rel: string) => readFileSync(new URL(rel, import.meta.url), 'utf8');

describe('fan_belt config (v7.6.44 Part G)', () => {
  it('carries the approved defaults and labels', () => {
    const c = SERVICE_TYPE_CONFIG.fan_belt;
    expect(c).toBeDefined();
    expect(c.labelMy).toBe('ပန်ကာကြိုး (Fan Belt)');
    expect(c.labelEn).toBe('Fan Belt');
    expect(c.defaultLifespanKm).toBe(60000);
    expect(c.defaultLifespanDays).toBe(1460);
  });

  it('is the 19th config type and rides the derived row list', () => {
    expect(Object.keys(SERVICE_TYPE_CONFIG)).toHaveLength(19);
    expect(ROW_SERVICE_TYPES).toContain('fan_belt');
    expect(ROW_SERVICE_TYPES).not.toContain('license_renewal');
  });

  it('changes no other type', () => {
    expect(SERVICE_TYPE_CONFIG.engine_oil.defaultLifespanKm).toBe(5000);
    expect(SERVICE_TYPE_CONFIG.engine_oil.defaultLifespanDays).toBe(180);
    expect(SERVICE_TYPE_CONFIG.tires.defaultLifespanKm).toBe(45000);
    expect(SERVICE_TYPE_CONFIG.battery.defaultLifespanDays).toBe(720);
  });
});

describe('fan_belt health + reminders (v7.6.44 Part G)', () => {
  const vehicle = { id: 'v1', currentOdometer: 1000 } as Vehicle;
  const maint = (over: Partial<VehicleMaintenance>): VehicleMaintenance => ({
    id: 'm1', vehicleId: 'v1', date: '2026-11-01', odometer: 0,
    serviceType: 'fan_belt', title: 'Fan Belt', cost: 20000,
    syncToExpense: false, walletId: 'w1', userId: 'u1', createdAt: 1,
    ...over,
  });

  it('appears in health statuses with the config defaults when never serviced', () => {
    const rows = calculateServiceHealthStatuses(vehicle, []);
    const belt = rows.find((r) => r.serviceType === 'fan_belt');
    expect(belt).toBeDefined();
    expect(belt!.expectedLifespanKm).toBe(60000);
    expect(belt!.expectedLifespanDays).toBe(1460);
    expect(belt!.remainingKm).toBe(60000);
    expect(belt!.status).toBe('not_recorded');
    expect(rows).toHaveLength(19);
  });

  it('goes overdue once the vehicle passes 60,000 km since the belt change', () => {
    const rows = calculateServiceHealthStatuses(
      { id: 'v1', currentOdometer: 61000 } as Vehicle,
      [maint({ odometer: 0, date: '2026-11-01' })],
    );
    const belt = rows.find((r) => r.serviceType === 'fan_belt')!;
    expect(belt.remainingKm).toBe(-1000);
    expect(belt.status).toBe('overdue');
  });

  it('an overdue fan-belt entry raises an expiry reminder', () => {
    const rems = getExpiryReminders(
      [{ id: 'm1', vehicleId: 'v1', vehicleName: 'Hilux', date: '2022-01-01', serviceType: 'fan_belt', title: 'Fan Belt', expectedLifespanDays: 1460 }],
      [],
      '2026-11-25',
    );
    const belt = rems.find((r) => r.serviceType === 'fan_belt');
    expect(belt).toBeDefined();
    expect(belt!.band).toBe('overdue');
  });
});

describe('fan_belt modal wiring (v7.6.44 Part G)', () => {
  it('AddMaintenanceModal lists every config type and applies config defaults on change', () => {
    const modal = SRC('../../components/vehicles/AddMaintenanceModal.tsx');
    expect(modal).toContain('Object.entries(SERVICE_TYPE_CONFIG).map');
    expect(modal).toContain('setExpectedLifespanKm(config.defaultLifespanKm);');
    expect(modal).toContain('setExpectedLifespanDays(config.defaultLifespanDays);');
    expect(modal).not.toContain('fan_belt');
  });

  it('the form default service type stays engine_oil', () => {
    const modal = SRC('../../components/vehicles/AddMaintenanceModal.tsx');
    expect(modal).toContain("useState<VehicleServiceType>('engine_oil')");
  });
});
