// [v7.6.25] The two general entry modes are merged into ONE form:
// item rows only, no mode pills, no entryMode state. The unit_qty
// branch UI is deleted; its restore/save shape lives on in the rows
// (a legacy unit_qty record restores as one row; a single saved row
// still writes unitPrice/quantity). Source-text assertions (same
// pattern as vehicleTiles7603.test.ts) — the components have no test
// renderer in this repo (vitest node env, no testing-library). The
// row restore and the row save shape are mirrored exactly below;
// render behaviour is verified by renders.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { DEFAULT_MENU_UNIT, resolveSavedMenuUnit } from '../shopMenuUpdate';
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

/** The note parse, copied expression-for-expression from the
 * TransactionModal edit-restore (shared by every no-items branch). */
function parseNote(fullNote: string): { itemName: string; extraNote: string } {
  const match = fullNote.match(/^(.*) \((.*)\)$/);
  if (match) {
    return { itemName: match[1].trim(), extraNote: match[2].trim() };
  }
  return { itemName: fullNote, extraNote: '' };
}

interface SavedRow {
  name: string;
  price: number;
  quantity: number;
  amount: number;
  unit?: string;
  serviceType?: string;
}

interface LegacyTx {
  amount: number;
  note?: string;
  items?: SavedRow[];
  unitPrice?: number;
  quantity?: number;
}

interface RestoredRow {
  name: string;
  price: number;
  quantity: number;
  amount: number;
  unit: string;
}

interface RestoredForm {
  rows: RestoredRow[];
  itemName: string;
  extraNote: string;
}

/** The v7.6.25 edit-restore, mirrored: rows restore from items[];
 * a legacy unit_qty record without items[] restores as ONE row with
 * the same name/price/qty/unit the old unit_qty branch showed; an
 * old direct entry restores as one row at qty 1 with the amount as
 * its price and the default unit. */
function restoreForEdit(tx: LegacyTx): RestoredForm {
  const fullNote = tx.note || '';
  let parsedItemName = '';
  let parsedExtraNote = fullNote;
  if (tx.items && tx.items.length > 0) {
    if (tx.unitPrice) {
      parsedItemName = tx.items[0].name || '';
    }
  } else {
    const parsed = parseNote(fullNote);
    parsedItemName = parsed.itemName;
    parsedExtraNote = parsed.extraNote;
  }
  const itemName = parsedItemName;
  const extraNote = tx.items && tx.items.length > 0 ? fullNote : parsedExtraNote;
  if (tx.items && tx.items.length > 0) {
    return {
      rows: tx.items.map((it) => ({
        name: it.name,
        price: it.price,
        quantity: it.quantity,
        amount: it.amount,
        unit: it.unit || DEFAULT_MENU_UNIT,
      })),
      itemName: tx.unitPrice ? tx.items[0].name || '' : '',
      extraNote,
    };
  }
  if (tx.unitPrice) {
    return {
      rows: [{
        name: parsedItemName,
        price: tx.unitPrice,
        quantity: tx.quantity || 1,
        amount: tx.amount,
        unit: DEFAULT_MENU_UNIT,
      }],
      itemName,
      extraNote: parsedExtraNote,
    };
  }
  return {
    rows: [{
      name: parsedItemName,
      price: tx.amount,
      quantity: 1,
      amount: tx.amount,
      unit: DEFAULT_MENU_UNIT,
    }],
    itemName,
    extraNote: parsedExtraNote,
  };
}

interface SavedShape {
  finalAmount: number;
  txItems: SavedRow[] | undefined;
  unitPrice: number | undefined;
  quantity: number | undefined;
}

/** The merged save shape, mirrored: validItems (named rows with
 * qty > 0, amount rebuilt as price x qty, unit normalized) drives
 * the total; exactly one saved row also writes unitPrice/quantity. */
function saveMerged(rows: RestoredRow[]): SavedShape {
  const validItems = rows
    .filter((i) => i.name.trim() && i.quantity > 0)
    .map((i) => ({
      name: i.name.trim(),
      price: i.price || 0,
      quantity: i.quantity || 1,
      amount: (i.price || 0) * (i.quantity || 1),
      unit: resolveSavedMenuUnit(i.unit),
    }));
  const finalAmount = validItems.reduce((sum, item) => sum + item.amount, 0);
  return {
    finalAmount,
    txItems: validItems.length > 0 ? validItems : undefined,
    unitPrice: validItems.length === 1 && validItems[0].price > 0 ? validItems[0].price : undefined,
    quantity: validItems.length === 1 && validItems[0].quantity > 0 ? validItems[0].quantity : undefined,
  };
}

/** The merged rows block: from its JSX gate to the previous-price
 * hint that follows it. */
function rowsBlock(): string {
  const start = MODAL_SRC.indexOf('entryModel === "general" && !isTransferCategory && (');
  expect(start).toBeGreaterThan(-1);
  const end = MODAL_SRC.indexOf('latestPreviousPurchase && currentEffectivePrice', start);
  expect(end).toBeGreaterThan(start);
  return MODAL_SRC.slice(start, end);
}

describe('merged entry form — one form only (v7.6.25)', () => {
  it('no entryMode state, no unit_qty branch, no mode pills remain', () => {
    expect(MODAL_SRC).not.toContain("useState<'unit_qty'");
    // NOTE: 'entryMode' / 'setEntryMode' are substrings of
    // 'entryModel' / 'setEntryModel' — pin the call/operator forms.
    expect(MODAL_SRC).not.toContain('setEntryMode(');
    expect(MODAL_SRC).not.toContain('entryMode ===');
    expect(MODAL_SRC).not.toContain('handleUnitQtyChange');
    expect(MODAL_SRC).not.toContain('unitQtyUnit');
    expect(MODAL_SRC).not.toContain('Boxes');
    expect(MODAL_SRC).not.toContain('ထည့်သွင်းပုံစံ:');
    expect(MODAL_SRC).not.toContain('ဈေး × အရေအတွက်');
    expect(MODAL_SRC).not.toContain("entryMode === 'unit_qty'");
    expect(MODAL_SRC).not.toContain('entryMode === "shopping_list"');
  });

  it('no quoted direct literal remains anywhere in TransactionModal', () => {
    expect(MODAL_SRC).not.toMatch(/(['"])direct\1/);
    expect(MODAL_SRC).not.toContain('QuickAddSub');
  });

  it('the rows render for general non-transfer entries, with the Shopping List header', () => {
    expect(MODAL_SRC).toContain('entryModel === "general" && !isTransferCategory && (');
    const block = rowsBlock();
    expect(block).toContain('ဈေးဝယ်စာရင်း');
    expect(block).toContain('resolveMenuUnitSelectValue(item.unit, knownUnits)');
    expect(block).toContain('menuUnitSelectOptions(knownUnits)');
    expect(block).toContain('menuUnitNeedsCustomInput(item.unit, knownUnits)');
    expect(block).toContain('customMenuUnitText(item.unit)');
    expect(block).toContain('ယူနစ် ရိုက်ထည့်ပါ');
    expect(block).toContain('addShoppingItemRow()');
    expect(block).toContain('removeShoppingItemRow(item.id || "")');
    expect(block).toContain('autoGenerateShoppingNote');
  });

  it('fresh open resets to one blank row; restore dispatch keeps the [v7.6.04] marker', () => {
    expect(MODAL_SRC).toContain("setShoppingItems([{ id: 'item_1', name: '', price: 0, quantity: 1, amount: 0 }])");
    expect(MODAL_SRC).toContain('[v7.6.04]');
    expect(MODAL_SRC).toContain('[v7.6.25]');
  });

  it('the split section is offered for general non-transfer entries', () => {
    expect(MODAL_SRC).toContain("const splitSectionVisible = entryModel === 'general' && !isTransferCategory;");
    expect(MODAL_SRC).toContain("entryModel === 'general' && splitEnabled && !isTransferTx && splitRows.length > 0");
  });

  it('the direct save fold is gone; the merged save writes items + single-row unitPrice/quantity', () => {
    // The direct fold (name + extra folded into one note string)
    // is gone; the shared suggestions helper name is untouched.
    expect(MODAL_SRC).not.toContain('const cleanItem = itemName.trim()');
    expect(MODAL_SRC).not.toContain('`${cleanItem} (${cleanExtra})`');
    expect(MODAL_SRC).not.toContain('const cleanExtra = extraNote.trim()');
    expect(MODAL_SRC).toContain('unitPrice: entryModel === \'general\' && !isTransferTx && validItems.length === 1');
    expect(MODAL_SRC).toContain('quantity: entryModel === \'general\' && !isTransferTx && validItems.length === 1');
  });

  it('the lakh hint and the v7.6.03 vehicle tiles are untouched', () => {
    expect(MODAL_SRC).toContain('formatLakhs(parseMyanmarNumber(amount)');
    expect(MODAL_SRC).toContain('grid-cols-4 gap-1.5');
    expect(MODAL_SRC).toContain('autoSelectedRef');
  });
});

describe('legacy records restore as one row (v7.6.25 mapping)', () => {
  it('legacy unit_qty record without items[]: one row, same name/price/qty/default unit', () => {
    const r = restoreForEdit({ amount: 15000, note: 'ဆန် (မနက်စာ)', unitPrice: 5000, quantity: 3 });
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0]).toMatchObject({
      name: 'ဆန်',
      price: 5000,
      quantity: 3,
      amount: 15000,
      unit: DEFAULT_MENU_UNIT,
    });
    expect(r.itemName).toBe('ဆန်');
    expect(r.extraNote).toBe('မနက်စာ');
  });

  it('legacy unit_qty record with items[]: the saved row unit is kept', () => {
    const r = restoreForEdit({
      amount: 10000,
      note: 'ဆန်',
      unitPrice: 5000,
      quantity: 2,
      items: [{ name: 'ဆန်', price: 5000, quantity: 2, amount: 10000, unit: 'ဗူး' }],
    });
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0]).toMatchObject({ name: 'ဆန်', price: 5000, quantity: 2, unit: 'ဗူး' });
    expect(r.itemName).toBe('ဆန်');
  });

  it('old direct entry: one row at qty 1 with the amount as its price', () => {
    const r = restoreForEdit({ amount: 15000, note: 'ဆန်' });
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0]).toMatchObject({
      name: 'ဆန်',
      price: 15000,
      quantity: 1,
      amount: 15000,
      unit: DEFAULT_MENU_UNIT,
    });
    expect(r.itemName).toBe('ဆန်');
    expect(r.extraNote).toBe('');
  });

  it('greedy paren parse: the last paren group is the extra text', () => {
    const r = restoreForEdit({ amount: 5000, note: 'ဆန် (မနက်) (ည)' });
    expect(r.itemName).toBe('ဆန် (မနက်)');
    expect(r.extraNote).toBe('ည');
    expect(r.rows[0].name).toBe('ဆန် (မနက်)');
  });

  it('empty note: blank name, amount still restored as the row price', () => {
    const r = restoreForEdit({ amount: 2000, note: '' });
    expect(r.itemName).toBe('');
    expect(r.extraNote).toBe('');
    expect(r.rows[0].price).toBe(2000);
  });

  it('saving the restored entry writes items[0] + unitPrice', () => {
    const restored = restoreForEdit({ amount: 15000, note: 'ဆန် (မနက်စာ)', unitPrice: 5000, quantity: 3 });
    const saved = saveMerged(restored.rows);
    expect(saved.finalAmount).toBe(15000);
    expect(saved.txItems).toHaveLength(1);
    expect(saved.txItems?.[0]).toMatchObject({
      name: 'ဆန်',
      price: 5000,
      quantity: 3,
      amount: 15000,
      unit: DEFAULT_MENU_UNIT,
    });
    expect(saved.unitPrice).toBe(5000);
    expect(saved.quantity).toBe(3);
  });

  it('multi-row save: no unitPrice/quantity, total is the row sum', () => {
    const saved = saveMerged([
      { name: 'ဆန်', price: 5000, quantity: 2, amount: 10000, unit: 'ခု' },
      { name: 'ဆီ', price: 3000, quantity: 1, amount: 3000, unit: 'လီတာ' },
    ]);
    expect(saved.finalAmount).toBe(13000);
    expect(saved.txItems).toHaveLength(2);
    expect(saved.unitPrice).toBeUndefined();
    expect(saved.quantity).toBeUndefined();
  });

  it('stored data is unchanged until re-save: restore is display-only', () => {
    const tx = { amount: 15000, note: 'ဆန်' };
    restoreForEdit(tx);
    expect(tx).toEqual({ amount: 15000, note: 'ဆန်' });
  });
});

describe('version pins rolled forward to v7.6.27 (build 342)', () => {
  it('versionHistory + version.json agree, releasedAt present-only', () => {
    expect(CURRENT_APP_VERSION).toBe('v7.6.35');
    expect(CURRENT_BUILD_NUMBER).toBe(349);
    expect(VERSION_JSON.version).toBe('v7.6.35');
    expect(VERSION_JSON.buildNumber).toBe(349);
    // releasedAt is never rewritten by a version bump — assert only
    // that it is present (v7.5.78 lesson: never bake its value in).
    expect(typeof VERSION_JSON.releasedAt).toBe('string');
    expect(VERSION_JSON.releasedAt.length).toBeGreaterThan(0);
  });

  it('the top history entry carries the merged-form entry, no Admin strings', () => {
    const top = VERSION_HISTORY[0];
    expect(top.version).toBe('v7.6.35');
    expect(top.buildNumber).toBe(349);
    expect(top.tag).toBe('feature');
    expect(top.titleMy).toBe('နေရာအပိုယူနေတဲ့ ကတ်တွေ ကျစ်လစ်စေခြင်း');
    expect(top.titleEn).toBe('Compact cards across the whole app');
    expect(top.changesMy).toEqual([
      'အက်ပ်တစ်ခုလုံးမှာ နေရာအပိုယူနေတဲ့ ကတ်တွေကို ကျစ်လစ်အောင် ပြင်သည် — အချက်အလက်နဲ့ ခလုတ်အကုန် ရှိနေမည်',
    ]);
    expect(top.changesEn).toEqual([
      'Cards that wasted space across the whole app are now compact — every number and button stays in place.',
    ]);
    expect(JSON.stringify(top)).not.toContain('Admin');
    expect(VERSION_JSON.changesMy).toEqual(top.changesMy);
    expect(VERSION_JSON.changesEn).toEqual(top.changesEn);
  });
});
