// [v7.6.05] Three small fixes in one batch: (a) the license
// expiry date is restored when editing a maintenance record in
// TransactionModal, (b) the generated shopping note carries each
// item's unit, (c) price comparison carries the unit on every
// purchase record and shows it per row. Source-text assertions
// (same pattern as unitQtyUnit800.test.ts) — the components have
// no test renderer in this repo (vitest node env, no
// testing-library); layout behaviour is verified by renders.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  VERSION_HISTORY,
  CURRENT_APP_VERSION,
  CURRENT_BUILD_NUMBER,
} from '../../data/versionHistory';
import { formatMMK } from '../formatters';
import {
  displayMenuUnit,
  normalizeMenuUnit,
  OTHER_MENU_UNIT,
} from '../shopMenuUpdate';

const MODAL_SRC = readFileSync(
  new URL('../../components/TransactionModal.tsx', import.meta.url),
  'utf8',
);
const ANALYTICS_SRC = readFileSync(
  new URL('../../components/ItemPriceAnalyticsView.tsx', import.meta.url),
  'utf8',
);
const MAINT_SRC = readFileSync(
  new URL('../../components/vehicles/AddMaintenanceModal.tsx', import.meta.url),
  'utf8',
);
const HISTORY_SRC = readFileSync(
  new URL('../../components/ItemPriceHistoryModal.tsx', import.meta.url),
  'utf8',
);
const TXVIEW_SRC = readFileSync(
  new URL('../../components/TransactionsView.tsx', import.meta.url),
  'utf8',
);
const VERSION_JSON = JSON.parse(
  readFileSync(new URL('../../../public/version.json', import.meta.url), 'utf8'),
);

/** The local-time derive, mirrored from AddMaintenanceModal. */
function deriveExpiryDate(dateStr: string, lifespanDays: number | ''): string {
  if (!dateStr || lifespanDays === '' || Number(lifespanDays) <= 0) return '';
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some((p) => Number.isNaN(p))) return '';
  const d = new Date(parts[0], parts[1] - 1, parts[2] + Number(lifespanDays));
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** The expiry->days effect in TransactionModal, mirrored: UTC-midnight ceil. */
function daysFromExpiry(dateStr: string, expiryStr: string): number {
  const d1 = new Date(dateStr).getTime();
  const d2 = new Date(expiryStr).getTime();
  const diff = Math.ceil((d2 - d1) / (1000 * 3600 * 24));
  return diff > 0 ? diff : 0;
}

describe('license expiry date restored on edit (v7.6.05a)', () => {
  it('date + stored days derives the expiry in local time, across boundaries', () => {
    expect(deriveExpiryDate('2026-01-15', 365)).toBe('2027-01-15');
    expect(deriveExpiryDate('2026-11-22', 30)).toBe('2026-12-22');
    expect(deriveExpiryDate('2026-02-27', 2)).toBe('2026-03-01');
    expect(deriveExpiryDate('2026-01-15', 0)).toBe('');
    expect(deriveExpiryDate('2026-01-15', '')).toBe('');
    expect(deriveExpiryDate('', 365)).toBe('');
    expect(deriveExpiryDate('not-a-date', 365)).toBe('');
  });

  it('re-save round-trips: the restored expiry recomputes the stored days exactly', () => {
    expect(daysFromExpiry('2026-01-15', deriveExpiryDate('2026-01-15', 365))).toBe(365);
    expect(daysFromExpiry('2026-11-22', deriveExpiryDate('2026-11-22', 30))).toBe(30);
    expect(daysFromExpiry('2026-02-27', deriveExpiryDate('2026-02-27', 2))).toBe(2);
  });

  it('the linked-maintenance restore fills the expiry from date + stored days', () => {
    const start = MODAL_SRC.indexOf('if (linkedMaint) {');
    expect(start).toBeGreaterThan(-1);
    const end = MODAL_SRC.indexOf('if (linkedTire) {', start);
    expect(end).toBeGreaterThan(start);
    const block = MODAL_SRC.slice(start, end);
    expect(block).toContain('setMaintExpiryDate(');
    expect(block).toContain('linkedMaint.expectedLifespanDays');
    expect(block).toContain('getLocalDateString(editTransaction.date)');
    expect(block).toContain('maintDays > 0');
    // No stored days -> '' (never invent an expiry), and no linked
    // record -> the stale expiry from a previous open is cleared.
    expect(block).toContain("setMaintExpiryDate('')");
    expect(block).toContain("else if (resolvedModel === 'vehicle_service')");
  });

  it('a fresh open clears the expiry — never reuse the previous entry date', () => {
    expect(MODAL_SRC).toContain('Clear the expiry date on a new entry');
    expect(MODAL_SRC).toContain("setMaintExpiryDate('')");
  });

  it('new-record save and validation are unchanged', () => {
    expect(MODAL_SRC).toContain('if (!maintExpiryDate) {');
    expect(MODAL_SRC).toContain(
      'expectedLifespanDays: parseMyanmarNumber(maintLifespanDays) || 365,',
    );
    expect(MODAL_SRC).toContain('expectedLifespanKm: 0,');
  });

  it('AddMaintenanceModal already restored the expiry — it is untouched', () => {
    expect(MAINT_SRC).toContain('deriveExpiryDate');
    expect(MAINT_SRC).toContain('Prefill the expiry date on edit');
  });
});

/** The generated-note builder, mirrored from TransactionModal. */
function buildGeneratedNote(
  items: { name: string; quantity: number; amount: number; unit?: unknown }[],
): string {
  return items
    .filter((i) => i.name.trim())
    .map((i) => {
      const rawUnit = typeof i.unit === 'string' ? i.unit.trim() : '';
      const unitSuffix =
        rawUnit && rawUnit !== OTHER_MENU_UNIT ? ` ${displayMenuUnit(rawUnit)}` : '';
      const qtyPart = i.quantity > 1 ? ` x${i.quantity}` : '';
      return `${i.name.trim()}${qtyPart}${unitSuffix} (${formatMMK(i.amount)})`;
    })
    .join(' + ');
}

describe('generated shopping notes include the unit (v7.6.05b)', () => {
  it('unit sits after the quantity: old forms canonicalize, number-word customs strip to the bare form', () => {
    expect(
      buildGeneratedNote([{ name: 'ဆန်', quantity: 2, amount: 10000, unit: 'ခု' }]),
    ).toBe(`ဆန် x2 ခု (${formatMMK(10000)})`);
    expect(
      buildGeneratedNote([{ name: 'ဆန်', quantity: 2, amount: 10000, unit: 'တစ်ခု' }]),
    ).toBe(`ဆန် x2 ခု (${formatMMK(10000)})`);
    expect(
      buildGeneratedNote([{ name: 'ဆန်', quantity: 1, amount: 5000, unit: 'တစ်ပါကင်' }]),
    ).toBe(`ဆန် ပါကင် (${formatMMK(5000)})`);
    expect(
      buildGeneratedNote([{ name: 'ဆန်', quantity: 3, amount: 9000, unit: 'တစ်ဗူး' }]),
    ).toBe(`ဆန် x3 ဗူး (${formatMMK(9000)})`);
    expect(
      buildGeneratedNote([{ name: 'ဆီ', quantity: 2, amount: 6200, unit: 'လီတာ' }]),
    ).toBe(`ဆီ x2 လီတာ (${formatMMK(6200)})`);
  });

  it('missing, blank, or bare Other units contribute nothing — no invented default', () => {
    expect(
      buildGeneratedNote([{ name: 'ဆန်', quantity: 2, amount: 10000 }]),
    ).toBe(`ဆန် x2 (${formatMMK(10000)})`);
    expect(
      buildGeneratedNote([{ name: 'ဆန်', quantity: 2, amount: 10000, unit: '' }]),
    ).toBe(`ဆန် x2 (${formatMMK(10000)})`);
    expect(
      buildGeneratedNote([{ name: 'ဆန်', quantity: 2, amount: 10000, unit: '   ' }]),
    ).toBe(`ဆန် x2 (${formatMMK(10000)})`);
    expect(
      buildGeneratedNote([{ name: 'ဆန်', quantity: 1, amount: 5000, unit: 'အခြား' }]),
    ).toBe(`ဆန် (${formatMMK(5000)})`);
    // normalizeMenuUnit alone would invent the default here — the
    // builder must guard before calling it.
    expect(normalizeMenuUnit('')).toBe('ခု');
  });

  it('multi-item notes join with the same unit rule on every item', () => {
    expect(
      buildGeneratedNote([
        { name: 'ဆန်', quantity: 1, amount: 5000, unit: 'ခု' },
        { name: 'ဆီ', quantity: 2, amount: 6200, unit: 'လီတာ' },
        { name: 'ဆား', quantity: 1, amount: 800 },
      ]),
    ).toBe(
      `ဆန် ခု (${formatMMK(5000)}) + ဆီ x2 လီတာ (${formatMMK(6200)}) + ဆား (${formatMMK(800)})`,
    );
  });

  it('the helper is the only note-generation path and only writes the form draft', () => {
    expect(MODAL_SRC.match(/autoGenerateShoppingNote/g)).toHaveLength(2);
    expect(MODAL_SRC.match(/autoGenerateShoppingNote\(/g)).toBeNull();
    expect(MODAL_SRC.match(/formatMMK\(i\.amount\)/g)).toHaveLength(1);
    const start = MODAL_SRC.indexOf('const autoGenerateShoppingNote');
    expect(start).toBeGreaterThan(-1);
    const block = MODAL_SRC.slice(start, MODAL_SRC.indexOf('};', start) + 2);
    expect(block).toContain('displayMenuUnit(');
    expect(block).toContain('OTHER_MENU_UNIT');
    expect(block).toContain('setExtraNote(summary)');
    // The price-history note is display-time only and already carried
    // the unit — it is not a second generation path.
    expect(HISTORY_SRC).toContain('displayMenuUnit(item.unit)');
  });

  it('a generated note never equals the bare item name, so name + note both render (v7.6.02 dedup)', () => {
    const note = buildGeneratedNote([
      { name: 'ဆန်', quantity: 2, amount: 10000, unit: 'ခု' },
    ]);
    expect(note).not.toBe('ဆန်');
    expect(note.trim().toLowerCase()).not.toBe('ဆန်'.toLowerCase());
    // The dedup guard itself is unchanged: only a note that merely
    // repeats the single name is suppressed.
    expect(TXVIEW_SRC).toContain('noteRepeatsItemName');
    expect(TXVIEW_SRC).toContain(
      't.note.trim().toLowerCase() === unitQtyItemNames[0].toLowerCase()',
    );
  });
});

describe('price comparison carries per-record units (v7.6.05c)', () => {
  it('the record carries the unit and every ingestion site fills it', () => {
    const start = ANALYTICS_SRC.indexOf('interface ItemPurchaseRecord');
    const end = ANALYTICS_SRC.indexOf('interface ItemSummary', start);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(ANALYTICS_SRC.slice(start, end)).toContain('unit?: string;');
    const pushes = [...ANALYTICS_SRC.matchAll(/records\.push\(\{[\s\S]*?\}\);/g)].map(
      (m) => m[0],
    );
    expect(pushes).toHaveLength(3);
    expect(pushes[0]).toContain('unit: item.unit');
    expect(pushes[1]).toContain('unit: norm.unit || undefined');
    expect(pushes[2]).toContain('unit: norm.unit || undefined');
  });

  it('rows render the canonicalized unit, guarded so unit-less rows are unchanged', () => {
    expect(ANALYTICS_SRC).toContain(
      "import { SHOP_MENU_UNITS, displayMenuUnit, normalizeMenuUnit } from '../utils/shopMenuUpdate';",
    );
    expect(ANALYTICS_SRC).toContain('displayMenuUnit(log.unit)');
    const guardAt = ANALYTICS_SRC.indexOf('log.unit && log.unit.trim()');
    const displayAt = ANALYTICS_SRC.indexOf('displayMenuUnit(log.unit)');
    expect(guardAt).toBeGreaterThan(-1);
    expect(displayAt).toBeGreaterThan(guardAt);
  });

  it('display canonicalization: old forms, customs, and the missing-unit guard', () => {
    const badge = (unit: unknown): string =>
      typeof unit === 'string' && unit.trim() ? displayMenuUnit(unit) : '';
    expect(displayMenuUnit('တစ်ခု')).toBe('ခု');
    expect(displayMenuUnit('တစ်ကီလို')).toBe('ကီလို');
    expect(displayMenuUnit('တစ်ဗူး')).toBe('ဗူး');
    expect(displayMenuUnit('ဗူး')).toBe('ဗူး');
    expect(badge(undefined)).toBe('');
    expect(badge('')).toBe('');
    expect(badge('   ')).toBe('');
    expect(badge('တစ်ခု')).toBe('ခု');
  });

  it('no storage migration: the unit rides the read-time record, nothing is written', () => {
    expect(ANALYTICS_SRC).not.toContain('firestore');
    expect(ANALYTICS_SRC).not.toContain('firebase');
    expect(ANALYTICS_SRC).not.toContain('updateDoc');
    expect(ANALYTICS_SRC).not.toContain('setDoc');
  });
});

describe('version pins rolled forward to v7.6.22 (build 336)', () => {
  it('versionHistory + version.json agree, releasedAt present-only', () => {
    expect(CURRENT_APP_VERSION).toBe('v7.6.22');
    expect(CURRENT_BUILD_NUMBER).toBe(336);
    expect(VERSION_JSON.version).toBe('v7.6.22');
    expect(VERSION_JSON.buildNumber).toBe(336);
    expect(typeof VERSION_JSON.releasedAt).toBe('string');
    expect(VERSION_JSON.releasedAt.length).toBeGreaterThan(0);
  });

  it('the top history entry carries the neutral-open entry, no Admin strings', () => {
    const top = VERSION_HISTORY[0];
    expect(top.version).toBe('v7.6.22');
    expect(top.buildNumber).toBe(336);
    expect(top.releaseDate).toBe('2026-11-23');
    expect(top.tag).toBe('fix');
    expect(top.titleMy).toBe('VIP badge ဘေးမှာ လက်ကျန်ရက် ပြခြင်း');
    expect(top.titleEn).toBe('Remaining-days chip beside the VIP badge');
    expect(top.changesMy).toEqual([
      'VIP badge ဘေးမှာ Premium လက်ကျန်ရက်ကို ပြမည် — တစ်သက်တာဆို တစ်သက်တာ၊ ကျန်တာ ရက်နဲ့ ပြမည်',
    ]);
    expect(top.changesEn).toEqual([
      'Show the remaining Premium days beside the VIP badge — Lifetime for lifetime plans, days for the rest.',
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
