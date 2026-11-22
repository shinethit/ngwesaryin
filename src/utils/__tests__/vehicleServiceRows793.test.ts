// [v7.5.93] Multi-row vehicle service entries: per-row service types,
// per-type titles, sub-category resolution, and multi-row menu candidates.
import { describe, it, expect } from 'vitest';
import {
  groupServiceRowsByType,
  resolvePerTypeTitle,
  resolveVehicleServiceSubCategory,
  ROW_SERVICE_TYPES,
} from '../vehicleServiceRows';
import { buildVehicleMenuCandidate } from '../shopMenuUpdate';
import type { TransactionItem } from '../../types';

const row = (over: Partial<TransactionItem> & { name: string }): TransactionItem => ({
  price: 0,
  quantity: 1,
  amount: 0,
  ...over,
});

describe('ROW_SERVICE_TYPES (v7.5.93)', () => {
  it('has 13 types, excludes license_renewal, keeps SERVICE_TYPE_CONFIG order', () => {
    expect(ROW_SERVICE_TYPES).toHaveLength(13);
    expect(ROW_SERVICE_TYPES).not.toContain('license_renewal');
    expect(ROW_SERVICE_TYPES[0]).toBe('engine_oil');
    expect(ROW_SERVICE_TYPES[ROW_SERVICE_TYPES.length - 1]).toBe('other');
    expect(ROW_SERVICE_TYPES).toContain('tires');
    expect(ROW_SERVICE_TYPES).toContain('air_filter');
  });
});

describe('groupServiceRowsByType (v7.5.93)', () => {
  it('groups mixed types, preserves first-seen order, sums each cost', () => {
    const groups = groupServiceRowsByType(
      [
        row({ name: 'Engine Oil 4L', serviceType: 'engine_oil', price: 30000, quantity: 1, amount: 30000 }),
        row({ name: 'Air Filter', serviceType: 'air_filter', price: 15000, quantity: 1, amount: 15000 }),
        row({ name: 'Oil Filter', serviceType: 'oil_filter', price: 8000, quantity: 1, amount: 8000 }),
        row({ name: 'Engine Oil 1L top-up', serviceType: 'engine_oil', price: 9000, quantity: 1, amount: 9000 }),
      ],
      'general_repair',
    );
    expect(groups.map((g) => g.serviceType)).toEqual(['engine_oil', 'air_filter', 'oil_filter']);
    expect(groups[0].cost).toBe(39000);
    expect(groups[0].rows).toHaveLength(2);
    expect(groups[1].cost).toBe(15000);
    expect(groups[2].cost).toBe(8000);
    // The groups' costs add up to exactly the visit total.
    expect(groups.reduce((s, g) => s + g.cost, 0)).toBe(62000);
  });

  it('rows with no serviceType fall back to the main type', () => {
    const groups = groupServiceRowsByType(
      [
        row({ name: 'Headlight', price: 20000, quantity: 1, amount: 20000 }),
        row({ name: 'Wiper', serviceType: 'general_repair', price: 5000, quantity: 1, amount: 5000 }),
      ],
      'engine_oil',
    );
    expect(groups.map((g) => g.serviceType)).toEqual(['engine_oil', 'general_repair']);
    expect(groups[0].cost).toBe(20000);
  });

  it('drops empty-name and zero-quantity rows', () => {
    const groups = groupServiceRowsByType(
      [
        row({ name: '', serviceType: 'engine_oil', price: 1000, quantity: 1, amount: 1000 }),
        row({ name: '   ', serviceType: 'engine_oil', price: 1000, quantity: 1, amount: 1000 }),
        row({ name: 'Bulb', serviceType: 'other', price: 3000, quantity: 0, amount: 0 }),
        row({ name: 'Bulb', serviceType: 'other', price: 3000, quantity: 2, amount: 6000 }),
      ],
      'general_repair',
    );
    expect(groups).toHaveLength(1);
    expect(groups[0].serviceType).toBe('other');
    expect(groups[0].cost).toBe(6000);
  });

  it('empty input → no groups', () => {
    expect(groupServiceRowsByType([], 'engine_oil')).toEqual([]);
  });
});

describe('resolvePerTypeTitle (v7.5.93)', () => {
  const engineRows = [row({ name: 'Engine Oil 4L', serviceType: 'engine_oil', amount: 30000 })];
  const airRows = [row({ name: 'Air Filter', serviceType: 'air_filter', amount: 15000 })];

  it('main type: visit title wins over row name and note', () => {
    expect(resolvePerTypeTitle('Oil change', 'engine_oil', 'engine_oil', engineRows, 'note')).toBe('Oil change');
  });

  it('main type: no title → first row name of that type', () => {
    expect(resolvePerTypeTitle('', 'engine_oil', 'engine_oil', engineRows, 'note')).toBe('Engine Oil 4L');
    expect(resolvePerTypeTitle('   ', 'engine_oil', 'engine_oil', engineRows, 'note')).toBe('Engine Oil 4L');
  });

  it('main type: no title and no rows → extra note, then the default', () => {
    expect(resolvePerTypeTitle('', 'engine_oil', 'engine_oil', [], 'brake check')).toBe('brake check');
    expect(resolvePerTypeTitle('', 'engine_oil', 'engine_oil', [], '')).toBe('ယာဉ်ပြုပြင်ထိန်းသိမ်းမှု');
    expect(resolvePerTypeTitle('', 'engine_oil', 'engine_oil', [], '   ')).toBe('ယာဉ်ပြုပြင်ထိန်းသိမ်းမှု');
  });

  it('other type: first row name wins; visit title is NOT used', () => {
    expect(resolvePerTypeTitle('Oil change', 'engine_oil', 'air_filter', airRows, 'note')).toBe('Air Filter');
  });

  it('other type: no rows → extra note, then the default', () => {
    expect(resolvePerTypeTitle('Oil change', 'engine_oil', 'air_filter', [], 'note')).toBe('note');
    expect(resolvePerTypeTitle('Oil change', 'engine_oil', 'air_filter', [], '')).toBe('ယာဉ်ပြုပြင်ထိန်းသိမ်းမှု');
  });
});

describe('resolveVehicleServiceSubCategory (v7.5.93)', () => {
  it('picked sub-category wins', () => {
    expect(resolveVehicleServiceSubCategory('engine_oil', 'sub_veh_maintenance')).toBe('sub_veh_maintenance');
    expect(resolveVehicleServiceSubCategory('tires', 'sub_veh_parts')).toBe('sub_veh_parts');
  });

  it('sub_veh_fuel never wins — falls through to the type mapping', () => {
    expect(resolveVehicleServiceSubCategory('engine_oil', 'sub_veh_fuel')).toBe('sub_veh_parts');
    expect(resolveVehicleServiceSubCategory('tires', 'sub_veh_fuel')).toBe('sub_veh_tire');
    expect(resolveVehicleServiceSubCategory('battery', 'sub_veh_fuel')).toBe('sub_veh_maintenance');
  });

  it('no pick → tires / engine_oil / everything else', () => {
    expect(resolveVehicleServiceSubCategory('tires')).toBe('sub_veh_tire');
    expect(resolveVehicleServiceSubCategory('tires', null)).toBe('sub_veh_tire');
    expect(resolveVehicleServiceSubCategory('tires', '')).toBe('sub_veh_tire');
    expect(resolveVehicleServiceSubCategory('engine_oil')).toBe('sub_veh_parts');
    expect(resolveVehicleServiceSubCategory('battery')).toBe('sub_veh_maintenance');
    expect(resolveVehicleServiceSubCategory('general_repair', undefined)).toBe('sub_veh_maintenance');
    expect(resolveVehicleServiceSubCategory('other')).toBe('sub_veh_maintenance');
  });
});

describe('buildVehicleMenuCandidate with rows (v7.5.93)', () => {
  const base = {
    entryModel: 'vehicle_service' as const,
    shopName: 'ဝပ်ရှော့ A',
    maintServiceType: 'engine_oil',
    maintServiceLabel: 'အင်ဂျင်ဝိုင် (Engine Oil)',
    maintTitle: 'အင်ဂျင်ဝိုင် လဲလှယ်ခြင်း',
    extraNote: '',
    finalAmount: 62000,
  };
  const rows = [
    row({ name: 'Engine Oil 4L', serviceType: 'engine_oil', price: 30000, quantity: 1, amount: 30000, unit: 'ခု' }),
    row({ name: 'Air Filter', serviceType: 'air_filter', price: 15000, quantity: 1, amount: 15000, unit: 'ခု' }),
    row({ name: 'Wiper', serviceType: 'general_repair', price: 5000, quantity: 2, amount: 10000, unit: 'ပါကင်' }),
  ];

  it('emits one item per row with its own name / price / qty / amount / unit', () => {
    const c = buildVehicleMenuCandidate({ ...base, rows });
    expect(c).toEqual({
      shopName: 'ဝပ်ရှော့ A',
      items: [
        { name: 'Engine Oil 4L', price: 30000, quantity: 1, amount: 30000, unit: 'ခု' },
        { name: 'Air Filter', price: 15000, quantity: 1, amount: 15000, unit: 'ခု' },
        { name: 'Wiper', price: 5000, quantity: 2, amount: 10000, unit: 'ပါကင်' },
      ],
    });
  });

  it('empty rows → old single-item fallback (title, total, qty 1)', () => {
    const c = buildVehicleMenuCandidate({ ...base, rows: [] });
    expect(c).toEqual({
      shopName: 'ဝပ်ရှော့ A',
      items: [{ name: 'အင်ဂျင်ဝိုင် လဲလှယ်ခြင်း', price: 62000, quantity: 1, amount: 62000, unit: 'ခု' }],
    });
    expect(buildVehicleMenuCandidate(base)).toEqual(c);
  });

  it('rows that are all invalid → old single-item fallback', () => {
    const c = buildVehicleMenuCandidate({
      ...base,
      rows: [row({ name: '', serviceType: 'engine_oil', amount: 1000 }), row({ name: 'Bulb', serviceType: 'other', quantity: 0, amount: 0 })],
    });
    expect(c?.items).toHaveLength(1);
    expect(c?.items[0].name).toBe('အင်ဂျင်ဝိုင် လဲလှယ်ခြင်း');
  });

  it('license_renewal with rows → null', () => {
    expect(buildVehicleMenuCandidate({ ...base, maintServiceType: 'license_renewal', rows })).toBeNull();
  });

  it('fuel unchanged: rows are ignored, one per-litre item', () => {
    const c = buildVehicleMenuCandidate({
      entryModel: 'fuel',
      shopName: 'Denko',
      fuelType: 'Octane 92',
      fuelLiters: 10,
      fuelPricePerLiter: 3100,
      rows,
    });
    expect(c).toEqual({
      shopName: 'Denko',
      items: [{ name: 'Octane 92', price: 3100, quantity: 10, amount: 31000, unit: 'လီတာ' }],
    });
  });
});
