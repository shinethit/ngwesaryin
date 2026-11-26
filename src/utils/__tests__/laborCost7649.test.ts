// [v7.6.49] Service fee (labor) for vehicle maintenance: the
// visit-level fee folds into the FIRST per-type group only, so the
// groups' costs still sum to exactly parts + labor and the fee is
// never split or duplicated. Source pins prove both entry forms
// carry the labor field, both handlers use the shared helper, the
// history view shows the breakdown, and NO per-row-shop mechanism
// was added (the rescope: splits already cover multi-shop entries).
// Source reads use `new URL` — NO path comparisons.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  applyLaborCostToRowGroups,
  groupServiceRowsByType,
} from '../vehicleServiceRows';
import type { TransactionItem } from '../../types';
import {
  CURRENT_APP_VERSION,
  CURRENT_BUILD_NUMBER,
  VERSION_HISTORY,
} from '../../data/versionHistory';

const SRC = (rel: string) => readFileSync(new URL(rel, import.meta.url), 'utf8');

const TYPES_SRC = SRC('../../types.ts');
const MODAL_SRC = SRC('../../components/vehicles/AddMaintenanceModal.tsx');
const TXMODAL_SRC = SRC('../../components/TransactionModal.tsx');
const VH_SRC = SRC('../../hooks/useVehicleHandlers.ts');
const TH_SRC = SRC('../../hooks/useTransactionHandlers.ts');
const VIEW_SRC = SRC('../../components/vehicles/VehiclesView.tsx');
const ANALYTICS_SRC = SRC('../../utils/vehicleAnalytics.ts');

const row = (
  name: string,
  amount: number,
  serviceType: 'engine_oil' | 'air_filter',
): TransactionItem => ({
  id: `r_${name}`,
  name,
  price: amount,
  quantity: 1,
  amount,
  serviceType,
});

describe('applyLaborCostToRowGroups', () => {
  it('puts the whole fee on the first group: 80,000 parts + 20,000 labor = 100,000', () => {
    const groups = groupServiceRowsByType(
      [row('oil', 80000, 'engine_oil'), row('filter', 15000, 'air_filter')],
      'engine_oil',
    );
    const withLabor = applyLaborCostToRowGroups(groups, 20000);
    expect(withLabor).toHaveLength(2);
    expect(withLabor[0].cost).toBe(100000);
    expect(withLabor[0].laborCost).toBe(20000);
    expect(withLabor[1].cost).toBe(15000);
    expect(withLabor[1].laborCost).toBeUndefined();
    // Groups still sum to the visit total — no double count.
    expect(withLabor.reduce((s, g) => s + g.cost, 0)).toBe(115000);
  });

  it('a single group carries parts + labor as its record cost', () => {
    const groups = groupServiceRowsByType([row('oil', 80000, 'engine_oil')], 'engine_oil');
    const withLabor = applyLaborCostToRowGroups(groups, 20000);
    expect(withLabor[0].cost).toBe(100000);
    expect(withLabor[0].laborCost).toBe(20000);
  });

  it('zero / undefined / negative labor returns the groups untouched', () => {
    const groups = groupServiceRowsByType([row('oil', 80000, 'engine_oil')], 'engine_oil');
    expect(applyLaborCostToRowGroups(groups, 0)).toBe(groups);
    expect(applyLaborCostToRowGroups(groups, undefined)).toBe(groups);
    expect(applyLaborCostToRowGroups(groups, -5000)).toBe(groups);
    expect(groups[0].cost).toBe(80000);
    expect(groups[0].laborCost).toBeUndefined();
  });

  it('empty groups stay empty, and the input groups are not mutated', () => {
    expect(applyLaborCostToRowGroups([], 20000)).toEqual([]);
    const groups = groupServiceRowsByType([row('oil', 80000, 'engine_oil')], 'engine_oil');
    const before = groups[0].cost;
    applyLaborCostToRowGroups(groups, 20000);
    expect(groups[0].cost).toBe(before);
    expect(groups[0].laborCost).toBeUndefined();
  });
});

describe('labor cost wiring (source pins)', () => {
  it('the model carries laborCost on VehicleMaintenance and VehicleLinkData only', () => {
    expect(TYPES_SRC.match(/laborCost\?: number/g)).toHaveLength(2);
    expect(TYPES_SRC).toContain('// [v7.6.49] Service fee / labor charge');
  });

  it('AddMaintenanceModal has the labor field, live total and payload threading', () => {
    expect(MODAL_SRC).toContain('ဝန်ဆောင်ခ (လက်ခ)');
    expect(MODAL_SRC).toContain('const visitTotal = displayCost + laborNum;');
    expect(MODAL_SRC).toContain('laborCost: laborNum > 0 ? laborNum : undefined');
    expect(MODAL_SRC).toContain('setLaborCost(restoredLabor > 0 ? restoredLabor : \'\')');
  });

  it('TransactionModal has the labor field and adds it to the visit total + payload', () => {
    expect(TXMODAL_SRC).toContain('ဝန်ဆောင်ခ (လက်ခ)');
    expect(TXMODAL_SRC).toContain('const maintLaborNum = Math.max(0, parseMyanmarNumber(maintLaborCost) || 0);');
    // Labor joins the rows total ONLY when valid rows exist — the
    // no-valid-rows fallback keeps the typed total (which the live
    // handlers already include labor in), never double-counting.
    expect(TXMODAL_SRC).toContain("maintServiceType !== 'license_renewal' ? maintLaborNum : 0);");
    expect(TXMODAL_SRC).toContain('laborCost: maintLaborNum > 0 ? maintLaborNum : undefined');
  });

  it('both handlers use the shared helper and clear stale labor explicitly', () => {
    expect(VH_SRC).toContain('applyLaborCostToRowGroups');
    expect(TH_SRC).toContain('applyLaborCostToRowGroups');
    expect(VH_SRC).toContain('laborCost: deleteField()');
    expect(TH_SRC).toContain('delete updatedMaint.laborCost;');
    expect(TH_SRC).toContain('laborCost: deleteField()');
  });

  it('history cards show the parts + labor breakdown only when labor > 0', () => {
    expect(VIEW_SRC).toContain('(log.laborCost || 0) > 0');
    expect(VIEW_SRC).toContain('ပစ္စည်းဖိုး');
    expect(ANALYTICS_SRC).toContain('laborCost: m.laborCost');
  });

  it('no per-row-shop mechanism was added: TransactionItem carries no shop field', () => {
    // types.ts declares a shopName field only on Transaction and
    // TransactionSplit (the v7.6.41 split-row precedent) — never
    // on TransactionItem, and no workshop field on service rows.
    // (Anchored: workshopName must not count.)
    expect(TYPES_SRC.match(/^  shopName\?: string;/gm)).toHaveLength(2);
    const itemBlock = TYPES_SRC.slice(
      TYPES_SRC.indexOf('export interface TransactionItem'),
      TYPES_SRC.indexOf('export interface TransactionSplit'),
    );
    expect(itemBlock).not.toContain('shopName');
  });

  it('usePersistedState chains synchronous functional updates (edit delete + recreate)', () => {
    // [v7.6.49] The multi-row maintenance edit calls the persisted
    // setter twice in one handler (filter out the old records, then
    // prepend the recreated ones). The setter must advance its ref
    // synchronously or the first update is lost and the visit
    // duplicates. Pin the mechanism, not just the comment.
    const HOOK_SRC = SRC('../../hooks/usePersistedState.ts');
    expect(HOOK_SRC).toContain('stateRef.current = nextValue;');
    const setterBody = HOOK_SRC.slice(HOOK_SRC.indexOf('const setPersistedState'));
    expect(setterBody.indexOf('stateRef.current = nextValue;')).toBeLessThan(
      setterBody.indexOf('setState(nextValue);'),
    );
  });
});

describe('Version pins roll to v7.6.51 / build 365', () => {
  it('constants and the top history entry agree, with no Admin strings', () => {
    expect(CURRENT_APP_VERSION).toBe('v7.6.51');
    expect(CURRENT_BUILD_NUMBER).toBe(365);
    const VERSION_JSON = JSON.parse(
      readFileSync(new URL('../../../public/version.json', import.meta.url), 'utf8'),
    );
    expect(VERSION_JSON.version).toBe('v7.6.51');
    expect(VERSION_JSON.buildNumber).toBe(365);
    const top = VERSION_HISTORY[0];
    expect(top.version).toBe('v7.6.51');
    expect(top.buildNumber).toBe(365);
    expect(top.changesMy.join(' ')).not.toContain('Admin');
    expect(top.changesEn.join(' ')).not.toContain('Admin');
    expect(top.changesMy.length).toBe(2);
    expect(top.changesEn.length).toBe(2);
    expect(VERSION_JSON.changesMy).toEqual(top.changesMy);
    expect(VERSION_JSON.changesEn).toEqual(top.changesEn);
  });
});
