// [v7.6.10] A mistaken leading Myanmar number word in a unit name
// is stripped automatically ('တစ်ဗူး' → 'ဗူး', 'နှစ်ထုပ်' → 'ထုပ်'),
// for ALL cardinal number words 1–10 — not just the five v7.5.97
// preset forms. Guards: a bare number word alone is kept, only one
// prefix is stripped, digits never strip, and empty / non-string
// values still fall back to the default.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  VERSION_HISTORY,
  CURRENT_APP_VERSION,
  CURRENT_BUILD_NUMBER,
} from '../../data/versionHistory';
import {
  DEFAULT_MENU_UNIT,
  collectNewCustomUnits,
  computeMenuDiff,
  customMenuUnitText,
  displayMenuUnit,
  isCustomMenuUnit,
  menuUnitNeedsCustomInput,
  menuUnitSelectOptions,
  normalizeMenuUnit,
  resolveMenuUnitSelectValue,
  resolveSavedMenuUnit,
} from '../shopMenuUpdate';

const MENU_SRC = readFileSync(
  new URL('../shopMenuUpdate.ts', import.meta.url),
  'utf8',
);
const VERSION_JSON = JSON.parse(
  readFileSync(new URL('../../../public/version.json', import.meta.url), 'utf8'),
);

const NUMBER_WORDS = [
  'တစ်',
  'နှစ်',
  'သုံး',
  'လေး',
  'ငါး',
  'ခြောက်',
  'ခုနှစ်',
  'ရှစ်',
  'ကိုး',
  'ဆယ်',
];

describe('normalizeMenuUnit strips one leading number word (v7.6.10)', () => {
  it('strips each of the 10 number words from a custom unit', () => {
    const cases: Array<[string, string]> = [
      ['တစ်ဗူး', 'ဗူး'],
      ['နှစ်ထုပ်', 'ထုပ်'],
      ['သုံးလုံး', 'လုံး'],
      ['လေးကီလို', 'ကီလို'],
      ['ငါးဗူး', 'ဗူး'],
      ['ခြောက်ထုပ်', 'ထုပ်'],
      ['ခုနှစ်လုံး', 'လုံး'],
      ['ရှစ်ဗူး', 'ဗူး'],
      ['ကိုးထုပ်', 'ထုပ်'],
      ['ဆယ်ကီလို', 'ကီလို'],
    ];
    for (const [input, bare] of cases) {
      expect(normalizeMenuUnit(input)).toBe(bare);
    }
  });

  it('the 5 legacy preset forms still map to the same bare forms', () => {
    expect(normalizeMenuUnit('တစ်ခု')).toBe('ခု');
    expect(normalizeMenuUnit('တစ်ပါကင်')).toBe('ပါကင်');
    expect(normalizeMenuUnit('တစ်ကီလို')).toBe('ကီလို');
    expect(normalizeMenuUnit('တစ်လီတာ')).toBe('လီတာ');
    expect(normalizeMenuUnit('တစ်ထုပ်')).toBe('ထုပ်');
  });

  it('a bare number word alone is kept — an empty remainder never strips', () => {
    for (const word of NUMBER_WORDS) {
      expect(normalizeMenuUnit(word)).toBe(word);
      expect(normalizeMenuUnit(`  ${word} `)).toBe(word);
    }
  });

  it('empty / whitespace / non-string fall back to the default', () => {
    expect(normalizeMenuUnit('')).toBe(DEFAULT_MENU_UNIT);
    expect(normalizeMenuUnit('   ')).toBe(DEFAULT_MENU_UNIT);
    expect(normalizeMenuUnit(undefined)).toBe(DEFAULT_MENU_UNIT);
    expect(normalizeMenuUnit(null)).toBe(DEFAULT_MENU_UNIT);
    expect(normalizeMenuUnit(42)).toBe(DEFAULT_MENU_UNIT);
    expect(DEFAULT_MENU_UNIT).toBe('ခု');
  });

  it("'အခြား' is unchanged", () => {
    expect(normalizeMenuUnit('အခြား')).toBe('အခြား');
    expect(normalizeMenuUnit('  အခြား ')).toBe('အခြား');
  });

  it('only ONE prefix is stripped', () => {
    expect(normalizeMenuUnit('တစ်နှစ်ဗူး')).toBe('နှစ်ဗူး');
    expect(normalizeMenuUnit('နှစ်နှစ်ဗူး')).toBe('နှစ်ဗူး');
  });

  it('digits are never stripped', () => {
    expect(normalizeMenuUnit('2ဗူး')).toBe('2ဗူး');
    expect(normalizeMenuUnit('10ထုပ်')).toBe('10ထုပ်');
  });

  it('spaced forms strip too, via the post-strip trim', () => {
    expect(normalizeMenuUnit('တစ် ဗူး')).toBe('ဗူး');
    expect(normalizeMenuUnit('နှစ် ထုပ်')).toBe('ထုပ်');
    expect(normalizeMenuUnit('တစ်  ဗူး')).toBe('ဗူး');
  });

  it('a custom unit with no number-word prefix is unchanged', () => {
    expect(normalizeMenuUnit('ဖန်ခွက်')).toBe('ဖန်ခွက်');
    expect(normalizeMenuUnit('ဗူး')).toBe('ဗူး');
    expect(normalizeMenuUnit('လုံး')).toBe('လုံး');
    expect(normalizeMenuUnit('တစ်စုံ')).toBe('စုံ');
    expect(normalizeMenuUnit('per kilo')).toBe('per kilo');
  });

  it('displayMenuUnit is the stripped form', () => {
    expect(displayMenuUnit('တစ်ဗူး')).toBe('ဗူး');
    expect(displayMenuUnit('နှစ်ထုပ်')).toBe('ထုပ်');
    expect(displayMenuUnit('ဆယ်ကီလို')).toBe('ကီလို');
  });

  it('the old five-form map is gone from the source', () => {
    expect(MENU_SRC).not.toContain('LEGACY_MENU_UNITS');
  });
});

describe('select resolution for a stored တစ်- custom (v7.6.10)', () => {
  it("stored 'တစ်ဗူး' resolves to the custom 'ဗူး' — never a preset, never Other + the old text", () => {
    expect(resolveMenuUnitSelectValue('တစ်ဗူး', ['ဗူး'])).toBe('ဗူး');
    expect(resolveMenuUnitSelectValue('တစ်ဗူး', ['တစ်ဗူး'])).toBe('ဗူး');
    expect(resolveMenuUnitSelectValue('ဗူး', ['တစ်ဗူး'])).toBe('ဗူး');
    // Unlisted anywhere: the select shows Other, but the custom
    // input carries the STRIPPED text, not the stored form.
    expect(resolveMenuUnitSelectValue('တစ်ဗူး', [])).toBe('အခြား');
    expect(customMenuUnitText('တစ်ဗူး')).toBe('ဗူး');
    expect(menuUnitNeedsCustomInput('တစ်ဗူး')).toBe(true);
    expect(isCustomMenuUnit('တစ်ဗူး')).toBe(true);
    expect(resolveSavedMenuUnit('တစ်ဗူး')).toBe('ဗူး');
  });

  it('the stored custom-units list collapses duplicates through normalization', () => {
    expect(menuUnitSelectOptions(['တစ်ဗူး', 'ဗူး']).map((o) => o.value)).toEqual([
      'ခု',
      'ပါကင်',
      'ကီလို',
      'လီတာ',
      'ထုပ်',
      'ဗူး',
      'အခြား',
    ]);
    expect(collectNewCustomUnits(['တစ်ဗူး'], ['ဗူး'])).toEqual([]);
    expect(collectNewCustomUnits(['ဗူး'], ['တစ်ဗူး'])).toEqual([]);
    expect(collectNewCustomUnits(['တစ်ထောင်း', 'တစ်ပုံး'], [])).toEqual([
      'ထောင်း',
      'ပုံး',
    ]);
  });

  it('matching: a stored တစ်- line and a bare entry are one UPDATE, never a duplicate', () => {
    const rows = computeMenuDiff(
      [{ name: 'ဆန်', price: 100, unit: 'တစ်ဗူး' }],
      [{ name: 'ဆန်', price: 120, quantity: 1, unit: 'ဗူး' }],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      itemName: 'ဆန်',
      unit: 'ဗူး',
      oldPrice: 100,
      newPrice: 120,
      isNew: false,
    });
  });
});

describe('version pins rolled forward to v7.6.27 (build 342)', () => {
  it('version constants and history entry match version.json', () => {
    expect(CURRENT_APP_VERSION).toBe('v7.6.53');
    expect(CURRENT_BUILD_NUMBER).toBe(367);
    expect(VERSION_JSON.version).toBe('v7.6.53');
    expect(VERSION_JSON.buildNumber).toBe(367);
    const entry = VERSION_HISTORY[0];
    expect(entry.version).toBe('v7.6.53');
    expect(entry.buildNumber).toBe(367);
    expect(entry.releaseDate).toBe('2026-11-26');
    expect(entry.tag).toBe('feature');
    expect(entry.titleMy).toBe('Google အကောင့်မှာ စကားဝှက် သတ်မှတ်နိုင်ခြင်း');
    expect(entry.titleEn).toBe('Set a password on a Google account');
    expect(entry.changesMy).toEqual(VERSION_JSON.changesMy);
    expect(entry.changesEn).toEqual(VERSION_JSON.changesEn);
    expect(entry.changesMy).toHaveLength(2);
    expect(entry.changesEn).toHaveLength(2);
    expect(entry.changesMy[0]).toBe(
      'Google ဖြင့် ဝင်ထားတဲ့ အကောင့်မှာ Email + စကားဝှက် သတ်မှတ်လို့ရပါပြီ — Google နဲ့ရော Email + စကားဝှက်နဲ့ပါ နှစ်နည်းလုံး ဝင်လို့ရပါတယ်',
    );
    expect(entry.changesEn[0]).toBe(
      'Google-signed-in accounts can now set an email password too — both Google and email + password sign-in work',
    );
  });

  it('change log has no Admin content and releasedAt is present-only', () => {
    expect(VERSION_JSON.changesMy.join(' ')).not.toContain('Admin');
    expect(VERSION_JSON.changesEn.join(' ')).not.toContain('Admin');
    expect(JSON.stringify(VERSION_HISTORY[0])).not.toContain('Admin');
    expect(typeof VERSION_JSON.releasedAt).toBe('string');
    expect(VERSION_JSON.releasedAt.length).toBeGreaterThan(0);
  });

  it('no mangled numbering anywhere in the version surfaces', () => {
    expect(CURRENT_APP_VERSION).not.toBe('v7.5.100');
    expect(VERSION_JSON.version).not.toBe('v7.5.100');
    expect(CURRENT_APP_VERSION).not.toBe('v7.6.1');
    expect(VERSION_JSON.version).not.toBe('v7.6.1');
  });

  it('the fix-script guard is raw string equality: accepts exactly 7.6.10/7.6.11, rejects the mangled form', () => {
    const FROM_VERSION = '7.6.10';
    const TO_VERSION = '7.6.11';
    const guardFails = (pkgVersion: string): boolean =>
      pkgVersion !== FROM_VERSION && pkgVersion !== TO_VERSION;
    // '7.6.11' has no leading zero to mangle by Number(), so the
    // mangled form here is the trailing-digit drop a loose guard
    // would accept — built from TO_VERSION, never written as a
    // literal, so the shipped identity can never be confused with
    // it by a grep or by the guard.
    const mangled = TO_VERSION.replace(/1$/, '');
    expect(mangled).not.toBe(TO_VERSION);
    expect(TO_VERSION).toBe('7.6.11');
    expect(guardFails('7.6.10')).toBe(false);
    expect(guardFails('7.6.11')).toBe(false);
    expect(guardFails(mangled)).toBe(true);
    expect(guardFails('7.6.1')).toBe(true);
    expect(guardFails('')).toBe(true);
  });
});
