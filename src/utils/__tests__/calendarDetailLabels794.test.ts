// [v7.5.94] Smart Calendar day-detail label helpers: sub-category main
// line + item-names detail line. Pure-function unit tests.
import { describe, it, expect } from 'vitest';
import {
  resolveCalendarDetailMainLabel,
  formatCalendarDetailItems,
} from '../calendarDetailLabels';

const CAT = {
  id: 'cat_vehicle',
  name: 'ယာဉ်',
  nameEn: 'Vehicle',
  subCategories: [
    { id: 'sub_veh_fuel', name: 'ဆီဖိုး', nameEn: 'Fuel' },
    { id: 'sub_veh_tire', name: 'တာယာ', nameEn: 'Tire' },
    { id: 'sub_veh_parts', name: 'အပိုပစ္စည်း', nameEn: '' },
  ],
};

describe('resolveCalendarDetailMainLabel', () => {
  it('resolves a matching sub-category in Myanmar', () => {
    expect(
      resolveCalendarDetailMainLabel('sub_veh_fuel', CAT, 'ယာဉ်', 'my'),
    ).toBe('ဆီဖိုး');
  });

  it('resolves a matching sub-category in English', () => {
    expect(
      resolveCalendarDetailMainLabel('sub_veh_tire', CAT, 'Vehicle', 'en'),
    ).toBe('Tire');
  });

  it('falls back to the English category name when nameEn is empty', () => {
    expect(
      resolveCalendarDetailMainLabel('sub_veh_parts', CAT, 'Vehicle', 'en'),
    ).toBe('အပိုပစ္စည်း');
  });

  it('falls back to the category name when the sub-category id has no match', () => {
    expect(
      resolveCalendarDetailMainLabel('sub_unknown', CAT, 'ယာဉ်', 'my'),
    ).toBe('ယာဉ်');
  });

  it('falls back to the category name when there is no sub-category id', () => {
    expect(
      resolveCalendarDetailMainLabel(undefined, CAT, 'ယာဉ်', 'my'),
    ).toBe('ယာဉ်');
    expect(resolveCalendarDetailMainLabel('', CAT, 'Vehicle', 'en')).toBe(
      'Vehicle',
    );
  });

  it('falls back to the category name when the category has no sub-categories', () => {
    expect(
      resolveCalendarDetailMainLabel('sub_veh_fuel', undefined, 'ယာဉ်', 'my'),
    ).toBe('ယာဉ်');
    expect(
      resolveCalendarDetailMainLabel(
        'sub_veh_fuel',
        { subCategories: [] },
        'Vehicle',
        'en',
      ),
    ).toBe('Vehicle');
  });
});

describe('formatCalendarDetailItems', () => {
  it('returns null when there are no items', () => {
    expect(formatCalendarDetailItems(undefined, 'my')).toBeNull();
    expect(formatCalendarDetailItems([], 'my')).toBeNull();
  });

  it('returns null when every item name is blank (note fallback applies)', () => {
    expect(
      formatCalendarDetailItems(
        [
          { name: '', price: 0, quantity: 1, amount: 0 },
          { name: '   ', price: 0, quantity: 1, amount: 0 },
        ],
        'en',
      ),
    ).toBeNull();
  });

  it('shows a single item name as-is', () => {
    expect(
      formatCalendarDetailItems(
        [{ name: 'ရှေ့မီးကြီး', price: 1, quantity: 1, amount: 1 }],
        'my',
      ),
    ).toBe('ရှေ့မီးကြီး');
  });

  it('joins two item names with a middle dot', () => {
    expect(
      formatCalendarDetailItems(
        [
          { name: 'ရှေ့မီးကြီး', price: 1, quantity: 1, amount: 1 },
          { name: 'နောက်အလှမီး', price: 1, quantity: 1, amount: 1 },
        ],
        'my',
      ),
    ).toBe('ရှေ့မီးကြီး · နောက်အလှမီး');
  });

  it('shows the first two names plus the Myanmar overflow suffix for 3+ items', () => {
    expect(
      formatCalendarDetailItems(
        [
          { name: 'ရှေ့မီးကြီး', price: 1, quantity: 1, amount: 1 },
          { name: 'နောက်အလှမီး', price: 1, quantity: 1, amount: 1 },
          { name: 'Wiper', price: 1, quantity: 1, amount: 1 },
        ],
        'my',
      ),
    ).toBe('ရှေ့မီးကြီး · နောက်အလှမီး · +1 မျိုး');
  });

  it('shows the English overflow suffix for 4 items', () => {
    expect(
      formatCalendarDetailItems(
        [
          { name: 'A', price: 1, quantity: 1, amount: 1 },
          { name: 'B', price: 1, quantity: 1, amount: 1 },
          { name: 'C', price: 1, quantity: 1, amount: 1 },
          { name: 'D', price: 1, quantity: 1, amount: 1 },
        ],
        'en',
      ),
    ).toBe('A · B · +2 more');
  });
});
