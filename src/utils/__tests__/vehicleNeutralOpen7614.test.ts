// [v7.6.14] Neutral fresh open + tiles-only vehicle selector.
// The form used to land straight in fuel/vehicle mode on every +
// tap: the vehicle check resolved through the most-used-category
// fallback even though nothing was picked yet. Vehicle mode now
// engages only from an explicitly picked category, the top Bar /
// Mode chip hide once a vehicle mode is engaged (the 4 tiles are
// the sole selector), and re-tapping the selected tile toggles
// back to a neutral general entry. Edit mode and explicit
// initialModel entry points are untouched. Source-text assertions
// (same pattern as vehicleTiles7603.test.ts) — the components
// have no test renderer in this repo (vitest node env, no
// testing-library). NO path comparisons in this file: sources
// are read via new URL(..., import.meta.url).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  VERSION_HISTORY,
  CURRENT_APP_VERSION,
  CURRENT_BUILD_NUMBER,
} from '../../data/versionHistory';

const MODAL_SRC = readFileSync(
  new URL('../../components/TransactionModal.tsx', import.meta.url),
  'utf8',
);
const VERSION_JSON = JSON.parse(
  readFileSync(new URL('../../../public/version.json', import.meta.url), 'utf8'),
);

// The vehicle memo: from its declaration through its dependency
// array (the heuristics body sits between the two).
const memoStart = MODAL_SRC.indexOf('const isVehicleRelatedCategory = useMemo');
const memoEnd =
  MODAL_SRC.indexOf('}, [type, explicitCatObj]', memoStart) + '}, [type, explicitCatObj]'.length;
const memoSrc = MODAL_SRC.slice(memoStart, memoEnd);

// The tile block: from its render condition (just above the label)
// through the transfer-category block that follows it.
const labelIdx = MODAL_SRC.indexOf('ယာဉ် မှတ်တမ်း အမျိုးအစား ရွေးပါ:');
const tileHead = MODAL_SRC.slice(Math.max(0, labelIdx - 400), labelIdx);
const tileTail = MODAL_SRC.slice(labelIdx, MODAL_SRC.indexOf('isTransferCategory', labelIdx));

// The toggle-off helper body.
const toggleStart = MODAL_SRC.indexOf('const toggleOffVehicleMode = () => {');
const toggleSrc = MODAL_SRC.slice(toggleStart, MODAL_SRC.indexOf('};', toggleStart));

// The fresh-open reset's general branch: from its condition to the
// closing else of the same if.
const generalBranchStart = MODAL_SRC.indexOf("if (resolvedModel === 'general') {");
const generalBranch = MODAL_SRC.slice(
  generalBranchStart,
  MODAL_SRC.indexOf('} else {', generalBranchStart),
);

describe('neutral fresh open: empty category never engages vehicle mode (v7.6.14)', () => {
  it('the vehicle check resolves from the explicitly picked category only', () => {
    expect(MODAL_SRC).toContain(
      'const explicitCatObj = categoryId ? categories.find((c) => c.id === categoryId) : undefined;',
    );
    expect(memoSrc).toContain('if (type !== \'expense\' || !explicitCatObj) return false;');
    expect(memoSrc).toContain('}, [type, explicitCatObj]');
    // The fallback object must not leak into the mode decision:
    // selectedCatObj keeps the fallback for read-only consumers
    // only (sub-category sort, suggestions), never for this memo.
    expect(memoSrc).not.toContain('selectedCatObj');
    expect(memoSrc).not.toContain('effectiveCategoryId');
    // The vehicle heuristics themselves are unchanged.
    expect(memoSrc).toContain("sid.startsWith('sub_veh_')");
    expect(memoSrc).toContain("id === 'cat_vehicle'");
  });

  it('the fresh-open general branch clears the category and switches no model', () => {
    expect(generalBranch).toContain("setCategoryId('');");
    expect(generalBranch).toContain("setSubCategoryId('');");
    expect(generalBranch).not.toContain('handleSwitchModel');
    expect(generalBranch).not.toContain('setEntryModel');
  });

  it('the auto-select effect re-runs when an explicit pick makes the category vehicle-related', () => {
    const effectIdx = MODAL_SRC.indexOf('One-time auto-select of the most-used');
    const effect = MODAL_SRC.slice(effectIdx, effectIdx + 2400);
    expect(effect).toContain('isVehicleRelatedCategory, fuelLogs, vehicleMaintenance');
    expect(effect).toContain('if (!isVehicleRelatedCategory) return;');
  });

  it('the category row still shows its empty placeholder when nothing is picked', () => {
    expect(MODAL_SRC).toContain("{categoryId ? (");
    expect(MODAL_SRC).toContain("lang === 'my' ? 'ကဏ္ဍ ရွေးရန်' : 'Select category'");
  });
});

describe('tiles-only selector in fresh-open vehicle mode (v7.6.14)', () => {
  it('the top Bar and the Mode chip hide once a vehicle mode is engaged', () => {
    expect(MODAL_SRC).toContain(
      'const inFreshVehicleMode = !isEditing && entryModel !== \'general\' && isVehicleRelatedCategory;',
    );
    expect(MODAL_SRC).toContain(
      '{(isVehicleRelatedCategory || showModelSelector) && !inFreshVehicleMode && (',
    );
    expect(MODAL_SRC).toContain(
      '{entryModel !== "general" && !inFreshVehicleMode && (',
    );
    // The hide condition never mentions initialModel: an explicit
    // initialModel open still gets the tiles-only selector.
    const hideDef = MODAL_SRC.slice(
      MODAL_SRC.indexOf('const inFreshVehicleMode'),
      MODAL_SRC.indexOf('const inFreshVehicleMode') + 120,
    );
    expect(hideDef).not.toContain('initialModel');
  });

  it('the Bar stays the entry point in the general state', () => {
    expect(MODAL_SRC).toContain("🚗 ယာဉ် မှတ်တမ်း");
    expect(MODAL_SRC).toContain('setMoreOpen(!moreOpen)');
  });

  it('the fuel guide stays reachable: once in the Bar, once in the tile header', () => {
    expect(MODAL_SRC.split('setShowFuelGuideModal(true)').length - 1).toBe(2);
    expect(tileTail).toContain('setShowFuelGuideModal(true)');
    expect(tileTail).toContain('HelpCircle');
  });

  it('the Mode chip close handler is preserved (it is the edit-mode exit)', () => {
    const chipIdx = MODAL_SRC.indexOf('✕ {lang');
    expect(chipIdx).toBeGreaterThan(-1);
    const chip = MODAL_SRC.slice(Math.max(0, chipIdx - 260), chipIdx);
    expect(chip).toContain('setEntryModel("general"); setIsVehicleLinkEnabled(false);');
  });
});

describe('toggle-off: re-tapping the selected tile returns to general (v7.6.14)', () => {
  it('the helper clears the model, the vehicle link and the category, and blocks re-engagement', () => {
    expect(toggleSrc).toContain("setEntryModel('general');");
    expect(toggleSrc).toContain('setIsVehicleLinkEnabled(false);');
    expect(toggleSrc).toContain("setCategoryId('');");
    expect(toggleSrc).toContain("setSubCategoryId('');");
    expect(toggleSrc).toContain('autoSelectedRef.current = false;');
    expect(toggleSrc).toContain('autoSelectDoneRef.current = true;');
  });

  it('every tile toggles off when it is already the selected one', () => {
    expect(tileTail).toContain('if (entryModel === "fuel") toggleOffVehicleMode();');
    expect(tileTail).toContain(
      'if (entryModel === "vehicle_service" && maintServiceType !== "tires") toggleOffVehicleMode();',
    );
    expect(tileTail).toContain(
      'if (entryModel === "vehicle_service" && maintServiceType === "tires") toggleOffVehicleMode();',
    );
    expect(tileTail).toContain('if (entryModel === "tire_pressure") toggleOffVehicleMode();');
    expect(tileTail.split('toggleOffVehicleMode()').length - 1).toBe(4);
    // The stale "no-op" reading is gone.
    expect(MODAL_SRC).not.toContain('is a no-op');
  });

  it('the tile gate still hides the tiles on general, so toggle-off hides them', () => {
    expect(tileHead).toContain("isVehicleRelatedCategory && !isEditing && entryModel !== 'general'");
  });
});

describe('edit mode and explicit initialModel entry points are untouched (v7.6.14)', () => {
  it('edit restores the category and the resolved model, and the tiles stay hidden', () => {
    expect(MODAL_SRC).toContain("setCategoryId(editTransaction.category || '');");
    expect(MODAL_SRC).toContain('setEntryModel(resolvedModel);');
    // The hide condition excludes editing, so the Bar / chip stay
    // the edit path exactly as before.
    expect(MODAL_SRC).toContain('const inFreshVehicleMode = !isEditing');
    expect(tileHead).toContain('!isEditing');
  });

  it('editing a fuel record restores its vehicle fields', () => {
    expect(MODAL_SRC).toContain("setFuelLiters(String(linkedFuel.liters || ''));");
    expect(MODAL_SRC).toContain("setFuelPricePerLiter(String(linkedFuel.pricePerLiter || ''));");
    expect(MODAL_SRC).toContain("setFuelType(linkedFuel.fuelType || 'Octane 92');");
  });

  it("an explicit initialModel='fuel' open still arms fuel mode exactly as today", () => {
    expect(MODAL_SRC).toContain("if (resolvedModel === 'fuel') {");
    // Anchor on the fresh-open reset (the edit branch has its own
    // resolvedModel arms above it and sets no category).
    const resetStart = MODAL_SRC.indexOf("const resolvedModel = initialModel || 'general';");
    const fuelBranch = MODAL_SRC.slice(
      MODAL_SRC.indexOf("if (resolvedModel === 'fuel') {", resetStart),
      MODAL_SRC.indexOf("} else if (resolvedModel === 'vehicle_service') {", resetStart),
    );
    expect(fuelBranch).toContain('setIsVehicleLinkEnabled(true);');
    expect(fuelBranch).toContain('if (vehCat) setCategoryId(vehCat.id);');
    expect(fuelBranch).toContain("setSubCategoryId('sub_veh_fuel');");
    expect(MODAL_SRC).toContain(
      "return isVehicleRelatedCategory || initialModel === 'fuel' || initialModel === 'vehicle_service';",
    );
  });
});

describe('Version bump to v7.6.27 (build 342)', () => {
  it('current version is v7.6.27 / build 341 in every surface', () => {
    expect(CURRENT_APP_VERSION).toBe('v7.6.60');
    expect(CURRENT_BUILD_NUMBER).toBe(374);
    expect(VERSION_JSON.version).toBe('v7.6.60');
    expect(VERSION_JSON.buildNumber).toBe(374);
    expect(typeof VERSION_JSON.releasedAt).toBe('string');
    expect(VERSION_JSON.releasedAt.length).toBeGreaterThan(0);
  });

  it('top history entry is the v7.6.18 fix entry with no Admin mention', () => {
    const entry = VERSION_HISTORY[0];
    expect(entry.version).toBe('v7.6.60');
    expect(entry.buildNumber).toBe(374);
    expect(entry.releaseDate).toBe('2026-11-27');
    expect(entry.tag).toBe('fix');
    expect(entry.titleMy).toBe('Sync အပေါက်တွေ ပိတ်ခြင်းနှင့် လက်ကျန်ကတ် အပြားလိုက် ပြင်ဆင်ခြင်း');
    expect(entry.titleEn).toBe('Sync delete-loss holes closed; balance card flat like the Hero');
    const entryText = JSON.stringify(entry);
    expect(entryText).not.toContain('Admin');
    expect(entry.changesMy).toEqual(VERSION_JSON.changesMy);
    expect(entry.changesEn).toEqual(VERSION_JSON.changesEn);
    expect(entry.changesMy).toEqual([
      'ပြင်နေရင်း ဖျက်လိုက်တဲ့ မှတ်တမ်းက Cloud ကို မရောက်ဘဲ ပျောက်သွားတဲ့ အပေါက်ကို ပိတ်လိုက်ပါပြီ',
      'Cloud က လက်ခံပြီးကြောင်း အတည်မပြုရသေးတဲ့ ပေးပို့မှုတွေကို ထပ်ပို့ပြီး အတည်ပြုချက်ရမှ ပြီးပြီလို့ သတ်မှတ်ပါပြီ',
      'တခြားစက်မှာ ဖျက်ထားတဲ့ အကြွေး၊ ပိုက်ဆံအိတ်၊ ဆိုင်၊ ယာဉ်မှတ်တမ်းတွေကို ဒီစက်က ပြန်တင်ပြီး ပြန်ပေါ်လာတာမျိုး မဖြစ်တော့ပါ',
      'Sync အသေးစိတ်မှာ Database Sync အပြည့်အစုံ ကြည့်တဲ့ ခလုတ် ပါလာပါပြီ — ပျောက်နေတဲ့ မှတ်တမ်းတွေ ပြန်ရှာတဲ့ လုပ်ဆောင်ချက်တွေ သုံးလို့ရပါပြီ',
      'အရောင်ပြေး (gradient) အောက်ခံကို ဖြုတ်ပြီး အပြားလိုက် အပြာရင့်ရောင် ပြန်ဖြစ်ပါပြီ',
      'အဓိကပမာဏနဲ့ အသားတင်ကိန်းဂဏန်းတွေက အလင်းဝင်း (glow) မပါဘဲ အပြားလိုက် အရောင်နဲ့ ပေါ်ပါပြီ',
      'အဖွင့်၊ အပိတ်၊ အသားတင် သုံးခုလုံး အရောင်ခွက်မပါဘဲ စာသားအပြားလိုက် ရှင်းရှင်းလင်းလင်း ပေါ်ပါပြီ — အဓိပ္ပာယ်တွေ အတိုင်းပါပဲ',
    ]);
    expect(entry.changesEn).toEqual([
      'A delete issued while an edit was saving can no longer lose its queue task',
      'Batch uploads now wait for server acknowledgement before counting as synced, with durable retry tasks as backup',
      'Deletes of debts, wallets, shops and vehicle logs made on another device are now honoured here via server tombstones',
      'The sync drawer now opens the full database sync tracker, so missing-record repair actions are reachable',
      'The gradient ground is removed — the card is flat navy again',
      'The main and net figures carry flat colours with no glow',
      'Opening, closing and net are plain text with no tinted chips — meanings unchanged',
    ]);
  });
});
