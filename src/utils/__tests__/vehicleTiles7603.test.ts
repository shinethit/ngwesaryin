// [v7.6.03] Vehicle entry tiles in one row, shown only once a
// vehicle entry is chosen, with the most-used type auto-selected
// once per fresh open. The counting rule itself lives in the pure
// helper (vehicleMostUsed.ts) and is tested directly here; the
// modal wiring is asserted by source text (same pattern as
// unitNameRow7602.test.ts) — the components have no test renderer
// in this repo (vitest node env, no testing-library).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolveMostUsedVehicleEntry } from '../vehicleMostUsed';
import type {
  FuelLog,
  TirePressureLog,
  Transaction,
  VehicleMaintenance,
} from '../../types';
import {
  VERSION_HISTORY,
  CURRENT_APP_VERSION,
  CURRENT_BUILD_NUMBER,
} from '../../data/versionHistory';

const MODAL_SRC = readFileSync(
  new URL('../../components/TransactionModal.tsx', import.meta.url),
  'utf8',
);
const HELPER_SRC = readFileSync(
  new URL('../vehicleMostUsed.ts', import.meta.url),
  'utf8',
);
const VERSION_JSON = JSON.parse(
  readFileSync(new URL('../../../public/version.json', import.meta.url), 'utf8'),
);

const fuelLog = (over: Partial<FuelLog> = {}): FuelLog => ({
  id: 'fuel-1',
  vehicleId: 'v1',
  date: '2026-11-20',
  odometer: 1000,
  liters: 10,
  pricePerLiter: 1000,
  totalCost: 10000,
  isFullTank: true,
  fuelType: 'Octane 92',
  syncToExpense: true,
  walletId: 'cash',
  userId: 'u1',
  createdAt: 100,
  ...over,
});

const maintRecord = (over: Partial<VehicleMaintenance> = {}): VehicleMaintenance => ({
  id: 'maint-1',
  vehicleId: 'v1',
  date: '2026-11-20',
  odometer: 1000,
  serviceType: 'engine_oil',
  title: 'Service',
  cost: 50000,
  syncToExpense: true,
  walletId: 'cash',
  userId: 'u1',
  createdAt: 100,
  ...over,
});

const tireLog = (over: Partial<TirePressureLog> = {}): TirePressureLog => ({
  id: 'tire-1',
  vehicleId: 'v1',
  date: '2026-11-20',
  userId: 'u1',
  createdAt: 100,
  ...over,
});

const tx = (over: Partial<Transaction> = {}): Transaction => ({
  id: 'tx-1',
  type: 'expense',
  amount: 10000,
  category: 'cat_vehicle',
  walletId: 'cash',
  date: '2026-11-20',
  createdAt: 100,
  ...over,
});

describe('resolveMostUsedVehicleEntry (v7.6.03)', () => {
  it('picks fuel when fuel logs are the most-used history', () => {
    expect(
      resolveMostUsedVehicleEntry({
        fuelLogs: [fuelLog({ id: 'f1' }), fuelLog({ id: 'f2' }), fuelLog({ id: 'f3' })],
        vehicleMaintenance: [maintRecord()],
      }),
    ).toBe('fuel');
  });

  it('picks service for non-tire maintenance records', () => {
    expect(
      resolveMostUsedVehicleEntry({
        fuelLogs: [fuelLog()],
        vehicleMaintenance: [
          maintRecord({ id: 'm1', serviceType: 'engine_oil' }),
          maintRecord({ id: 'm2', serviceType: 'battery' }),
        ],
      }),
    ).toBe('service');
  });

  it('picks service for license renewals (a vehicle_service entry, not tires)', () => {
    expect(
      resolveMostUsedVehicleEntry({
        fuelLogs: [fuelLog()],
        vehicleMaintenance: [
          maintRecord({ id: 'm1', serviceType: 'license_renewal' }),
          maintRecord({ id: 'm2', serviceType: 'license_renewal' }),
        ],
      }),
    ).toBe('service');
  });

  it('separates tire replacements by exact serviceType', () => {
    expect(
      resolveMostUsedVehicleEntry({
        fuelLogs: [fuelLog()],
        vehicleMaintenance: [
          maintRecord({ id: 'm1', serviceType: 'tires' }),
          maintRecord({ id: 'm2', serviceType: 'tires' }),
        ],
      }),
    ).toBe('tires');
  });

  it('picks tire pressure when pressure logs are the most-used history', () => {
    expect(
      resolveMostUsedVehicleEntry({
        fuelLogs: [fuelLog()],
        tirePressureLogs: [tireLog({ id: 't1' }), tireLog({ id: 't2' })],
      }),
    ).toBe('tire_pressure');
  });

  it('breaks a count tie by most recent activity (createdAt)', () => {
    expect(
      resolveMostUsedVehicleEntry({
        fuelLogs: [fuelLog({ createdAt: 100 })],
        vehicleMaintenance: [maintRecord({ createdAt: 200 })],
      }),
    ).toBe('service');
    expect(
      resolveMostUsedVehicleEntry({
        fuelLogs: [fuelLog({ createdAt: 300 })],
        vehicleMaintenance: [maintRecord({ createdAt: 200 })],
      }),
    ).toBe('fuel');
  });

  it('breaks a count tie by record date when createdAt is unusable', () => {
    expect(
      resolveMostUsedVehicleEntry({
        fuelLogs: [fuelLog({ createdAt: 0, date: '2026-11-20' })],
        vehicleMaintenance: [maintRecord({ createdAt: 0, date: '2026-11-21' })],
      }),
    ).toBe('service');
  });

  it('returns null when there is no history at all', () => {
    expect(resolveMostUsedVehicleEntry({})).toBeNull();
    expect(
      resolveMostUsedVehicleEntry({
        fuelLogs: [],
        vehicleMaintenance: [],
        tirePressureLogs: [],
        transactions: [],
      }),
    ).toBeNull();
  });

  it('does not double-count a transaction linked to a log', () => {
    // One fuel log + its linked expense transaction vs two service
    // records: without dedupe the fuel side would tie 2-2 and win
    // on recency (createdAt 500); deduped, service wins 2-1.
    expect(
      resolveMostUsedVehicleEntry({
        fuelLogs: [fuelLog({ id: 'f1', transactionId: 'tx-1', createdAt: 100 })],
        vehicleMaintenance: [
          maintRecord({ id: 'm1', createdAt: 50 }),
          maintRecord({ id: 'm2', createdAt: 60 }),
        ],
        transactions: [tx({ id: 'tx-1', isFuelLog: true, createdAt: 500 })],
      }),
    ).toBe('service');
  });

  it('does not double-count a maintenance transaction linked to a record', () => {
    expect(
      resolveMostUsedVehicleEntry({
        fuelLogs: [fuelLog({ createdAt: 400 })],
        vehicleMaintenance: [maintRecord({ id: 'm1', serviceType: 'tires', transactionId: 'tx-9', createdAt: 100 })],
        transactions: [
          tx({ id: 'tx-9', isMaintenanceLog: true, subCategoryId: 'sub_veh_tire', createdAt: 500 }),
        ],
      }),
    ).toBe('fuel');
  });

  it('counts unlinked fuel transactions as a secondary signal', () => {
    expect(
      resolveMostUsedVehicleEntry({
        vehicleMaintenance: [maintRecord()],
        transactions: [
          tx({ id: 'tx-a', isFuelLog: true }),
          tx({ id: 'tx-b', subCategoryId: 'sub_veh_fuel' }),
        ],
      }),
    ).toBe('fuel');
  });

  it('counts an unlinked maintenance transaction under the tire sub-category as tires', () => {
    expect(
      resolveMostUsedVehicleEntry({
        fuelLogs: [fuelLog()],
        transactions: [
          tx({ id: 'tx-a', isMaintenanceLog: true, subCategoryId: 'sub_veh_tire' }),
          tx({ id: 'tx-b', isMaintenanceLog: true, subCategoryId: 'sub_veh_tire' }),
        ],
      }),
    ).toBe('tires');
  });

  it('counts an unlinked maintenance transaction under a parts sub-category as service', () => {
    expect(
      resolveMostUsedVehicleEntry({
        fuelLogs: [fuelLog()],
        transactions: [
          tx({ id: 'tx-a', isMaintenanceLog: true, subCategoryId: 'sub_veh_parts' }),
          tx({ id: 'tx-b', subCategoryId: 'sub_veh_maintenance' }),
        ],
      }),
    ).toBe('service');
  });

  it('skips a bare sub_veh_tire transaction with no flag and no linked log', () => {
    // Tire-pressure checks and tire replacements share this
    // sub-category and the Transaction type has no pressure flag,
    // so the record is unclassifiable and must not be guessed at.
    expect(
      resolveMostUsedVehicleEntry({
        transactions: [tx({ subCategoryId: 'sub_veh_tire' })],
      }),
    ).toBeNull();
  });
});

describe('vehicle tiles: one row, gated on a chosen vehicle model (v7.6.03)', () => {
  // The tile block: from its render condition (just above the label)
  // through the transfer-category block that follows it.
  const labelIdx = MODAL_SRC.indexOf('ယာဉ် မှတ်တမ်း အမျိုးအစား ရွေးပါ:');
  const tileHead = MODAL_SRC.slice(Math.max(0, labelIdx - 400), labelIdx);
  const tileTail = MODAL_SRC.slice(labelIdx, MODAL_SRC.indexOf('isTransferCategory', labelIdx));

  it('tiles render only when a vehicle model is chosen, never on general, never while editing', () => {
    expect(tileHead).toContain("isVehicleRelatedCategory && !isEditing && entryModel !== 'general'");
  });

  it('tiles sit in a single 4-column row (no 2-column grid in the tile block)', () => {
    expect(tileTail).toContain('grid-cols-4');
    expect(tileTail).not.toContain('grid-cols-2');
  });

  it('all four labels stay in the tile block, with the selected-ring logic unchanged', () => {
    for (const label of ['ဆီဖိုး', 'ဝန်ဆောင်မှု', 'တာယာလဲလှယ်', 'လေချိန်']) {
      expect(tileTail).toContain(label);
    }
    for (const ring of [
      'ring-2 ring-emerald-500',
      'ring-2 ring-blue-500',
      'ring-2 ring-amber-500',
      'ring-2 ring-teal-500',
    ]) {
      expect(tileTail).toContain(ring);
    }
  });

  it('tile buttons keep a 44px minimum tap height', () => {
    expect(tileTail).toContain('min-h-11');
  });

  it('the top vehicle selector remains the entry point on general', () => {
    expect(MODAL_SRC).toContain("🚗 ယာဉ် မှတ်တမ်း");
    expect(MODAL_SRC).toContain('setMoreOpen(!moreOpen)');
  });
});

describe('auto-select wiring (v7.6.03)', () => {
  it('the modal imports the most-used helper', () => {
    expect(MODAL_SRC).toContain("from '../utils/vehicleMostUsed'");
    expect(MODAL_SRC).toContain('resolveMostUsedVehicleEntry');
  });

  it('the auto-select effect guards on fresh open, no edit, no explicit initial model', () => {
    const effectIdx = MODAL_SRC.indexOf('One-time auto-select of the most-used');
    expect(effectIdx).toBeGreaterThan(-1);
    const effect = MODAL_SRC.slice(effectIdx, effectIdx + 2400);
    expect(effect).toContain('if (!isOpen || isEditing) return;');
    expect(effect).toContain("if (initialModel && initialModel !== 'general') return;");
    expect(effect).toContain('if (autoSelectDoneRef.current) return;');
    expect(effect).toContain("if (entryModel !== 'general') return;");
    expect(effect).toContain('if (!isVehicleRelatedCategory) return;');
    expect(effect).toContain('autoSelectDoneRef.current = true;');
    expect(effect).toContain('autoSelectedRef.current = true;');
  });

  it('the auto-select switch uses the tile path, including tires', () => {
    const effectIdx = MODAL_SRC.indexOf('One-time auto-select of the most-used');
    const effect = MODAL_SRC.slice(effectIdx, effectIdx + 2400);
    expect(effect).toContain("handleSwitchModel('fuel')");
    expect(effect).toContain("handleSwitchModel('tire_pressure')");
    expect(effect).toContain("handleSwitchModel('vehicle_service')");
    expect(effect).toContain("setMaintServiceType('tires')");
  });

  it('a sub-category pick after auto-select still switches the model', () => {
    expect(MODAL_SRC).toContain(
      "if (entryModel !== 'general' && !autoSelectedRef.current) return;",
    );
  });

  it('manual tile taps clear the auto-selected state', () => {
    const labelIdx = MODAL_SRC.indexOf('ယာဉ် မှတ်တမ်း အမျိုးအစား ရွေးပါ:');
    const tileTail = MODAL_SRC.slice(labelIdx, MODAL_SRC.indexOf('isTransferCategory', labelIdx));
    expect(tileTail).toContain('autoSelectedRef.current = false');
    expect(tileTail).toContain('autoSelectDoneRef.current = true');
  });

  it('the helper documents the counting rule, tie-break and the ambiguous case', () => {
    expect(HELPER_SRC).toContain('Tie: the tied type with the most recent activity wins');
    expect(HELPER_SRC).toContain('double-count');
    expect(HELPER_SRC).toContain('cannot be told apart');
  });
});

describe('Version bump to v7.6.27 (build 342)', () => {
  it('current version is v7.6.27 / build 341 in every surface', () => {
    expect(CURRENT_APP_VERSION).toBe('v7.6.47');
    expect(CURRENT_BUILD_NUMBER).toBe(361);
    expect(VERSION_JSON.version).toBe('v7.6.47');
    expect(VERSION_JSON.buildNumber).toBe(361);
    // releasedAt is never rewritten by a version bump — assert only
    // that it is present (its exact value differs per machine).
    expect(typeof VERSION_JSON.releasedAt).toBe('string');
    expect(VERSION_JSON.releasedAt.length).toBeGreaterThan(0);
  });

  it('top history entry is the v7.6.24 fix entry with no Admin mention', () => {
    const entry = VERSION_HISTORY[0];
    expect(entry.version).toBe('v7.6.47');
    expect(entry.buildNumber).toBe(361);
    expect(entry.releaseDate).toBe('2026-11-25');
    expect(entry.tag).toBe('feature');
    expect(entry.titleMy).toBe('ကဏ္ဍအိုင်ကွန် ရုပ်ပုံအသစ်များ');
    const entryText = JSON.stringify(entry);
    expect(entryText).not.toContain('Admin');
    expect(entry.changesMy).toEqual(VERSION_JSON.changesMy);
    expect(entry.changesEn).toEqual(VERSION_JSON.changesEn);
    expect(entry.changesMy).toEqual([
      'ကဏ္ဍအိုင်ကွန်တွေကို ရုပ်ပုံအလှလေးတွေနဲ့ ပြပေးပါပြီ — ဝင်ငွေ/အသုံးစရိတ် ကဏ္ဍ ၁၇ ခုလုံးမှာ ကိုယ်ပိုင်အရုပ်ပုံပါတဲ့ စက်ဝိုင်းအိုင်ကွန်တွေ ပါလာပါပြီ',
      'မှတ်တမ်းစာရင်း၊ ကဏ္ဍရွေးချယ်မှု၊ အသေးစိတ်ကြည့်ရှုမှုနဲ့ ပြက္ခဒိန်တို့မှာ အိုင်ကွန်အသစ်တွေကို တစ်နေရာတည်း တသမတ်တည်း ပြပေးပါပြီ',
      'အိုင်ကွန်ရွေးချယ်တဲ့နေရာမှာ ရုပ်ပုံအိုင်ကွန်တွေကို အုပ်စုခွဲပြီး ပြပေးပါပြီ — ငွေ၊ အစားအသောက်၊ အိမ်/ဈေးဝယ်၊ ယာဉ်/ခရီး၊ ကျန်းမာရေး၊ ဖျော်ဖြေရေးတို့အလိုက် ရှာရလွယ်ပါပြီ',
      'ရုပ်ပုံအိုင်ကွန်အုပ်စုတွေကို အခြေခံအုပ်စု (Free) နဲ့ အထူးအုပ်စု (Premium) ဆိုပြီး ခွဲထားပါပြီ — အထူးအုပ်စုတွေကို နောက်ဗားရှင်းတွေမှာ ထပ်ထည့်ပေးပါမယ်',
      'Premium နဲ့ ရွေးထားတဲ့ အိုင်ကွန်က Premium သက်တမ်းကုန်သွားရင်လည်း ကဏ္ဍမှာ ဆက်ကျန်နေပါမယ် — ပြောင်းလိုက်မှသာ ပြန်ရွေးလို့ မရတော့ပါဘူး',
      'အိုင်ကွန်ရုပ်ပုံတွေကို အင်တာနက်မရှိလည်း ဖွင့်လို့ရအောင် ဖုန်းထဲမှာ သိမ်းထားပေးပါပြီ',
      'အိုင်ကွန်ဟောင်း (ရိုးရိုးပုံလေးတွေ) ကိုလည်း ဆက်သုံးနိုင်ပါပြီ — ကိုယ်တိုင်ထည့်ထားတဲ့ ကဏ္ဍတွေမှာ အရင်အတိုင်း ပြပေးပါတယ်',
    ]);
    expect(entry.changesEn).toEqual([
      'Category icons are now colourful pictures — all 17 default income and expense categories have their own pictorial circle icon',
      'The new icons show consistently in the Records list, category picker, detail view and calendar',
      'The icon picker now groups pictorial icons into packs — money, food, home and shopping, vehicle and travel, health and charity, entertainment — so they are easy to find',
      'Pictorial icon packs are split into core packs (Free) and special packs (Premium); special packs will arrive in later versions',
      'An icon chosen while Premium stays on its category after Premium lapses — it only becomes unavailable again once you change away from it',
      'Icon pictures are saved on the phone so they still show without internet',
      'The classic plain icons still work too — custom categories keep showing them exactly as before',
    ]);
  });
});
