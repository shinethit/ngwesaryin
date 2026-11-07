// [v7.5.71] Regression: shop import helpers must map rows to exact
// public_shops docs, dedupe by id + name/phone, and reject bad rows.
import { describe, it, expect } from 'vitest';
import {
  parseShopImportFile,
  validateShopRows,
  previewShopImport,
  mapShopRow,
  shopDedupeKey,
  normalizePhone,
  firstPhoneOf,
} from './shopImport';

const META = {
  id: 'pub_shop_sm3_61571',
  addedBy: 'khunthanshwe@gmail.com',
  addedByUid: 'uid-admin-1',
  createdAt: 1794000000000,
};

describe('normalizePhone (v7.5.71)', () => {
  it('converts Myanmar digits to Latin digits', () => {
    expect(normalizePhone('၀၉၁၂၃၄၅၆၇၈၉')).toBe('09123456789');
  });

  it('strips spaces, dashes and parentheses', () => {
    expect(normalizePhone('09 123-456 (789)')).toBe('09123456789');
  });

  it('returns empty for empty input', () => {
    expect(normalizePhone('')).toBe('');
  });
});

describe('shopDedupeKey (v7.5.71)', () => {
  it('matches a Myanmar-digit phone against Latin digits', () => {
    expect(shopDedupeKey('T & T Service', '၀၉၄၂၀၀၂၆၇၀၇')).toBe(shopDedupeKey('T & T Service', '09420026707'));
  });

  it('is case- and space-insensitive on the name', () => {
    expect(shopDedupeKey('  Shwe Shop ', '09123')).toBe(shopDedupeKey('shwe shop', '09123'));
  });

  it('returns null when there is no phone', () => {
    expect(shopDedupeKey('Shwe Shop', '')).toBeNull();
  });

  it('differs for different phones', () => {
    expect(shopDedupeKey('Shwe Shop', '09111')).not.toBe(shopDedupeKey('Shwe Shop', '09222'));
  });
});

describe('firstPhoneOf (v7.5.71)', () => {
  it('prefers the first entry of phones', () => {
    expect(firstPhoneOf({ name: 'X', phones: ['09111', '09222'] })).toBe('09111');
  });

  it('falls back to phone', () => {
    expect(firstPhoneOf({ name: 'X', phone: '09333' })).toBe('09333');
  });

  it('returns empty when there is no phone', () => {
    expect(firstPhoneOf({ name: 'X' })).toBe('');
  });
});

describe('parseShopImportFile + validateShopRows (v7.5.71)', () => {
  it('parses a JSON array', () => {
    expect(parseShopImportFile('[{"name":"A"},{"name":"B"}]')).toHaveLength(2);
  });

  it('throws on non-array JSON', () => {
    expect(() => parseShopImportFile('{"name":"A"}')).toThrow();
  });

  it('throws on invalid JSON', () => {
    expect(() => parseShopImportFile('not json')).toThrow();
  });

  it('rejects rows without a name, blank names and non-object rows', () => {
    const { valid, invalid } = validateShopRows([
      { name: 'A' },
      { phone: '09123' },
      'nope',
      null,
      { name: '   ' },
    ]);
    expect(valid).toHaveLength(1);
    expect(invalid.map((r) => r.index)).toEqual([1, 2, 3, 4]);
    expect(invalid.map((r) => r.reason)).toEqual(['missing-name', 'not-object', 'not-object', 'missing-name']);
  });

  it('trims the kept name', () => {
    const { valid } = validateShopRows([{ name: '  Shwe Shop  ' }]);
    expect(valid[0].name).toBe('Shwe Shop');
  });

  it('builds a preview with region counts', () => {
    const preview = previewShopImport([
      { name: 'A', stateRegion: 'ရန်ကုန်တိုင်းဒေသကြီး' },
      { name: 'B', stateRegion: 'ရန်ကုန်တိုင်းဒေသကြီး' },
      { name: 'C', stateRegion: 'မန္တလေးတိုင်းဒေသကြီး' },
      { phone: '09123' },
    ]);
    expect(preview.total).toBe(4);
    expect(preview.valid).toHaveLength(3);
    expect(preview.invalid).toHaveLength(1);
    expect(preview.byRegion[0]).toEqual({ region: 'ရန်ကုန်တိုင်းဒေသကြီး', count: 2 });
  });
});

describe('mapShopRow (v7.5.71)', () => {
  it('takes addedBy/addedByUid/createdAt from the import, never the file', () => {
    const docData = mapShopRow(
      { name: 'T & T', addedBy: 'someone-else', addedByUid: 'uid-other', createdAt: 111 },
      META
    );
    expect(docData.addedBy).toBe('khunthanshwe@gmail.com');
    expect(docData.addedByUid).toBe('uid-admin-1');
    expect(docData.createdAt).toBe(1794000000000);
    expect(docData.id).toBe('pub_shop_sm3_61571');
  });

  it('strips sm3-only extras from the stored doc', () => {
    const docData = mapShopRow(
      {
        name: 'A',
        sm3_id: 61571,
        sm3_url: 'https://www.sm3dir.com/item-detail/61571',
        facebook: 'https://fb.com/a',
        website: 'https://a.example',
        email: 'a@example.com',
        latitude: '16.8',
        longitude: '96.1',
      },
      META
    );
    expect('sm3_id' in docData).toBe(false);
    expect('sm3_url' in docData).toBe(false);
    expect('facebook' in docData).toBe(false);
    expect('website' in docData).toBe(false);
    expect('email' in docData).toBe(false);
    expect('latitude' in docData).toBe(false);
    expect('longitude' in docData).toBe(false);
  });

  it('appends website and email to generalNotes', () => {
    const docData = mapShopRow(
      { name: 'A', generalNotes: 'sm3dir', website: 'https://a.example', email: 'a@example.com' },
      META
    );
    expect(docData.generalNotes).toBe('sm3dir · website: https://a.example · email: a@example.com');
  });

  it('keeps nameEn when present', () => {
    const docData = mapShopRow({ name: 'A', nameEn: 'Shop A' }, META);
    expect(docData.nameEn).toBe('Shop A');
  });

  it('defaults note to other, items to [], helpfulCount to 0', () => {
    const docData = mapShopRow({ name: 'A' }, META);
    expect(docData.note).toBe('other');
    expect(docData.items).toEqual([]);
    expect(docData.helpfulCount).toBe(0);
    expect(docData.phone).toBe('');
    expect(docData.phones).toEqual([]);
    expect(docData.city).toBe('');
  });

  it('derives phone/address from the first array entries', () => {
    const docData = mapShopRow(
      { name: 'A', phones: ['09111', '09222'], addresses: ['Addr 1', 'Addr 2'] },
      META
    );
    expect(docData.phone).toBe('09111');
    expect(docData.address).toBe('Addr 1');
  });

  it('drops malformed price items', () => {
    const docData = mapShopRow(
      {
        name: 'A',
        items: [
          { name: 'Rice', price: 5000, updatedAt: 1794000000000 },
          { name: 'Bad', price: 'free' },
          { price: 100 },
          'nope',
        ],
      },
      META
    );
    expect(docData.items).toEqual([{ name: 'Rice', price: 5000, updatedAt: 1794000000000 }]);
  });
});
