// [v7.5.94] Vehicle text fixes + calendar detail rows + tire-pressure
// tiles. Source-text assertions (same pattern as priceCompare788.test.ts)
// — the components have no test renderer in this repo (vitest node env,
// no testing-library); layout and tile behaviour are verified by renders.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  VERSION_HISTORY,
  CURRENT_APP_VERSION,
  CURRENT_BUILD_NUMBER,
} from '../../data/versionHistory';

const SUMMARY_SRC = readFileSync(
  new URL(
    '../../components/vehicles/VehicleCostSummaryCard.tsx',
    import.meta.url,
  ),
  'utf8',
);
const VEHICLES_SRC = readFileSync(
  new URL('../../components/vehicles/VehiclesView.tsx', import.meta.url),
  'utf8',
);
const CALENDAR_SRC = readFileSync(
  new URL('../../components/SmartCalendarCard.tsx', import.meta.url),
  'utf8',
);
const MODAL_SRC = readFileSync(
  new URL('../../components/TransactionModal.tsx', import.meta.url),
  'utf8',
);
const VERSION_JSON = JSON.parse(
  readFileSync(new URL('../../../public/version.json', import.meta.url), 'utf8'),
);

describe('Vehicle cost values never truncate (v7.5.94 Fix A)', () => {
  it('summary fuel/service/tire values wrap instead of truncating', () => {
    expect(SUMMARY_SRC).toContain(
      'font-mono font-black text-amber-900 text-sm leading-tight break-words',
    );
    expect(SUMMARY_SRC).toContain(
      'font-mono font-black text-blue-900 text-sm leading-tight break-words',
    );
    expect(SUMMARY_SRC).toContain(
      'font-mono font-black text-teal-900 text-sm leading-tight break-words',
    );
    expect(SUMMARY_SRC).not.toContain('text-sm truncate');
  });

  it('grand total, cost/km and distance wrap instead of truncating', () => {
    expect(SUMMARY_SRC).toContain(
      'font-mono font-black text-lg text-emerald-300 leading-tight break-words',
    );
    expect(SUMMARY_SRC).toContain(
      'font-mono font-black text-lg text-indigo-900 leading-tight break-words',
    );
    expect(SUMMARY_SRC).toContain(
      'text-[11px] text-slate-500 mt-0.5 leading-tight break-words',
    );
    expect(SUMMARY_SRC).not.toContain('leading-none truncate');
  });

  it('exact-kyat tooltips and lakh formatting are untouched', () => {
    expect(SUMMARY_SRC).toContain('title={`${fuelTotal.toLocaleString()} MMK`}');
    expect(SUMMARY_SRC).toContain('title={`${maintTotal.toLocaleString()} MMK`}');
    expect(SUMMARY_SRC).toContain('title={`${tireTotal.toLocaleString()} MMK`}');
    expect(SUMMARY_SRC).toContain('title={`${grandTotal.toLocaleString()} MMK`}');
    expect(SUMMARY_SRC).toContain('formatLakhs(fuelTotal, lang)');
    expect(SUMMARY_SRC).toContain('formatLakhs(grandTotal, lang)');
  });

  it('VehiclesView fuel-cost stat value wraps instead of truncating', () => {
    expect(VEHICLES_SRC).toContain(
      'text-base font-black font-mono text-emerald-800 leading-tight break-words',
    );
    expect(VEHICLES_SRC).not.toContain(
      'text-emerald-800 leading-none truncate',
    );
  });
});

describe('Vehicle action buttons and tabs fit 390px (v7.5.94 Fixes B/C)', () => {
  it('action buttons and Guide are wider with larger tap targets', () => {
    expect(VEHICLES_SRC).toContain(
      'px-3.5 py-3.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold',
    );
    expect(VEHICLES_SRC).toContain(
      'px-3.5 py-3.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold',
    );
    expect(VEHICLES_SRC).toContain(
      'px-3.5 py-3.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold',
    );
    expect(VEHICLES_SRC).toContain('active:scale-95 shrink-0');
    expect(VEHICLES_SRC).not.toContain('px-2.5 py-3 bg-amber-500');
    expect(VEHICLES_SRC).not.toContain('px-2.5 py-3 bg-blue-600');
    expect(VEHICLES_SRC).not.toContain('px-2.5 py-3 bg-teal-600');
  });

  it('button labels are untouched', () => {
    expect(VEHICLES_SRC).toContain("'+ ဆီထည့်မည်'");
    expect(VEHICLES_SRC).toContain("'+ Add Fuel'");
    expect(VEHICLES_SRC).toContain("'+ ဝန်ဆောင်မှု'");
    expect(VEHICLES_SRC).toContain("'+ လေချိန်မည်'");
  });

  it('preset chips use the wider text-xs treatment', () => {
    expect(SUMMARY_SRC).toContain('px-3.5 py-3 rounded-lg text-xs font-bold');
    expect(SUMMARY_SRC).not.toContain(
      'px-2.5 py-3 rounded-lg text-[11px] font-bold',
    );
  });

  it('tabs row wraps and tab buttons shrink on phones', () => {
    expect(VEHICLES_SRC).toContain(
      'flex flex-wrap items-center gap-1 bg-slate-100 p-1.5 rounded-2xl w-full sm:w-fit',
    );
    const tabButtons = VEHICLES_SRC.split('px-3 sm:px-4 py-3').length - 1;
    expect(tabButtons).toBe(3);
  });
});

describe('Smart Calendar detail rows (v7.5.94 Fix D)', () => {
  it('header names sub-category and details', () => {
    expect(CALENDAR_SRC).toContain('အမျိုးအစားခွဲ / အသေးစိတ်');
    expect(CALENDAR_SRC).toContain('Sub-category / Details');
    expect(CALENDAR_SRC).not.toContain('အမျိုးအစား / မှတ်ချက်');
    expect(CALENDAR_SRC).not.toContain('Category / Note');
  });

  it('rows resolve the main label and item line via the helpers', () => {
    expect(CALENDAR_SRC).toContain('resolveCalendarDetailMainLabel');
    expect(CALENDAR_SRC).toContain('resolveCalendarDetailLine');
    expect(CALENDAR_SRC).toContain('{detailMainLabel}');
    expect(CALENDAR_SRC).toContain('{detailItemsLine}');
  });

  it('item line is plain data; the note fallback keeps its quotes and italics', () => {
    expect(CALENDAR_SRC).toContain('"{t.note}"');
    expect(CALENDAR_SRC).toContain('truncate italic');
  });
});

describe('Tire-pressure tiles stay visible (v7.5.94 Fix E)', () => {
  // [v7.6.03] SUPERSEDES the v7.5.94 gating: the tiles now render
  // only once a vehicle entry path is chosen (entryModel off
  // 'general'), so on 'general' the top selector is the only entry
  // point. Create-only and edit-hidden are unchanged.
  it('tiles are gated on create-only and on a chosen vehicle model', () => {
    expect(MODAL_SRC).toContain(
      "isVehicleRelatedCategory && !isEditing && entryModel !== 'general' && (",
    );
    expect(MODAL_SRC).not.toContain('isVehicleRelatedCategory && !isEditing && (');
    expect(MODAL_SRC).not.toContain(
      'isVehicleRelatedCategory && entryModel === "general" && (',
    );
  });

  // [v7.6.14] SUPERSEDES the no-op reading: tapping the
  // already-selected tile now toggles back to a neutral general
  // entry (toggleOffVehicleMode). The active ring stays.
  it('the current mode tile toggles off and renders active', () => {
    expect(MODAL_SRC).toContain(
      'if (entryModel === "fuel") toggleOffVehicleMode(); else handleSwitchModel("fuel")',
    );
    expect(MODAL_SRC).toContain(
      'if (entryModel === "tire_pressure") toggleOffVehicleMode(); else handleSwitchModel("tire_pressure")',
    );
    expect(MODAL_SRC).not.toContain('is a no-op');
    expect(MODAL_SRC).toContain('ring-2 ring-emerald-500');
    expect(MODAL_SRC).toContain('ring-2 ring-blue-500');
    expect(MODAL_SRC).toContain('ring-2 ring-amber-500');
    expect(MODAL_SRC).toContain('ring-2 ring-teal-500');
  });

  it('tile handlers and labels are otherwise unchanged', () => {
    expect(MODAL_SRC).toContain('setMaintServiceType("tires")');
    expect(MODAL_SRC).toContain("lang === 'my' ? 'တာယာလဲလှယ်' : 'Tire Replace'");
    expect(MODAL_SRC).toContain("lang === 'my' ? 'လေချိန်' : 'Pressure'");
  });

  it('switcher label matches the dropdown tire wording; banner untouched', () => {
    expect(MODAL_SRC).toContain("'🛞 တာယာ လဲလှယ်' : '🛞 Tire Replacement'");
    expect(MODAL_SRC).toContain("'🛞 တာယာ Mode' : '🛞 Tire Mode'");
  });

  it('handleSwitchModel and the dropdown fallback are unchanged', () => {
    expect(MODAL_SRC).toContain(
      'const handleSwitchModel = (newModel: EntryModel) => {',
    );
    expect(MODAL_SRC).toContain("lang === 'my' ? 'လေချိန် (PSI)' : 'Tire Pressure (PSI)'");
  });
});

describe('Version bump to v7.6.21 (build 335)', () => {
  it('version constants and history entry match version.json', () => {
    expect(CURRENT_APP_VERSION).toBe('v7.6.21');
    expect(CURRENT_BUILD_NUMBER).toBe(335);
    expect(VERSION_JSON.version).toBe('v7.6.21');
    expect(VERSION_JSON.buildNumber).toBe(335);
    const entry = VERSION_HISTORY[0];
    expect(entry.version).toBe('v7.6.21');
    expect(entry.buildNumber).toBe(335);
    expect(entry.releaseDate).toBe('2026-11-23');
    expect(entry.tag).toBe('fix');
    expect(entry.changesMy).toEqual(VERSION_JSON.changesMy);
    expect(entry.changesEn).toEqual(VERSION_JSON.changesEn);
    expect(entry.changesMy).toHaveLength(1);
    expect(entry.changesEn).toHaveLength(1);
  });

  it('change log has no Admin content and releasedAt is present', () => {
    expect(VERSION_JSON.changesMy.join(' ')).not.toContain('Admin');
    expect(VERSION_JSON.changesEn.join(' ')).not.toContain('Admin');
    expect(typeof VERSION_JSON.releasedAt).toBe('string');
    expect(VERSION_JSON.releasedAt.length).toBeGreaterThan(0);
  });
});
