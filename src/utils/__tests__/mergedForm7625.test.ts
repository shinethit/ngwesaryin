// [v7.6.25] The two general entry modes are merged into ONE form:
// item rows only, no mode pills, no entryMode state; the split
// section is offered for every general non-transfer entry; the
// total is the live row sum; transfers keep the shared amount
// input and never render rows. Source-text assertions (same pattern
// as directModeRemoved7604.test.ts) — the components have no test
// renderer in this repo (vitest node env, no testing-library);
// render behaviour is verified by renders.
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

/** The shared amount-input block: from the amount input to the
 * quick-add row that follows it. */
function amountBlock(): string {
  const start = MODAL_SRC.indexOf('value={amount} onChange={(e) => {');
  expect(start).toBeGreaterThan(-1);
  const end = MODAL_SRC.indexOf('handleAddAmount(1000)', start);
  expect(end).toBeGreaterThan(start);
  return MODAL_SRC.slice(start, end);
}

describe('merged form — one form, rows drive the total (v7.6.25)', () => {
  it('the split section gate drops the entryMode condition but keeps the transfer exclusion', () => {
    expect(MODAL_SRC).toContain(
      "const splitSectionVisible = entryModel === 'general' && !isTransferCategory;",
    );
    expect(MODAL_SRC).not.toContain("entryMode === 'unit_qty'");
    expect(MODAL_SRC).toContain(
      "entryModel === 'general' && splitEnabled && !isTransferTx && splitRows.length > 0",
    );
  });

  it('the total is the row sum: finalAmount, split total and validation all read the rows', () => {
    // Save: the row-sum branch covers every general non-transfer
    // entry (transfers and vehicle visits keep their own totals).
    expect(MODAL_SRC).toContain(
      "const isMultiRow = (entryModel === 'general' && !isTransferLike) || (entryModel === 'vehicle_service' && maintServiceType !== 'license_renewal');",
    );
    expect(MODAL_SRC).toContain(
      'finalAmount = validItems.reduce((sum, item) => sum + item.amount, 0);',
    );
    expect(MODAL_SRC).not.toContain('parseMyanmarNumber(unitPrice) * parseMyanmarNumber(quantity)');
    // The split remaining indicator reads the shared amount input,
    // which the row edits drive live.
    expect(MODAL_SRC).toContain('const splitTotalAmount = parseMyanmarNumber(amount)');
    expect(MODAL_SRC).toContain('setAmount(totalSum > 0 ? String(totalSum) : \'\')');
    // The amount>0 validation gates the save on the same total
    // (numAmount is parsed from the row-driven amount state).
    expect(MODAL_SRC).toContain('const numAmount = parseMyanmarNumber(amount);');
    expect(MODAL_SRC).toContain('if ((!numAmount || numAmount <= 0) && !isFreeTireCheck) {');
  });

  it('row edits keep the shared amount input in sync on every mutation', () => {
    const start = MODAL_SRC.indexOf('const updateShoppingItem');
    expect(start).toBeGreaterThan(-1);
    const end = MODAL_SRC.indexOf('const removeShoppingItemRow', start);
    expect(end).toBeGreaterThan(start);
    const block = MODAL_SRC.slice(start, end);
    expect(block).toContain("setAmount(totalSum > 0 ? String(totalSum) : '')");
    const removeStart = MODAL_SRC.indexOf('const removeShoppingItemRow');
    const removeEnd = MODAL_SRC.indexOf('const handlePrimaryCategorySelect', removeStart);
    expect(removeEnd).toBeGreaterThan(removeStart);
    expect(MODAL_SRC.slice(removeStart, removeEnd)).toContain("setAmount(totalSum > 0 ? String(totalSum) : '')");
  });

  it('applying a previous price sets the single row price (row math drives the total)', () => {
    expect(MODAL_SRC).toContain(
      "if (entryModel === 'general' && !isTransferCategory && shoppingItems.length === 1 && shoppingItems[0].id) {",
    );
    expect(MODAL_SRC).toContain(
      "updateShoppingItem(shoppingItems[0].id, 'price', String(p));",
    );
    // The compared price is the single row's unit price.
    expect(MODAL_SRC).toContain(
      "entryModel === 'general' && !isTransferCategory && shoppingItems.length === 1 ? parseMyanmarNumber(shoppingItems[0].price as any)",
    );
  });

  it('the quick-add buttons are hidden for general non-transfer entries', () => {
    expect(MODAL_SRC).toContain(
      '!(entryModel === "general" && !isTransferCategory) && (',
    );
  });

  it('the shared amount input is entryMode-independent and renders for transfers', () => {
    const block = amountBlock();
    expect(block).toContain('setAmount(e.target.value)');
    // NOTE: 'entryMode' is a substring of 'entryModel' (the fuel
    // derivation in this block) — pin the operator form.
    expect(block).not.toContain('entryMode ===');
    expect(block).not.toContain('handleUnitQtyAmountChange');
    // The transfer From/To selects still render in their own block.
    expect(MODAL_SRC).toContain('isTransferCategory');
    expect(MODAL_SRC).toContain('sub_tf_out');
    expect(MODAL_SRC).toContain('sub_tf_in');
  });

  it('transfers save no items and no splits; vehicle multi-row visits keep their rows', () => {
    expect(MODAL_SRC).toContain(
      "} else if (entryModel === 'general' && !isTransferTx) {",
    );
    expect(MODAL_SRC).toContain(
      'txItems = validItems.length > 0 ? validItems : undefined;',
    );
    expect(MODAL_SRC).not.toContain(
      "} else if (entryMode === 'shopping_list') {",
    );
    expect(MODAL_SRC).not.toContain(
      "} else if (entryMode === 'unit_qty') {",
    );
  });

  it('the top-category / split-row-1 two-way sync is intact', () => {
    expect(MODAL_SRC).toContain('handlePrimaryCategorySelect');
    expect(MODAL_SRC).toContain('syncSplitRowToPrimary');
    expect(MODAL_SRC).toContain('defaultSplitRows(categoryId, subCategoryId)');
    expect(MODAL_SRC).toContain('targetCategory = built[0].categoryId');
  });

  it('one record keeps one entry shop; menu candidates go per row shop (v7.6.41 revises the v7.6.25 rule for splits)', () => {
    expect(MODAL_SRC).toContain('shopName: derivedShopName || undefined,');
    // [v7.6.41] The saved record still carries its items once and one
    // entry-level shop — but the MENU candidate is now one per row
    // shop (each row's items → that shop), via the shared queue.
    expect(MODAL_SRC).toContain('menuUpdateCandidates');
    expect(MODAL_SRC).toContain('attributeItemsToShops(');
    expect(MODAL_SRC).toContain('onShopMenuUpdateCandidates');
    expect(MODAL_SRC).toContain('items: txItems,');
  });
});

describe('version pins for v7.6.27 (build 342)', () => {
  it('versionHistory + version.json agree, releasedAt present-only', () => {
    expect(CURRENT_APP_VERSION).toBe('v7.6.46');
    expect(CURRENT_BUILD_NUMBER).toBe(360);
    expect(VERSION_JSON.version).toBe('v7.6.46');
    expect(VERSION_JSON.buildNumber).toBe(360);
    expect(typeof VERSION_JSON.releasedAt).toBe('string');
    expect(VERSION_JSON.releasedAt.length).toBeGreaterThan(0);
  });

  it('the top history entry carries the merged-form entry, no Admin strings', () => {
    const top = VERSION_HISTORY[0];
    expect(top.version).toBe('v7.6.46');
    expect(top.buildNumber).toBe(360);
    expect(top.tag).toBe('feature');
    expect(top.titleMy).toBe('မှတ်တမ်းပြက္ခဒိန်၊ လက်ကျန်အရောင်၊ Menu ခလုတ်နှင့် Dashboard ပြင်ဆင်ချက်များ');
    expect(top.titleEn).toBe('Records calendar, balance colours, menu button and Dashboard fixes');
    expect(top.changesMy).toEqual([
      'မှတ်တမ်းပြက္ခဒိန်မှာ ဝင်/ထွက် နဲ့အတူ ကျန်ငွေ (Net) ကိုပါ တစ်နေ့ချင်းစီ ပြပေးပါပြီ',
      'မှတ်တမ်းစာရင်းက တရက်ချင်းစီ ကတ်တွေကို နက်ပြာ/ခရမ်းဖျော့ ဘောင်နဲ့ ထင်ရှားအောင် ခတ်ပေးထားပါပြီ',
      'လအစလက်ကျန်/လအဆုံးလက်ကျန်ကို အနှုတ် (အနီ)၊ ၁ သိန်းအောက် (အဝါ)၊ ၁ သိန်းနှင့်အထက် (အဖြူ) ခွဲပြပါပြီ',
      'ဆိုင်အားလုံးရဲ့ Menu ပြန် Update ခလုတ်ကို ရှာဖွေမှုတန်းဘေးကို ရွှေ့ပြီး အလုပ်ရှိမှသာ ရောင်စုံပြ၊ ပြီးရင် မှိန်သွားအောင် လုပ်ထားပါပြီ',
      'စမတ်ပြက္ခဒိန်မှာ အပေါင်း (အစိမ်း)၊ အနှုတ် (အနီ) ခွဲပြပြီး ၁ သိန်းအထက် အပေါင်းရက်တွေကို နက်ပြာနောက်ခံ ရွှေစာလုံးနဲ့ ပြပါပြီ',
      'Dashboard Hero ကတ်မှာ လက်ကျန်ကို ဝှက်လို့ရတဲ့ မျက်လုံးခလုတ်ကို ထည့်ပေးထားပါပြီ',
      'အမျိုးအစားအိုင်ကွန်အရောင်တွေ အကောင့်ဟောင်းတွေမှာပါ ထင်ရှားစွာ ကွဲပြားအောင် ပြင်ထားပါပြီ',
    ]);
    expect(top.changesEn).toEqual([
      'The Records calendar now shows the net balance for each day alongside in/out',
      'Day cards in the Records list now have a navy/purple border so they stand out from the page background',
      'Opening/closing balances are now coloured: red when negative, yellow below 100,000 MMK, white at 100,000 and above',
      'The refresh-all-menus button moved beside the search row and now shows colour only while menu work is pending, dimming once up to date',
      'Smart Calendar days are tinted green for positive and red for negative nets, with a navy background and gold text for days netting over 100,000 MMK',
      'Added a hide-balance eye button to the Dashboard Hero card, matching the Records card',
      'Category tile colours now show distinctly on long-lived accounts too, not only fresh ones',
    ]);
    expect(JSON.stringify(top)).not.toContain('Admin');
    expect(VERSION_JSON.changesMy).toEqual(top.changesMy);
    expect(VERSION_JSON.changesEn).toEqual(top.changesEn);
  });
});
