// [v7.5.96] Duplicated vehicle pills, range caption, and Records Add
// button removed. Source-text assertions (same pattern as
// vehicleTextFixes794.test.ts) — the components have no test renderer
// in this repo (vitest node env, no testing-library); layout behaviour
// is verified by renders.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  VERSION_HISTORY,
  CURRENT_APP_VERSION,
  CURRENT_BUILD_NUMBER,
} from '../../data/versionHistory';

const VEHICLES_SRC = readFileSync(
  new URL('../../components/vehicles/VehiclesView.tsx', import.meta.url),
  'utf8',
);
const SUMMARY_SRC = readFileSync(
  new URL(
    '../../components/vehicles/VehicleCostSummaryCard.tsx',
    import.meta.url,
  ),
  'utf8',
);
const TX_SRC = readFileSync(
  new URL('../../components/TransactionsView.tsx', import.meta.url),
  'utf8',
);
const APP_SRC = readFileSync(
  new URL('../../App.tsx', import.meta.url),
  'utf8',
);
const VERSION_JSON = JSON.parse(
  readFileSync(new URL('../../../public/version.json', import.meta.url), 'utf8'),
);

// The Row 2 actions row: from its comment to the deactivated-vehicles
// section rendered right after the top bar. (The '[v7.5.55 C6]' text
// also appears in an earlier comment, so the bound is searched from
// the Row 2 start, at the '{deactivatedSection}' JSX that follows it.)
// Row 1 (the <select> picker) sits BEFORE this region, so a scoped
// assertion cannot mistake the picker's option map for the removed
// pills.
function row2Region(): string {
  const start = VEHICLES_SRC.indexOf('Row 2: Actions');
  const end = VEHICLES_SRC.indexOf('{deactivatedSection}', start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return VEHICLES_SRC.slice(start, end);
}

describe('Row 2 has no duplicated fleet list (v7.5.96 Fix 1)', () => {
  it('no fleet-pill map, fleet label, or + New pill in the actions row', () => {
    const row2 = row2Region();
    expect(row2).not.toContain('activeVehicles.map');
    expect(row2).not.toContain('ယာဉ်စာရင်း:');
    expect(row2).not.toContain('Fleet:');
    expect(row2).not.toContain("lang === 'my' ? 'သစ်' : 'New'");
    expect(row2).not.toContain('setSelectedVehicleId(v.id)');
    expect(row2).not.toContain('handleOpenAddVehicle');
  });

  it('the 3 action buttons + Guide button are still in Row 2', () => {
    const row2 = row2Region();
    expect(row2).toContain("'+ ဆီထည့်မည်'");
    expect(row2).toContain("'+ Add Fuel'");
    expect(row2).toContain("'+ ဝန်ဆောင်မှု'");
    expect(row2).toContain("'+ လေချိန်မည်'");
    expect(row2).toContain('setIsFuelGuideOpen(true)');
    expect(row2).toContain("lang === 'my' ? 'လမ်းညွှန်' : 'Guide'");
  });

  it('Row 1 select still offers add-new via __add_new__', () => {
    expect(VEHICLES_SRC).toContain('__add_new__');
    expect(VEHICLES_SRC).toContain("e.target.value === '__add_new__'");
    expect(VEHICLES_SRC).toContain('handleOpenAddVehicle()');
    expect(VEHICLES_SRC).toContain('setSelectedVehicleId(e.target.value)');
    expect(VEHICLES_SRC).toContain("➕ {lang === 'my' ? 'ယာဉ်အသစ်...'");
  });

  it('Row 1 Edit / Deactivate / Delete buttons are still present', () => {
    expect(VEHICLES_SRC).toContain('setEditingVehicle(currentVehicle)');
    expect(VEHICLES_SRC).toContain(
      "lang === 'my' ? 'ပြင်ဆင်ရန်' : 'Edit'",
    );
    expect(VEHICLES_SRC).toContain(
      'handleDeactivateVehicle(currentVehicle)',
    );
    expect(VEHICLES_SRC).toContain(
      "lang === 'my' ? 'ယာယီပိတ်ထားမည် (မှတ်တမ်းများ ကျန်မည်)'",
    );
    expect(VEHICLES_SRC).toContain(
      'handleDeleteVehicleAndClean(currentVehicle.id)',
    );
    expect(VEHICLES_SRC).toContain("lang === 'my' ? 'ဖျက်ရန်' : 'Delete'");
  });
});

describe('Range caption line is removed entirely (v7.5.96 Fix 2)', () => {
  it('the caption <p> and metricRangeCaption are absent', () => {
    expect(VEHICLES_SRC).not.toContain('metricRangeCaption');
    expect(VEHICLES_SRC).not.toContain('Range caption');
    expect(VEHICLES_SRC).not.toContain(
      'flex items-center gap-1.5 text-[11px] text-slate-500 px-1',
    );
  });

  it('stat-cards grid still present', () => {
    expect(VEHICLES_SRC).toContain(
      'grid grid-cols-2 lg:grid-cols-4 gap-2',
    );
  });

  it('cost-summary range controls still present and wired', () => {
    expect(VEHICLES_SRC).toContain('preset={costRangePreset}');
    expect(VEHICLES_SRC).toContain('onPresetChange={setCostRangePreset}');
    expect(SUMMARY_SRC).toContain('getRangeForPreset');
    expect(SUMMARY_SRC).toContain('RangePreset');
  });
});

describe('Records Add button removed, floating + kept (v7.5.96 Fix 3)', () => {
  it('TransactionsView has no button calling onAddTransaction', () => {
    expect(TX_SRC).not.toContain("onAddTransaction('expense')");
    expect(TX_SRC).not.toContain('onClick={() => onAddTransaction(');
  });

  it('the price-history button + filter row neighbours are intact', () => {
    expect(TX_SRC).toContain('setIsPriceHistoryOpen(true)');
    expect(TX_SRC).toContain("lang === 'my' ? 'ဈေးနှိုင်းယှဉ်' : 'Price Compare'");
  });

  it('the floating + still opens the add-transaction modal', () => {
    expect(APP_SRC).toContain('ClayFloatingCoinButton');
    expect(APP_SRC).toContain("handleOpenAddTx('expense')");
  });

  // [v7.6.18 B-03] TransactionsView's passthrough was dead (destructured,
  // never read; its own "+" affordances were removed in v7.5.96), so only
  // the WalletsView passthrough remains. Dashboard's own wiring is untouched.
  it('other views keep their onAddTransaction wiring untouched', () => {
    expect(APP_SRC).toContain(
      'onAddTransaction={(type) => handleOpenAddTx(type)}',
    );
    const passthroughs =
      APP_SRC.split('onAddTransaction={handleOpenAddTx}').length - 1;
    expect(passthroughs).toBe(1);
    expect(TX_SRC).not.toContain('onAddTransaction');
  });
});

describe('Version bump to v7.6.27 (build 342)', () => {
  it('version constants and history entry match version.json', () => {
    expect(CURRENT_APP_VERSION).toBe('v7.6.42');
    expect(CURRENT_BUILD_NUMBER).toBe(356);
    expect(VERSION_JSON.version).toBe('v7.6.42');
    expect(VERSION_JSON.buildNumber).toBe(356);
    const entry = VERSION_HISTORY[0];
    expect(entry.version).toBe('v7.6.42');
    expect(entry.buildNumber).toBe(356);
    expect(entry.releaseDate).toBe('2026-11-25');
    expect(entry.tag).toBe('fix');
    expect(entry.changesMy).toEqual(VERSION_JSON.changesMy);
    expect(entry.changesEn).toEqual(VERSION_JSON.changesEn);
    expect(entry.changesMy).toHaveLength(3);
    expect(entry.changesEn).toHaveLength(3);
  });

  it('change log has no Admin content and releasedAt is present', () => {
    expect(VERSION_JSON.changesMy.join(' ')).not.toContain('Admin');
    expect(VERSION_JSON.changesEn.join(' ')).not.toContain('Admin');
    expect(JSON.stringify(VERSION_HISTORY[0])).not.toContain('Admin');
    expect(typeof VERSION_JSON.releasedAt).toBe('string');
    expect(VERSION_JSON.releasedAt.length).toBeGreaterThan(0);
  });
});
