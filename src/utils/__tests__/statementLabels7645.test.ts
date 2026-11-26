// [v7.6.45] Part B — statement detail labels from linked vehicle
// logs + the shared vehicle-name rule. A note-less fuel or
// maintenance record must show its fill-up / visit detail in the
// statement instead of falling back to the bare category name.
// The entry-form auto-note (useTransactionHandlers) covers NEW
// saves; the display-time fallback here covers older saves.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { buildStatementData } from '../statementData';
import {
  buildFuelAutoNote,
  cleanStoredVehicleName,
  formatVehicleDisplayName,
} from '../vehicleNames';
import type { Category, FuelLog, Transaction, VehicleMaintenance } from '../../types';
import {
  VERSION_HISTORY,
  CURRENT_APP_VERSION,
  CURRENT_BUILD_NUMBER,
} from '../../data/versionHistory';

const VERSION_JSON = JSON.parse(
  readFileSync(new URL('../../../public/version.json', import.meta.url), 'utf8'),
);

const CATEGORIES: Category[] = [
  {
    id: 'cat_vehicle',
    name: 'ယာဉ်',
    nameEn: 'Vehicle',
    type: 'expense',
    icon: 'Car',
    color: '#0284C7',
    subCategories: [
      { id: 'sub_veh_fuel', name: 'စက်သုံးဆီ (ဓာတ်ဆီ/ဒီဇယ်)', nameEn: 'Fuel' },
    ],
  },
];

function tx(partial: Partial<Transaction> & { id: string }): Transaction {
  return {
    type: 'expense',
    amount: 0,
    category: 'cat_vehicle',
    subCategoryId: 'sub_veh_fuel',
    walletId: 'w1',
    date: '2026-11-11',
    ...partial,
  } as Transaction;
}

function fuelLog(partial: Partial<FuelLog> & { id: string }): FuelLog {
  return {
    vehicleId: 'v1',
    vehicleName: 'Starex',
    date: '2026-11-11',
    odometer: 21193,
    liters: 46.8,
    pricePerLiter: 5500,
    totalCost: 257400,
    isFullTank: true,
    fuelType: 'Diesel',
    gasStation: 'စံပြ',
    syncToExpense: true,
    walletId: 'w1',
    userId: 'u1',
    createdAt: 1,
    ...partial,
  } as FuelLog;
}

function maintLog(partial: Partial<VehicleMaintenance> & { id: string }): VehicleMaintenance {
  return {
    vehicleId: 'v1',
    vehicleName: 'Starex',
    date: '2026-11-11',
    odometer: 21193,
    serviceType: 'engine_oil',
    title: 'Oil change',
    cost: 45000,
    workshopName: 'Workshop A',
    syncToExpense: true,
    walletId: 'w1',
    userId: 'u1',
    createdAt: 1,
    ...partial,
  } as VehicleMaintenance;
}

const IDENTITY = (t: Transaction, amount: number) => amount;

function labelFor(
  t: Transaction,
  fuelLogs?: FuelLog[],
  maintenanceLogs?: VehicleMaintenance[],
  lang: 'my' | 'en' = 'my',
): string {
  const data = buildStatementData({
    transactions: [t],
    categories: CATEGORIES,
    convertAmount: IDENTITY,
    start: null,
    end: null,
    lang,
    fuelLogs,
    maintenanceLogs,
  });
  return data.details[0].label;
}

describe('statement vehicle detail labels (v7.6.45 Part B)', () => {
  it('note-less fuel record shows vehicle, litres, price and station', () => {
    const t = tx({ id: 'tx1', amount: 257400 });
    const label = labelFor(t, [fuelLog({ id: 'log1', transactionId: 'tx1' })]);
    expect(label).toBe('Starex — 46.8 L @ 5,500 Ks (စံပြ)');
  });

  it('resolves by the synthetic tx_fuel_ id when transactionId was never stamped', () => {
    const t = tx({ id: 'tx_fuel_log1', amount: 257400 });
    const label = labelFor(t, [fuelLog({ id: 'log1' })]);
    expect(label).toBe('Starex — 46.8 L @ 5,500 Ks (စံပြ)');
  });

  it('note-less maintenance record shows vehicle, service type, title and workshop', () => {
    const t = tx({ id: 'tx2', amount: 45000 });
    const label = labelFor(t, [], [maintLog({ id: 'm1', transactionId: 'tx2' })]);
    expect(label).toBe('Starex — အင်ဂျင်ဝိုင် (Engine Oil) — Oil change (Workshop A)');
  });

  it('maintenance label uses the English service label in English', () => {
    const t = tx({ id: 'tx2', amount: 45000 });
    const label = labelFor(t, [], [maintLog({ id: 'm1', transactionId: 'tx2' })], 'en');
    expect(label).toBe('Starex — Engine Oil — Oil change (Workshop A)');
  });

  it('resolves maintenance by the synthetic tx_maint_ id', () => {
    const t = tx({ id: 'tx_maint_m1', amount: 45000 });
    const label = labelFor(t, [], [maintLog({ id: 'm1' })]);
    expect(label).toBe('Starex — အင်ဂျင်ဝိုင် (Engine Oil) — Oil change (Workshop A)');
  });

  it('a stale "Starex ()" name saved before the empty-plate guard is cleaned at display time', () => {
    const t = tx({ id: 'tx1', amount: 257400 });
    const label = labelFor(t, [
      fuelLog({ id: 'log1', transactionId: 'tx1', vehicleName: 'Starex ()' }),
    ]);
    expect(label).toBe('Starex — 46.8 L @ 5,500 Ks (စံပြ)');
  });

  it('a missing station renders no parentheses', () => {
    const t = tx({ id: 'tx1', amount: 257400 });
    const label = labelFor(t, [
      fuelLog({ id: 'log1', transactionId: 'tx1', gasStation: '' }),
    ]);
    expect(label).toBe('Starex — 46.8 L @ 5,500 Ks');
  });

  it('a typed note still wins over the vehicle log', () => {
    const t = tx({ id: 'tx1', amount: 257400, note: 'ခရီးသွားဆီ' });
    const label = labelFor(t, [fuelLog({ id: 'log1', transactionId: 'tx1' })]);
    expect(label).toBe('ခရီးသွားဆီ');
  });

  it('items still win over the vehicle log', () => {
    const t = tx({
      id: 'tx1',
      amount: 257400,
      items: [{ name: 'Diesel', price: 257400, quantity: 1, amount: 257400 } as Transaction['items'][number]],
    });
    const label = labelFor(t, [fuelLog({ id: 'log1', transactionId: 'tx1' })]);
    expect(label).toBe('Diesel');
  });

  it('without logs the category-name fallback is unchanged', () => {
    const t = tx({ id: 'tx1', amount: 257400 });
    expect(labelFor(t)).toBe('ယာဉ်');
    expect(labelFor(t, [], [])).toBe('ယာဉ်');
  });
});

describe('vehicle display names (v7.6.45 Part B)', () => {
  it('omits the parentheses when the plate number is empty', () => {
    expect(formatVehicleDisplayName({ name: 'Starex', plateNumber: '' })).toBe('Starex');
    expect(formatVehicleDisplayName({ name: 'Starex' })).toBe('Starex');
    expect(formatVehicleDisplayName({ name: 'Starex', plateNumber: '  ' })).toBe('Starex');
  });

  it('keeps the parentheses when a plate number exists', () => {
    expect(formatVehicleDisplayName({ name: 'Starex', plateNumber: 'ABC-123' })).toBe(
      'Starex (ABC-123)',
    );
  });

  it('falls back for a missing vehicle', () => {
    expect(formatVehicleDisplayName(null)).toBe('Vehicle');
    expect(formatVehicleDisplayName({ name: '' })).toBe('Vehicle');
  });

  it('cleanStoredVehicleName strips only an empty-parens suffix', () => {
    expect(cleanStoredVehicleName('Starex ()')).toBe('Starex');
    expect(cleanStoredVehicleName('Starex ( )')).toBe('Starex');
    expect(cleanStoredVehicleName('Starex (ABC-123)')).toBe('Starex (ABC-123)');
    expect(cleanStoredVehicleName('Starex')).toBe('Starex');
    expect(cleanStoredVehicleName(undefined)).toBe('');
  });

  it('buildFuelAutoNote matches the VehiclesView summary shape', () => {
    expect(
      buildFuelAutoNote({ vehicleName: 'Starex', liters: 46.8, pricePerLiter: 5500, gasStation: 'စံပြ' }),
    ).toBe('[ဆီထည့်စရိတ်] Starex - 46.8 L @ 5,500 Ks (စံပြ)');
    expect(
      buildFuelAutoNote({ vehicleName: 'Starex', liters: 10, pricePerLiter: 3000 }),
    ).toBe('[ဆီထည့်စရိတ်] Starex - 10 L @ 3,000 Ks');
    expect(buildFuelAutoNote({ vehicleName: 'Starex', liters: 0, pricePerLiter: 0 })).toBe('');
  });
});

describe('Version pins roll to v7.6.52 / build 366', () => {
  it('constants, version.json and the top history entry agree, with no Admin strings', () => {
    expect(CURRENT_APP_VERSION).toBe('v7.6.54');
    expect(CURRENT_BUILD_NUMBER).toBe(368);
    expect(VERSION_JSON.version).toBe('v7.6.54');
    expect(VERSION_JSON.buildNumber).toBe(368);
    const top = VERSION_HISTORY[0];
    expect(top.version).toBe('v7.6.54');
    expect(top.buildNumber).toBe(368);
    expect(top.changesMy.join(' ')).not.toContain('Admin');
    expect(top.changesEn.join(' ')).not.toContain('Admin');
    expect(top.changesMy.length).toBe(2);
    expect(top.changesEn.length).toBe(2);
    expect(VERSION_JSON.changesMy).toEqual(top.changesMy);
    expect(VERSION_JSON.changesEn).toEqual(top.changesEn);
  });
});
