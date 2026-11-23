// [v7.6.04] The direct ("ပစ္စည်းအမည်") entry mode is removed:
// only unit_qty + shopping_list remain. Source-text assertions (same
// pattern as vehicleTiles7603.test.ts) — the components have no test
// renderer in this repo (vitest node env, no testing-library). The
// old-direct restore mapping and the unit_qty save shape are mirrored
// exactly below; render behaviour is verified by renders.
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

interface OldDirectTx {
  amount: number;
  note?: string;
  items?: { name: string }[];
  unitPrice?: number;
}

interface RestoredForm {
  entryMode: 'unit_qty' | 'shopping_list';
  itemName: string;
  extraNote: string;
  unitPrice: string;
  quantity: string;
  unit: string;
}

/** The v7.6.04 edit-restore dispatch, mirrored: an old direct entry
 * (no items, no unitPrice) opens as unit_qty with the amount as the
 * unit price at qty 1 and the default unit. */
function restoreForEdit(tx: OldDirectTx): RestoredForm {
  const { itemName, extraNote } = parseNote(tx.note || '');
  if (tx.unitPrice) {
    return {
      entryMode: 'unit_qty',
      itemName,
      extraNote,
      unitPrice: String(tx.unitPrice),
      quantity: '1',
      unit: DEFAULT_MENU_UNIT,
    };
  }
  if (tx.items && tx.items.length > 0) {
    return {
      entryMode: 'shopping_list',
      itemName: '',
      extraNote: tx.note || '',
      unitPrice: '',
      quantity: '1',
      unit: DEFAULT_MENU_UNIT,
    };
  }
  return {
    entryMode: 'unit_qty',
    itemName,
    extraNote,
    unitPrice: String(tx.amount),
    quantity: '1',
    unit: DEFAULT_MENU_UNIT,
  };
}

/** The unit_qty save fragment, mirrored: one item + unitPrice. */
function saveUnitQty(
  itemName: string,
  unitPrice: number,
  quantity: number,
  unit: string,
): {
  finalAmount: number;
  txItems: { id: string; name: string; price: number; quantity: number; amount: number; unit: string }[] | undefined;
  unitPrice: number | undefined;
  quantity: number | undefined;
  finalNote: string | undefined;
} {
  const finalAmount = unitPrice * quantity;
  const txItems = itemName.trim()
    ? [{
        id: 'item_1',
        name: itemName.trim(),
        price: unitPrice || 0,
        quantity: quantity || 1,
        amount: finalAmount,
        unit: resolveSavedMenuUnit(unit),
      }]
    : undefined;
  return {
    finalAmount,
    txItems,
    unitPrice: unitPrice > 0 ? unitPrice : undefined,
    quantity: quantity > 0 ? quantity : undefined,
    finalNote: undefined,
  };
}

function count(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

/** The mode switcher block: from its label to the category-picker
 * button that follows it (the category row's onClick). */
function switcherBlock(): string {
  const start = MODAL_SRC.indexOf('ထည့်သွင်းပုံစံ:');
  expect(start).toBeGreaterThan(-1);
  const end = MODAL_SRC.indexOf('setIsCategoryPickerOpen(true)', start);
  expect(end).toBeGreaterThan(start);
  return MODAL_SRC.slice(start, end);
}

describe('direct entry mode removed — two modes only (v7.6.04)', () => {
  it('the entryMode type is narrowed to unit_qty | shopping_list', () => {
    expect(MODAL_SRC).toContain("useState<'unit_qty' | 'shopping_list'>");
  });

  it('no quoted direct literal remains anywhere in TransactionModal', () => {
    expect(MODAL_SRC).not.toMatch(/(['"])direct\1/);
    expect(MODAL_SRC).not.toContain('QuickAddSub');
  });

  it('the switcher renders exactly 2 pills: Unit x Qty + Shopping List', () => {
    const block = switcherBlock();
    expect(block).toContain('grid-cols-2');
    expect(block).not.toContain('grid-cols-3');
    // Exactly two pill onClicks (double-quoted calls live only in
    // the switcher; the effect code uses single quotes).
    expect(count(block, 'setEntryMode("')).toBe(2);
    expect(block).toContain('setEntryMode("unit_qty")');
    expect(block).toContain('setEntryMode("shopping_list")');
    expect(block).toContain('ဈေး × အရေအတွက်');
    expect(block).toContain('ဈေးဝယ်စာရင်း');
    expect(block).not.toContain('ပစ္စည်းအမည်');
  });

  it('fresh open defaults to unit_qty and restore dispatch has no direct branch', () => {
    // Restore dispatch: the unitPrice branch AND the old-direct
    // else branch both set unit_qty, plus the fresh-open reset.
    expect(count(MODAL_SRC, "setEntryMode('unit_qty')")).toBe(3);
    expect(count(MODAL_SRC, "setEntryMode('shopping_list')")).toBe(1);
    expect(MODAL_SRC).toContain('setUnitPrice(String(editTransaction.amount))');
    expect(MODAL_SRC).toContain('[v7.6.04]');
  });

  it('the direct save fold is gone; the unit_qty save branch is intact', () => {
    // The direct fold (name + extra folded into one note string)
    // is gone; the shared suggestions helper name is untouched.
    expect(MODAL_SRC).not.toContain('const cleanItem = itemName.trim()');
    expect(MODAL_SRC).not.toContain('`${cleanItem} (${cleanExtra})`');
    expect(MODAL_SRC).not.toContain('const cleanExtra = extraNote.trim()');
    expect(MODAL_SRC).toContain(
      "txItems = [{ id: 'item_1', name: itemName.trim()",
    );
  });

  it('the lakh hint and the v7.6.03 vehicle tiles are untouched', () => {
    expect(MODAL_SRC).toContain('formatLakhs(parseMyanmarNumber(amount)');
    expect(MODAL_SRC).toContain('grid-cols-4 gap-1.5');
    expect(MODAL_SRC).toContain('autoSelectedRef');
  });
});

describe('old direct entries restore into unit_qty (v7.6.04 mapping)', () => {
  it('name in the note, no extra text: name restored, amount as unit price, qty 1', () => {
    const r = restoreForEdit({ amount: 15000, note: 'ဆန်' });
    expect(r.entryMode).toBe('unit_qty');
    expect(r.itemName).toBe('ဆန်');
    expect(r.extraNote).toBe('');
    expect(r.unitPrice).toBe('15000');
    expect(r.quantity).toBe('1');
    expect(r.unit).toBe(DEFAULT_MENU_UNIT);
  });

  it('name + extra text in parens: extra text is kept as the note', () => {
    const r = restoreForEdit({ amount: 8000, note: 'ဆန် (မနက်စာ)' });
    expect(r.entryMode).toBe('unit_qty');
    expect(r.itemName).toBe('ဆန်');
    expect(r.extraNote).toBe('မနက်စာ');
    expect(r.unitPrice).toBe('8000');
    expect(r.quantity).toBe('1');
  });

  it('greedy paren parse: the last paren group is the extra text', () => {
    const r = restoreForEdit({ amount: 5000, note: 'ဆန် (မနက်) (ည)' });
    expect(r.itemName).toBe('ဆန် (မနက်)');
    expect(r.extraNote).toBe('ည');
  });

  it('empty note: blank name, amount still restored as the unit price', () => {
    const r = restoreForEdit({ amount: 2000, note: '' });
    expect(r.itemName).toBe('');
    expect(r.extraNote).toBe('');
    expect(r.unitPrice).toBe('2000');
  });

  it('saving the restored entry writes items[0] + unitPrice', () => {
    const restored = restoreForEdit({ amount: 15000, note: 'ဆန် (မနက်စာ)' });
    const saved = saveUnitQty(
      restored.itemName,
      Number(restored.unitPrice),
      Number(restored.quantity),
      restored.unit,
    );
    expect(saved.finalAmount).toBe(15000);
    expect(saved.txItems).toHaveLength(1);
    expect(saved.txItems?.[0]).toMatchObject({
      name: 'ဆန်',
      price: 15000,
      quantity: 1,
      amount: 15000,
      unit: DEFAULT_MENU_UNIT,
    });
    expect(saved.unitPrice).toBe(15000);
    expect(saved.quantity).toBe(1);
  });

  it('stored data is unchanged until re-save: restore is display-only', () => {
    const tx = { amount: 15000, note: 'ဆန်' };
    restoreForEdit(tx);
    expect(tx).toEqual({ amount: 15000, note: 'ဆန်' });
  });
});

describe('version pins rolled forward to v7.6.15 (build 329)', () => {
  it('versionHistory + version.json agree, releasedAt present-only', () => {
    expect(CURRENT_APP_VERSION).toBe('v7.6.15');
    expect(CURRENT_BUILD_NUMBER).toBe(329);
    expect(VERSION_JSON.version).toBe('v7.6.15');
    expect(VERSION_JSON.buildNumber).toBe(329);
    // releasedAt is never rewritten by a version bump — assert only
    // that it is present (v7.5.78 lesson: never bake its value in).
    expect(typeof VERSION_JSON.releasedAt).toBe('string');
    expect(VERSION_JSON.releasedAt.length).toBeGreaterThan(0);
  });

  it('the top history entry carries the neutral-open entry, no Admin strings', () => {
    const top = VERSION_HISTORY[0];
    expect(top.version).toBe('v7.6.15');
    expect(top.buildNumber).toBe(329);
    expect(top.tag).toBe('fix');
    expect(top.changesMy).toEqual([
      'ဆီဖိုးစာရင်းတန်းမှာ ဆီအမျိုးအစား၊ လီတာနဲ့ ဆိုင် ပြမည်',
      'ဆီလမ်းညွှန် ပိတ်တဲ့အခါ စာရင်းပုံစံ မပိတ်တော့ပါ',
      'အမျိုးအစား မရွေးရသေးချိန် အမျိုးအစား အိုင်ကွန်နှင့် အရောင် မှန်ကန်စွာ ပြမည်',
    ]);
    expect(top.changesEn).toEqual([
      'Fuel rows now show the fuel type, litres and station on the record row',
      'Closing the fuel guide no longer closes the whole entry form',
      'Category icon and color now show the neutral state until a category is picked in a new entry',
    ]);
    expect(JSON.stringify(top)).not.toContain('Admin');
    expect(VERSION_JSON.changesMy).toEqual(top.changesMy);
    expect(VERSION_JSON.changesEn).toEqual(top.changesEn);
  });
});
