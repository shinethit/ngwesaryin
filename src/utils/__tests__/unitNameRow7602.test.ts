// [v7.6.02] Collapsed unit_qty rows show the item name in Line 3
// beside the note (name first, then the quoted note, then the
// x {qty}{unit} chip). Source-text assertions (same pattern as
// unitQtyUnit800.test.ts) — the components have no test renderer
// in this repo (vitest node env, no testing-library); the render
// rule itself is mirrored exactly below and layout behaviour is
// verified by renders.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  VERSION_HISTORY,
  CURRENT_APP_VERSION,
  CURRENT_BUILD_NUMBER,
} from '../../data/versionHistory';

const TXVIEW_SRC = readFileSync(
  new URL('../../components/TransactionsView.tsx', import.meta.url),
  'utf8',
);
const MODAL_SRC = readFileSync(
  new URL('../../components/TransactionModal.tsx', import.meta.url),
  'utf8',
);
const HISTORY_SRC = readFileSync(
  new URL('../../components/ItemPriceHistoryModal.tsx', import.meta.url),
  'utf8',
);
const CAL_SRC = readFileSync(
  new URL('../../components/SmartCalendarCard.tsx', import.meta.url),
  'utf8',
);
const VERSION_JSON = JSON.parse(
  readFileSync(new URL('../../../public/version.json', import.meta.url), 'utf8'),
);

interface RowItem {
  name: string;
  quantity?: number;
  unit?: string;
}

interface RowShape {
  unitPrice?: number;
  note?: string;
  items?: RowItem[];
}

/** The Line 3 rule, copied expression-for-expression from TransactionsView. */
function line3Rule(t: RowShape): { label: string; suppressNote: boolean } {
  const unitQtyItemNames = t.unitPrice
    ? (t.items || [])
        .map((it) => (it.name || '').trim())
        .filter((n) => n.length > 0)
    : [];
  const unitQtyItemLabel =
    unitQtyItemNames.length === 0
      ? ''
      : unitQtyItemNames.length === 1
        ? unitQtyItemNames[0]
        : `${unitQtyItemNames[0]} +${unitQtyItemNames.length - 1} မျိုး`;
  const noteRepeatsItemName =
    unitQtyItemNames.length === 1 &&
    !!t.note &&
    t.note.trim().toLowerCase() === unitQtyItemNames[0].toLowerCase();
  return { label: unitQtyItemLabel, suppressNote: noteRepeatsItemName };
}

describe('collapsed unit_qty row shows the item name beside the note (v7.6.02)', () => {
  it('name differs from the note: both render, name first', () => {
    const r = line3Rule({
      unitPrice: 5000,
      note: 'နားထည့်ဆေးရည်',
      items: [{ name: 'နားထည့်ဆေးရည် (ညဘက်)', quantity: 1, unit: 'ခု' }],
    });
    // The note merely contains the name here, so both must show.
    expect(r.label).toBe('နားထည့်ဆေးရည် (ညဘက်)');
    expect(r.suppressNote).toBe(false);
  });

  it('name differs from the note (screenshot shape): name + quoted note + chip', () => {
    const r = line3Rule({
      unitPrice: 5000,
      note: 'ညဘက်သုံး',
      items: [{ name: 'နားထည့်ဆေးရည်', quantity: 1, unit: 'ခု' }],
    });
    expect(r.label).toBe('နားထည့်ဆေးရည်');
    expect(r.suppressNote).toBe(false);
  });

  it('name equals the note exactly: name once, quoted note suppressed', () => {
    const r = line3Rule({
      unitPrice: 5000,
      note: 'နားထည့်ဆေးရည်',
      items: [{ name: 'နားထည့်ဆေးရည်', quantity: 1, unit: 'ခု' }],
    });
    expect(r.label).toBe('နားထည့်ဆေးရည်');
    expect(r.suppressNote).toBe(true);
  });

  it('dedup is trim + case-insensitive: whitespace and case variants suppress', () => {
    expect(
      line3Rule({
        unitPrice: 5000,
        note: '  နားထည့်ဆေးရည်  ',
        items: [{ name: 'နားထည့်ဆေးရည်', quantity: 1, unit: 'ခု' }],
      }).suppressNote,
    ).toBe(true);
    expect(
      line3Rule({
        unitPrice: 5000,
        note: '  vitamin c ',
        items: [{ name: 'Vitamin C', quantity: 1, unit: 'ဗူး' }],
      }).suppressNote,
    ).toBe(true);
    expect(
      line3Rule({
        unitPrice: 5000,
        note: 'VITAMIN C',
        items: [{ name: 'vitamin c', quantity: 1, unit: 'ဗူး' }],
      }).suppressNote,
    ).toBe(true);
  });

  it('a note that merely contains the name is NOT suppressed', () => {
    const r = line3Rule({
      unitPrice: 5000,
      note: 'နားထည့်ဆေးရည် (ညဘက်)',
      items: [{ name: 'နားထည့်ဆေးရည်', quantity: 1, unit: 'ခု' }],
    });
    expect(r.label).toBe('နားထည့်ဆေးရည်');
    expect(r.suppressNote).toBe(false);
  });

  it('name present, no note: name shows, nothing to suppress', () => {
    const r = line3Rule({
      unitPrice: 5000,
      items: [{ name: 'နားထည့်ဆေးရည်', quantity: 1, unit: 'ခု' }],
    });
    expect(r.label).toBe('နားထည့်ဆေးရည်');
    expect(r.suppressNote).toBe(false);
  });

  it('empty / whitespace-only names: no name span, row unchanged', () => {
    expect(
      line3Rule({ unitPrice: 5000, note: 'မှတ်ချက်', items: [{ name: '' }] }).label,
    ).toBe('');
    expect(
      line3Rule({ unitPrice: 5000, items: [{ name: '   ' }] }).label,
    ).toBe('');
    expect(line3Rule({ unitPrice: 5000, items: [] }).label).toBe('');
    expect(line3Rule({ unitPrice: 5000 }).label).toBe('');
  });

  it('defensive multi-item case: first name + remaining count, blanks filtered', () => {
    expect(
      line3Rule({
        unitPrice: 5000,
        items: [
          { name: 'အင်ဂျင်ဝိုင်', quantity: 1 },
          { name: 'ဘရိတ်', quantity: 1 },
          { name: 'ဖီလ်တာ', quantity: 1 },
        ],
      }).label,
    ).toBe('အင်ဂျင်ဝိုင် +2 မျိုး');
    expect(
      line3Rule({
        unitPrice: 5000,
        items: [{ name: 'အင်ဂျင်ဝိုင်' }, { name: '  ' }, { name: 'ဘရိတ်' }],
      }).label,
    ).toBe('အင်ဂျင်ဝိုင် +1 မျိုး');
    // Multi-name rows never dedup against the note: the displayed
    // label carries the +N suffix, so it cannot equal the note.
    expect(
      line3Rule({
        unitPrice: 5000,
        note: 'အင်ဂျင်ဝိုင်',
        items: [{ name: 'အင်ဂျင်ဝိုင်' }, { name: 'ဘရိတ်' }],
      }).suppressNote,
    ).toBe(false);
  });
});

describe('the name renders only in the unitPrice branch (v7.6.02)', () => {
  it('shopping-list and direct rows get no name label', () => {
    // No unitPrice: the shopping branch — items exist but the label
    // stays empty, so the buttons render exactly as before.
    expect(
      line3Rule({
        note: 'ဆန်',
        items: [
          { name: 'ဆန်', quantity: 2 },
          { name: 'ဆီ', quantity: 1 },
        ],
      }).label,
    ).toBe('');
    // Direct mode has no unitPrice and no items: nothing to label.
    expect(line3Rule({ note: 'ထမင်း' }).label).toBe('');
  });

  it('source: the name span sits in Line 3 before the note span and the chip', () => {
    const nameIdx = TXVIEW_SRC.indexOf('{unitQtyItemLabel && (');
    expect(nameIdx).toBeGreaterThan(-1);
    const noteIdx = TXVIEW_SRC.indexOf('"{t.note}"', nameIdx);
    expect(noteIdx).toBeGreaterThan(nameIdx);
    const chipIdx = TXVIEW_SRC.indexOf('x {t.items[0]?.quantity', noteIdx);
    expect(chipIdx).toBeGreaterThan(noteIdx);
    // The name span is plain text: semibold slate, not italic, not quoted.
    const nameSpan = TXVIEW_SRC.slice(nameIdx, TXVIEW_SRC.indexOf('</span>', nameIdx));
    expect(nameSpan).toContain('text-slate-700 font-semibold text-[11px]');
    expect(nameSpan).not.toContain('italic');
    expect(nameSpan).not.toContain('"{');
    // The quoted note span is suppressed exactly when it repeats the name.
    expect(TXVIEW_SRC).toContain('t.note && !noteRepeatsItemName && (');
    expect(TXVIEW_SRC).toContain(
      't.note.trim().toLowerCase() === unitQtyItemNames[0].toLowerCase()',
    );
    // The label is gated on unitPrice: shopping rows never reach it.
    expect(TXVIEW_SRC).toContain('const unitQtyItemNames = t.unitPrice');
  });

  it('source: shopping buttons and the unit_qty chip are unchanged', () => {
    expect(TXVIEW_SRC).toContain('ဈေးနှိုင်းယှဉ်');
    expect(TXVIEW_SRC).toContain('စျေးဝယ်စာရင်း');
    expect(TXVIEW_SRC).toContain('displayMenuUnit(t.items[0]?.unit)');
    expect(TXVIEW_SRC).toContain('t.items[0]?.unit.trim()');
    // hasLine3Content needs no change: items already gate Line 3.
    expect(TXVIEW_SRC).toContain('!!t.note ||');
    expect(TXVIEW_SRC).toContain('(t.items && t.items.length > 0) ||');
  });

  it('sweep: Smart Calendar still shows item names; HistoryModal note fix intact', () => {
    expect(CAL_SRC).toContain('formatCalendarDetailItems(t.items, lang)');
    expect(HISTORY_SRC).toContain('displayMenuUnit(item.unit)');
    expect(HISTORY_SRC).not.toContain('x${item.quantity} ခု');
    // The saved-note generator now includes each item's unit (v7.6.05);
    // its name x quantity shape is unchanged.
    expect(MODAL_SRC).toContain('autoGenerateShoppingNote');
    expect(MODAL_SRC).toContain('x${i.quantity}');
  });
});

describe('version identity 7.6.02 — fix-script guard is raw string equality (renumber)', () => {
  // Mirrors the generated fix script's guard in shape:
  //   pkgVersion !== FROM_VERSION && pkgVersion !== TO_VERSION → fail.
  // FROM_VERSION / TO_VERSION are plain strings read from package.json;
  // no parseInt / tuple / semver normalization anywhere in the guard.
  const FROM_VERSION = '7.6.01';
  const TO_VERSION = '7.6.02';
  const guardFails = (pkgVersion: string): boolean =>
    pkgVersion !== FROM_VERSION && pkgVersion !== TO_VERSION;
  // The mangled form a numeric normalizer would produce — built from
  // TO_VERSION, never written as a literal, so the shipped identity can
  // never be confused with it by a grep or by the guard.
  const mangled = TO_VERSION.split('.').map(Number).join('.');

  it('numeric normalization would mangle the 02 segment, so it must never be used', () => {
    expect(mangled).not.toBe(TO_VERSION);
    expect(TO_VERSION).toBe('7.6.02');
  });

  it('accepts exactly 7.6.01 (fresh run) and exactly 7.6.02 (re-run)', () => {
    expect(guardFails('7.6.01')).toBe(false);
    expect(guardFails('7.6.02')).toBe(false);
  });

  it('rejects the mangled form and anything else', () => {
    expect(guardFails(mangled)).toBe(true);
    expect(guardFails('7.6.01 ')).toBe(true);
    expect(guardFails('')).toBe(true);
  });

  it('the shipped identity is 7.6.08 in every version surface', () => {
    expect(CURRENT_APP_VERSION).toBe('v7.6.08');
    expect(CURRENT_BUILD_NUMBER).toBe(322);
    expect(VERSION_JSON.version).toBe('v7.6.08');
    expect(VERSION_JSON.buildNumber).toBe(322);
  });
});

describe('app update check detects 7.6.02 over 7.6.01 (renumber)', () => {
  // Mirrors the two live paths exactly:
  //  VersionHistoryModal.tsx:60 — cloudV !== CURRENT_APP_VERSION || cloudB > CURRENT_BUILD_NUMBER
  //  App.tsx:622-623 — cloudVersion === CURRENT_APP_VERSION → return;
  //  cloudBuild <= CURRENT_BUILD_NUMBER → return
  const modalDetects = (cloudV: string, cloudB: number, localV: string, localB: number): boolean =>
    cloudV !== localV || cloudB > localB;
  const bootDetects = (cloudV: string, cloudB: number, localV: string, localB: number): boolean => {
    if (cloudV === localV) return false;
    if (cloudB && cloudB <= localB) return false;
    return true;
  };

  it('7.6.02 / build 316 over 7.6.01 / build 315 is an update in both paths', () => {
    expect(modalDetects('v7.6.02', 316, 'v7.6.01', 315)).toBe(true);
    expect(bootDetects('v7.6.02', 316, 'v7.6.01', 315)).toBe(true);
  });

  it('same version and build is not an update in either path', () => {
    expect(modalDetects('v7.6.02', 316, 'v7.6.02', 316)).toBe(false);
    expect(bootDetects('v7.6.02', 316, 'v7.6.02', 316)).toBe(false);
  });
});

describe('Version bump to v7.6.08 (build 322)', () => {
  it('version constants and history entry match version.json', () => {
    expect(CURRENT_APP_VERSION).toBe('v7.6.08');
    expect(CURRENT_BUILD_NUMBER).toBe(322);
    expect(VERSION_JSON.version).toBe('v7.6.08');
    expect(VERSION_JSON.buildNumber).toBe(322);
    const entry = VERSION_HISTORY[0];
    expect(entry.version).toBe('v7.6.08');
    expect(entry.buildNumber).toBe(322);
    expect(entry.releaseDate).toBe('2026-11-22');
    expect(entry.tag).toBe('fix');
    expect(entry.titleMy).toBe('ပုံမှန်ထက် အသုံးများခြင်း သတိပေးချက်');
    expect(entry.titleEn).toBe('Unusually high spending alert');
    expect(entry.changesMy).toEqual(VERSION_JSON.changesMy);
    expect(entry.changesEn).toEqual(VERSION_JSON.changesEn);
    expect(entry.changesMy).toHaveLength(1);
    expect(entry.changesEn).toHaveLength(1);
    expect(entry.changesMy[0]).toBe(
      'ပုံမှန်ထက် အသုံးများရင် သတိပေးခြင်း — အမျိုးအစားအလိုက် ဒီအပတ် သုံးငွေ ပြီးခဲ့တဲ့ ၄ ပတ်ပျမ်းမျှထက် ၂ ဆများရင် အသိပေးချက် စာမျက်နှာမှာ ပြပြီး ခေါင်းလောင်းအမှတ်မှာ ရေတွက်မည်',
    );
    expect(entry.changesEn[0]).toBe(
      'Anomaly alerts — when this week\'s spend in a category is at least twice its 4-week weekly average, it appears in Notifications and counts on the bell badge.',
    );
  });

  it('change log has no Admin content and releasedAt is present-only', () => {
    expect(VERSION_JSON.changesMy.join(' ')).not.toContain('Admin');
    expect(VERSION_JSON.changesEn.join(' ')).not.toContain('Admin');
    expect(JSON.stringify(VERSION_HISTORY[0])).not.toContain('Admin');
    expect(typeof VERSION_JSON.releasedAt).toBe('string');
    expect(VERSION_JSON.releasedAt.length).toBeGreaterThan(0);
  });
});
