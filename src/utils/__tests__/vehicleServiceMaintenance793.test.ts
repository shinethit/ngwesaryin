// [v7.5.93] Unit tests for the Vehicles-tab side of multi-row
// vehicle service entries — the pure helpers in
// src/utils/vehicleServiceRows.ts that AddMaintenanceModal (rows UI)
// and useVehicleHandlers.handleSaveMaintenance (per-type records)
// both rely on. No Firebase, no network: the helpers are pure.
//
// The modal's own rows-total logic lives in the component (a useMemo
// over the same valid-rows rule — name required, qty > 0, amount =
// price x qty), mirroring TransactionModal, so it is not unit-tested
// here; these tests pin the shared util-level pieces instead.

import { describe, it, expect } from 'vitest';

import {
  ROW_SERVICE_TYPES,
  groupServiceRowsByType,
  resolvePerTypeTitle,
  resolveVehicleServiceSubCategory,
} from '../vehicleServiceRows';
import type { TransactionItem, VehicleServiceType } from '../../types';

const row = (
  name: string,
  price: number,
  quantity: number,
  serviceType?: VehicleServiceType
): TransactionItem => ({
  name,
  price,
  quantity,
  amount: price * quantity,
  ...(serviceType ? { serviceType } : {}),
});

describe('resolveVehicleServiceSubCategory', () => {
  it('maps tires to sub_veh_tire', () => {
    expect(resolveVehicleServiceSubCategory('tires')).toBe('sub_veh_tire');
  });

  it('maps engine_oil to sub_veh_parts', () => {
    expect(resolveVehicleServiceSubCategory('engine_oil')).toBe('sub_veh_parts');
  });

  it('maps every other type to sub_veh_maintenance', () => {
    const others: VehicleServiceType[] = [
      'oil_filter',
      'air_filter',
      'brake_pads',
      'battery',
      'spark_plugs',
      'transmission_fluid',
      'coolant',
      'wheel_alignment',
      'suspension',
      'general_repair',
      'other',
      'license_renewal',
    ];
    for (const t of others) {
      expect(resolveVehicleServiceSubCategory(t)).toBe('sub_veh_maintenance');
    }
  });

  it('preserves a picked sub-category', () => {
    expect(resolveVehicleServiceSubCategory('brake_pads', 'sub_veh_parts')).toBe('sub_veh_parts');
    expect(resolveVehicleServiceSubCategory('tires', 'sub_veh_maintenance')).toBe('sub_veh_maintenance');
    expect(resolveVehicleServiceSubCategory('engine_oil', 'sub_veh_tire')).toBe('sub_veh_tire');
  });

  it('never keeps the fuel sub-category — it falls back to the type mapping', () => {
    expect(resolveVehicleServiceSubCategory('engine_oil', 'sub_veh_fuel')).toBe('sub_veh_parts');
    expect(resolveVehicleServiceSubCategory('tires', 'sub_veh_fuel')).toBe('sub_veh_tire');
    expect(resolveVehicleServiceSubCategory('brake_pads', 'sub_veh_fuel')).toBe('sub_veh_maintenance');
  });

  it('treats null / undefined picked sub-category as no pick', () => {
    expect(resolveVehicleServiceSubCategory('tires', null)).toBe('sub_veh_tire');
    expect(resolveVehicleServiceSubCategory('engine_oil', undefined)).toBe('sub_veh_parts');
  });
});

describe('groupServiceRowsByType — one visit, one record per type', () => {
  it('splits engine-oil + air-filter rows into two groups with their own costs', () => {
    const groups = groupServiceRowsByType(
      [
        row('အင်ဂျင်ဝိုင် Castrol 5W-30', 45000, 1, 'engine_oil'),
        row('ဝိုင်စစ်', 8000, 1, 'oil_filter'),
        row('လေစစ်', 12000, 1, 'air_filter'),
      ],
      'engine_oil'
    );
    expect(groups.map((g) => g.serviceType)).toEqual(['engine_oil', 'oil_filter', 'air_filter']);
    expect(groups.map((g) => g.cost)).toEqual([45000, 8000, 12000]);
    // The groups' costs add up to exactly the visit total.
    expect(groups.reduce((s, g) => s + g.cost, 0)).toBe(65000);
  });

  it('sums several rows of the SAME type into one group (qty is honoured)', () => {
    const groups = groupServiceRowsByType(
      [
        row('ရှေ့မီးကြီး', 25000, 1, 'general_repair'),
        row('နောက်မီးအလှဆင်', 15000, 2, 'general_repair'),
        row('ဝိုက်ပါ', 9000, 1, 'general_repair'),
      ],
      'general_repair'
    );
    expect(groups).toHaveLength(1);
    expect(groups[0].serviceType).toBe('general_repair');
    expect(groups[0].rows).toHaveLength(3);
    expect(groups[0].cost).toBe(25000 + 30000 + 9000);
  });

  it('falls back to the visit main type for rows without a serviceType', () => {
    const groups = groupServiceRowsByType(
      [row('အင်ဂျင်ဝိုင်', 40000, 1), row('လေစစ်', 10000, 1, 'air_filter')],
      'engine_oil'
    );
    expect(groups.map((g) => g.serviceType)).toEqual(['engine_oil', 'air_filter']);
    expect(groups[0].cost).toBe(40000);
  });

  it('drops empty-name and zero-quantity rows, but keeps zero-price rows', () => {
    const groups = groupServiceRowsByType(
      [
        row('', 5000, 1, 'engine_oil'),
        row('   ', 5000, 1, 'engine_oil'),
        row('အင်ဂျင်ဝိုင်', 40000, 0, 'engine_oil'),
        row('အခမဲ့ စစ်ဆေးခြင်း', 0, 1, 'general_repair'),
        row('လေစစ်', 10000, 1, 'air_filter'),
      ],
      'engine_oil'
    );
    expect(groups.map((g) => g.serviceType)).toEqual(['general_repair', 'air_filter']);
    expect(groups[0].cost).toBe(0);
    expect(groups[0].rows).toHaveLength(1);
    expect(groups[1].cost).toBe(10000);
  });

  it('returns no groups for no rows', () => {
    expect(groupServiceRowsByType([], 'engine_oil')).toEqual([]);
  });
});

describe('resolvePerTypeTitle', () => {
  it('main type: the visit title wins over the first row name', () => {
    expect(
      resolvePerTypeTitle('အင်ဂျင်ဝိုင် လဲခြင်း', 'engine_oil', 'engine_oil', [row('Castrol 5W-30', 45000, 1, 'engine_oil')], '')
    ).toBe('အင်ဂျင်ဝိုင် လဲခြင်း');
  });

  it('main type with no visit title: first row name', () => {
    expect(
      resolvePerTypeTitle('', 'engine_oil', 'engine_oil', [row('Castrol 5W-30', 45000, 1, 'engine_oil')], '')
    ).toBe('Castrol 5W-30');
  });

  it('other type: first row name wins even when a visit title exists', () => {
    expect(
      resolvePerTypeTitle('အင်ဂျင်ဝိုင် လဲခြင်း', 'engine_oil', 'air_filter', [row('လေစစ်', 12000, 1, 'air_filter')], '')
    ).toBe('လေစစ်');
  });

  it('falls back to the extra note, then to the default title', () => {
    expect(resolvePerTypeTitle('', 'engine_oil', 'air_filter', [], 'ဝပ်ရှော့တွင် လဲလှယ်ခြင်း')).toBe(
      'ဝပ်ရှော့တွင် လဲလှယ်ခြင်း'
    );
    expect(resolvePerTypeTitle('', 'engine_oil', 'air_filter', [], '')).toBe('ယာဉ်ပြုပြင်ထိန်းသိမ်းမှု');
    expect(resolvePerTypeTitle('  ', 'engine_oil', 'engine_oil', [], '  ')).toBe('ယာဉ်ပြုပြင်ထိန်းသိမ်းမှု');
  });
});

describe('ROW_SERVICE_TYPES', () => {
  it('has 13 types and excludes license_renewal', () => {
    expect(ROW_SERVICE_TYPES).toHaveLength(13);
    expect(ROW_SERVICE_TYPES).not.toContain('license_renewal');
    expect(ROW_SERVICE_TYPES).toContain('engine_oil');
    expect(ROW_SERVICE_TYPES).toContain('air_filter');
    expect(ROW_SERVICE_TYPES).toContain('tires');
    expect(ROW_SERVICE_TYPES).toContain('general_repair');
  });
});
