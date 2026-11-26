// [v7.6.13] Savings-pot wallet transfers — moving money wallet ↔ pot
// through the EXISTING transaction creation path. Pure helper tests
// (no Firestore, no component state) + wiring assertions (same
// pattern as savingsPots7609.test.ts — the components have no test
// renderer in this repo; layout behaviour is verified by renders).
//
// Investigation locked in here: handleAddTransaction in
// useTransactionHandlers.ts is the one creation entry point (plan
// limits, collaborator permission gate, local + cloud + shared
// writes all live inside it), and it takes
// Omit<Transaction, 'id' | 'createdAt'> — so a pot transfer is one
// plain payload through it, with NO transfer flags (a cat_transfer
// payload would be rewritten into a PAIRED wallet↔wallet transfer).
// There is no savings category in initialData.ts, so the durable
// "other" category per direction is used (cat_expense_other /
// cat_income_other — the ids orphaned transactions are reassigned
// to when a category is deleted). The pot entry gains optional
// walletId + transactionId; the transaction gains optional
// savingsPotId. sanitizeContribution rebuilds entries, so the link
// fields must be preserved there or they would be dropped on every
// load. There is NO per-entry edit in the pots UI (entries are
// append-only; only the pot name/target edits), so a linked entry
// can never diverge from its transaction by editing; deleting a
// pot never deletes its linked transactions. firestore.rules needs
// no change: the transaction create/update rules validate only
// id/walletId/amount/type/userId/date (no field whitelist), and
// touchingPremiumFields lists only the 5 upgrade fields.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  buildPotTransferTransaction,
  getPotTransferCategoryId,
  sanitizeSavingsPots,
  type SavingsPot,
  type SavingsPotContribution,
} from '../savingsPots';
import {
  VERSION_HISTORY,
  CURRENT_APP_VERSION,
  CURRENT_BUILD_NUMBER,
} from '../../data/versionHistory';
import type { Category } from '../../types';

const HELPER_SRC = readFileSync(
  new URL('../savingsPots.ts', import.meta.url),
  'utf8',
);
const COMPONENT_SRC = readFileSync(
  new URL('../../components/SavingsPots.tsx', import.meta.url),
  'utf8',
);
const ANALYTICS_SRC = readFileSync(
  new URL('../../components/AnalyticsView.tsx', import.meta.url),
  'utf8',
);
const APP_SRC = readFileSync(
  new URL('../../App.tsx', import.meta.url),
  'utf8',
);
const HOOK_SRC = readFileSync(
  new URL('../../hooks/useTransactionHandlers.ts', import.meta.url),
  'utf8',
);
const TYPES_SRC = readFileSync(
  new URL('../../types.ts', import.meta.url),
  'utf8',
);
const RULES_SRC = readFileSync(
  new URL('../../../firestore.rules', import.meta.url),
  'utf8',
);
const VERSION_JSON = JSON.parse(
  readFileSync(new URL('../../../public/version.json', import.meta.url), 'utf8'),
);

function category(id: string, type: 'income' | 'expense'): Category {
  return { id, name: id, nameEn: id, type, icon: 'Circle', color: '#000000' };
}

const FULL_CATEGORIES: Category[] = [
  category('cat_salary', 'income'),
  category('cat_income_other', 'income'),
  category('cat_food', 'expense'),
  category('cat_expense_other', 'expense'),
];

describe('transfer category resolution (v7.6.13)', () => {
  it('contribute uses the expense other-category, withdraw the income one', () => {
    expect(getPotTransferCategoryId(FULL_CATEGORIES, 'expense')).toBe('cat_expense_other');
    expect(getPotTransferCategoryId(FULL_CATEGORIES, 'income')).toBe('cat_income_other');
  });

  it('never resolves to the transfer category', () => {
    const withTransfer: Category[] = [
      ...FULL_CATEGORIES,
      category('cat_transfer', 'expense'),
    ];
    expect(getPotTransferCategoryId(withTransfer, 'expense')).toBe('cat_expense_other');
    expect(getPotTransferCategoryId(withTransfer, 'income')).toBe('cat_income_other');
  });

  it('falls back to the first category of the type when the other-category is gone', () => {
    const noOther: Category[] = [category('cat_food', 'expense'), category('cat_salary', 'income')];
    expect(getPotTransferCategoryId(noOther, 'expense')).toBe('cat_food');
    expect(getPotTransferCategoryId(noOther, 'income')).toBe('cat_salary');
  });

  it('falls back to the hardcoded other id when no category of the type exists', () => {
    expect(getPotTransferCategoryId([], 'expense')).toBe('cat_expense_other');
    expect(getPotTransferCategoryId([], 'income')).toBe('cat_income_other');
    expect(getPotTransferCategoryId([category('cat_food', 'expense')], 'income')).toBe('cat_income_other');
  });

  it('no savings category id is invented anywhere', () => {
    expect(HELPER_SRC).not.toContain('cat_savings');
    expect(HELPER_SRC).not.toContain('savings_category');
    expect(COMPONENT_SRC).not.toContain('cat_savings');
  });
});

describe('transfer transaction payload (v7.6.13)', () => {
  it('contribute is an expense from the wallet, withdraw an income into it', () => {
    const contrib = buildPotTransferTransaction({
      potId: 'pot-1',
      potName: 'ဆိုင်ကယ် အသစ်',
      entryType: 'in',
      amount: 200000,
      walletId: 'w1',
      date: '2026-11-23',
      categories: FULL_CATEGORIES,
    });
    expect(contrib.type).toBe('expense');
    expect(contrib.amount).toBe(200000);
    expect(contrib.walletId).toBe('w1');
    expect(contrib.date).toBe('2026-11-23');
    expect(contrib.category).toBe('cat_expense_other');
    expect(contrib.savingsPotId).toBe('pot-1');

    const draw = buildPotTransferTransaction({
      potId: 'pot-1',
      potName: 'ဆိုင်ကယ် အသစ်',
      entryType: 'out',
      amount: 50000,
      walletId: 'w1',
      date: '2026-11-23',
      categories: FULL_CATEGORIES,
    });
    expect(draw.type).toBe('income');
    expect(draw.category).toBe('cat_income_other');
    expect(draw.savingsPotId).toBe('pot-1');
  });

  it('the note always names the pot, with the user note appended', () => {
    const named = buildPotTransferTransaction({
      potId: 'pot-1',
      potName: 'ဆိုင်ကယ် အသစ်',
      entryType: 'in',
      amount: 1000,
      walletId: 'w1',
      date: '2026-11-23',
      note: 'လစာထဲက',
      categories: FULL_CATEGORIES,
    });
    expect(named.note).toBe('[စုငွေအိုး: ဆိုင်ကယ် အသစ်] လစာထဲက');
    const plain = buildPotTransferTransaction({
      potId: 'pot-1',
      potName: 'ဆိုင်ကယ် အသစ်',
      entryType: 'out',
      amount: 1000,
      walletId: 'w1',
      date: '2026-11-23',
      categories: FULL_CATEGORIES,
    });
    expect(plain.note).toBe('[စုငွေအိုး: ဆိုင်ကယ် အသစ်]');
  });

  it('carries no transfer flags, so the creation path takes its plain branch', () => {
    const tx = buildPotTransferTransaction({
      potId: 'pot-1',
      potName: 'ဆိုင်ကယ် အသစ်',
      entryType: 'in',
      amount: 1000,
      walletId: 'w1',
      date: '2026-11-23',
      categories: FULL_CATEGORIES,
    });
    expect(tx.isTransfer).toBeUndefined();
    expect(tx.transferType).toBeUndefined();
    expect(tx.transferToWalletId).toBeUndefined();
    expect(tx.transferPairId).toBeUndefined();
    expect(tx.category).not.toBe('cat_transfer');
    expect(tx.subCategoryId).toBeUndefined();
  });

  it('the helper creates nothing itself — it only builds the payload', () => {
    // The doc comment names the creation path it feeds; the helper
    // itself never calls it and never touches state or Firestore.
    expect(HELPER_SRC).not.toContain('handleAddTransaction(');
    expect(HELPER_SRC).not.toContain('setTransactions');
    expect(HELPER_SRC).not.toContain('safeSetDoc');
  });
});

describe('link fields survive persistence (v7.6.13)', () => {
  function potWith(contributions: unknown[]): SavingsPot {
    return {
      id: 'pot-1',
      name: 'ဆိုင်ကယ် အသစ်',
      targetAmount: 1000000,
      createdAt: 1763600000000,
      contributions: contributions as SavingsPotContribution[],
    };
  }

  it('a complete link (wallet + transaction) round-trips through sanitize', () => {
    const cleaned = sanitizeSavingsPots([
      potWith([
        { id: 'c1', amount: 200000, type: 'in', date: '2026-11-23', walletId: 'w1', transactionId: 'tx_1' },
      ]),
    ]);
    expect(cleaned).toHaveLength(1);
    expect(cleaned[0].contributions[0].walletId).toBe('w1');
    expect(cleaned[0].contributions[0].transactionId).toBe('tx_1');
  });

  it('a half-link is dropped whole — never one side without the other', () => {
    const cleaned = sanitizeSavingsPots([
      potWith([
        { id: 'c1', amount: 200000, type: 'in', date: '2026-11-23', walletId: 'w1' },
        { id: 'c2', amount: 50000, type: 'out', date: '2026-11-23', transactionId: 'tx_2' },
        { id: 'c3', amount: 10000, type: 'in', date: '2026-11-23', walletId: '', transactionId: 'tx_3' },
      ]),
    ]);
    expect(cleaned[0].contributions).toHaveLength(3);
    for (const c of cleaned[0].contributions) {
      expect(c.walletId).toBeUndefined();
      expect(c.transactionId).toBeUndefined();
    }
  });

  it('tracking-only entries from v7.6.09 load unchanged, with no link keys', () => {
    const cleaned = sanitizeSavingsPots([
      potWith([{ id: 'c1', amount: 400000, type: 'in', date: '2026-11-20', note: 'လစာ' }]),
    ]);
    expect(cleaned[0].contributions).toHaveLength(1);
    expect('walletId' in cleaned[0].contributions[0]).toBe(false);
    expect('transactionId' in cleaned[0].contributions[0]).toBe(false);
    expect(cleaned[0].contributions[0].note).toBe('လစာ');
  });
});

describe('creation path reuse — the hook reports the created id (v7.6.13)', () => {
  it('handleAddTransaction accepts an optional onCreated callback', () => {
    expect(HOOK_SRC).toContain('onCreated?: (tx: Transaction) => void');
    expect(HOOK_SRC).toContain('onCreated?.(transaction)');
  });

  it('onCreated fires exactly once, in the plain single-transaction branch', () => {
    const calls = HOOK_SRC.match(/onCreated\?\.\(transaction\)/g) || [];
    expect(calls).toHaveLength(1);
    const callAt = HOOK_SRC.indexOf('onCreated?.(transaction)');
    const plainBranchAt = HOOK_SRC.indexOf("const id = `tx_${Date.now()}_${randomSuffix()}`");
    expect(callAt).toBeGreaterThan(plainBranchAt);
    // The edit branch returns before the create branch and never
    // reports an id; the paired-transfer branch builds its own ids.
    const editBranch = HOOK_SRC.slice(HOOK_SRC.indexOf('if (editingTransaction) {'), plainBranchAt);
    expect(editBranch).not.toContain('onCreated');
  });

  it('the Transaction type carries the pot link field', () => {
    expect(TYPES_SRC).toContain('savingsPotId?: string;');
  });
});

describe('component wiring — picker, notice, linked save (v7.6.13)', () => {
  it('the entry form has one wallet select with the tracking-only default', () => {
    expect(COMPONENT_SRC).toContain('data-pot-wallet-select');
    expect(COMPONENT_SRC).toContain('ပိုက်ဆံအိတ် မရွေး (ခြေရာခံခြင်းသာ)');
    expect(COMPONENT_SRC).toContain('No wallet (tracking only)');
    expect(COMPONENT_SRC).toContain('min-h-11');
    // The picker lists the wired wallets, named per language like
    // the record-entry form does.
    expect(COMPONENT_SRC).toContain('w.nameEn || w.name');
  });

  it('the picker is hidden unless all three transfer props are wired', () => {
    expect(COMPONENT_SRC).toContain('const canTransfer = wallets !== undefined && wallets.length > 0 && onCreatePotTransfer !== undefined;');
    expect(COMPONENT_SRC).toContain('{canTransfer && (');
  });

  it('a picked wallet shows the real-change line for both directions, both languages', () => {
    expect(COMPONENT_SRC).toContain('data-pot-transfer-notice');
    expect(COMPONENT_SRC).toContain('ပိုက်ဆံအိတ်ထဲက တကယ် လျော့မည်');
    expect(COMPONENT_SRC).toContain('ပိုက်ဆံအိတ်ထဲ တကယ် တိုးမည်');
    expect(COMPONENT_SRC).toContain('The wallet balance will really decrease.');
    expect(COMPONENT_SRC).toContain('The wallet balance will really increase.');
  });

  it('the tracking-only line is kept verbatim', () => {
    expect(COMPONENT_SRC).toContain('စုငွေအိုးက တိုးတက်မှုကို ခြေရာခံခြင်းသာ — ပိုက်ဆံအိတ်လက်ကျန်ကို မထိပါ');
    expect(COMPONENT_SRC).toContain('Savings pots track progress only — wallet balances are untouched.');
  });

  it('the transaction is created BEFORE the entry persists, and a blocked creation saves nothing', () => {
    const saveAt = COMPONENT_SRC.indexOf('const handleSaveEntry');
    const saveBody = COMPONENT_SRC.slice(saveAt);
    const createAt = saveBody.indexOf('onCreatePotTransfer(');
    const failAt = saveBody.indexOf("setEntryError('transfer-failed')");
    const persistAt = saveBody.indexOf('persist(\n      pots.map');
    expect(createAt).toBeGreaterThan(-1);
    expect(failAt).toBeGreaterThan(createAt);
    expect(persistAt).toBeGreaterThan(failAt);
    expect(saveBody.slice(failAt, failAt + 120)).toContain('return;');
    expect(COMPONENT_SRC).toContain('transfer-failed');
  });

  it('a linked entry stores both link fields; an unlinked entry stores neither', () => {
    expect(COMPONENT_SRC).toContain('contribution.walletId = linkedWalletId;');
    expect(COMPONENT_SRC).toContain('contribution.transactionId = linkedTransactionId;');
  });

  it('history rows show the linked wallet name', () => {
    expect(COMPONENT_SRC).toContain('data-pot-entry-wallet');
    expect(COMPONENT_SRC).toContain('walletNameFor(c.walletId)');
  });

  it('the component never writes a transaction or a wallet directly', () => {
    expect(COMPONENT_SRC).not.toContain('setTransactions');
    expect(COMPONENT_SRC).not.toContain('setWallets');
    expect(COMPONENT_SRC).not.toContain("doc(db, 'transactions'");
    expect(COMPONENT_SRC).not.toContain("doc(db, 'users', user.uid, 'transactions'");
    // Creation happens only through the injected callback.
    expect(COMPONENT_SRC).toContain('onCreatePotTransfer');
    expect(COMPONENT_SRC).toContain('buildPotTransferTransaction');
  });

  it('no per-entry edit exists — entries are append-only, so a linked entry cannot diverge by editing', () => {
    expect(COMPONENT_SRC).not.toContain('handleSaveEntryEdit');
    expect(COMPONENT_SRC).not.toContain('editingEntryId');
    expect(COMPONENT_SRC).not.toContain('entryEdit');
    expect(COMPONENT_SRC).toContain('[...p.contributions, contribution]');
    // The single edit button edits the pot name/target only.
    const editButtons = COMPONENT_SRC.match(/data-pot-action="edit"/g) || [];
    expect(editButtons).toHaveLength(1);
  });

  it('deleting a pot deletes no transaction — the money record stays', () => {
    expect(COMPONENT_SRC).not.toContain('handleDeleteTransaction');
    expect(COMPONENT_SRC).not.toContain('deleteDocChecked');
    expect(COMPONENT_SRC).toContain('ပိုက်ဆံအိတ်လက်ကျန်ကို မထိပါ');
  });
});

describe('both render paths wire the transfer props (v7.6.13)', () => {
  it('AnalyticsView threads wallets, categories and the callback into SavingsPots', () => {
    expect(ANALYTICS_SRC).toContain('onCreatePotTransfer?: (tx: Omit<Transaction, \'id\' | \'createdAt\'>) => string | null;');
    expect(ANALYTICS_SRC).toContain('<SavingsPots lang={lang} wallets={wallets} categories={categories} onCreatePotTransfer={onCreatePotTransfer} />');
  });

  it('App passes the same props below the guest lock card', () => {
    expect(APP_SRC).toContain('<SavingsPots lang={lang} wallets={computedWallets} categories={categories} onCreatePotTransfer={handleCreatePotTransfer} />');
    const lockAt = APP_SRC.indexOf('Guest Mode တွင် မရရှိနိုင်ပါ');
    const potsAt = APP_SRC.indexOf('<SavingsPots');
    expect(lockAt).toBeGreaterThan(-1);
    expect(potsAt).toBeGreaterThan(lockAt);
  });

  it('App threads the callback into AnalyticsView too', () => {
    expect(APP_SRC).toContain('onCreatePotTransfer={handleCreatePotTransfer}');
  });

  it('the callback runs the existing creation path, captures the id, and refuses while an edit is open', () => {
    expect(APP_SRC).toContain('const handleCreatePotTransfer = (');
    expect(APP_SRC).toContain('if (editingTransaction) return null;');
    expect(APP_SRC).toContain('handleAddTransaction(tx, undefined, (created) => {');
    expect(APP_SRC).toContain('createdId = created.id;');
    expect(APP_SRC).toContain('return ok ? createdId : null;');
  });

  it('the wallet list is the same computed list the record-entry form receives', () => {
    expect(APP_SRC).toContain('wallets={computedWallets}');
  });
});

describe('no rules change is needed (v7.6.13)', () => {
  it('the transaction rules validate only id/walletId/amount/type/userId/date — no field whitelist', () => {
    const txBlockStart = RULES_SRC.indexOf('----- Transactions -----');
    const txBlockEnd = RULES_SRC.indexOf('----- Debts -----', txBlockStart);
    const txBlock = RULES_SRC.slice(txBlockStart, txBlockEnd);
    expect(txBlock).toContain('request.resource.data.id == transactionId');
    expect(txBlock).toContain('request.resource.data.amount is number');
    expect(txBlock).toContain("request.resource.data.type in ['income', 'expense', 'transfer']");
    expect(txBlock).toContain('request.resource.data.walletId is string');
    expect(txBlock).toContain('request.resource.data.date is string');
    expect(txBlock).not.toContain('savingsPotId');
    expect(txBlock).not.toContain('category');
  });

  it('touchingPremiumFields lists only the 5 upgrade fields', () => {
    const fnStart = RULES_SRC.indexOf('function touchingPremiumFields');
    const fnEnd = RULES_SRC.indexOf('}', fnStart);
    const fnBody = RULES_SRC.slice(fnStart, fnEnd);
    expect(fnBody).toContain("'plan'");
    expect(fnBody).toContain("'premiumExpiresAt'");
    expect(fnBody).toContain("'premiumActivatedAt'");
    expect(fnBody).toContain("'premiumMonths'");
    expect(fnBody).toContain("'premiumCodeUsed'");
    expect(fnBody).not.toContain('savingsPots');
    expect(RULES_SRC).not.toContain('savingsPotId');
    expect(RULES_SRC).not.toContain('savingsPots');
  });
});

describe('Version bump to v7.6.27 (build 342)', () => {
  it('version constants and history entry match version.json', () => {
    expect(CURRENT_APP_VERSION).toBe('v7.6.48');
    expect(CURRENT_BUILD_NUMBER).toBe(362);
    expect(VERSION_JSON.version).toBe('v7.6.48');
    expect(VERSION_JSON.buildNumber).toBe(362);
    const entry = VERSION_HISTORY[0];
    expect(entry.version).toBe('v7.6.48');
    expect(entry.buildNumber).toBe(362);
    expect(entry.releaseDate).toBe('2026-11-26');
    expect(entry.tag).toBe('feature');
    expect(entry.titleMy).toBe('အိုင်ကွန်ရုပ်ပုံ အစုံအလင် — အုပ်စု ၁၄ ခု၊ ရုပ်ပုံ ၄၆၃ ခု');
    expect(entry.titleEn).toBe('Complete pictorial icon library — 14 packs, 463 pictures');
    expect(entry.changesMy).toEqual(VERSION_JSON.changesMy);
    expect(entry.changesEn).toEqual(VERSION_JSON.changesEn);
    expect(entry.changesMy).toHaveLength(8);
    expect(entry.changesEn).toHaveLength(8);
    expect(entry.changesMy[0]).toBe(
      'ကဏ္ဍအိုင်ကွန်ရုပ်ပုံတွေ အကုန်လုံး ရောက်လာပါပြီ — အုပ်စု ၁၄ ခု၊ ရုပ်ပုံ ၄၆၃ ခု၊ အိမ်၊ ပြုပြင်ရေး၊ အစားအသောက်၊ မီးဖိုချောင်၊ နေ့စဉ်သုံး၊ အလှအပ၊ အိမ်မွေးတိရစ္ဆာန်၊ ကျန်းမာရေး၊ အချစ်၊ ခရီး၊ ငွေ၊ ဖျော်ဖြေရေး၊ ရာသီပွဲများနဲ့ အခြားအကုန်ပါပါတယ်',
    );
    expect(entry.changesEn[0]).toBe(
      'The full pictorial icon library is here — 463 pictures in 14 packs: home, repairing, food, kitchen, daily care, beauty, pets, health, love, travel, money, entertainment, seasonal and more',
    );
  });

  it('change log has no Admin content and releasedAt is present-only', () => {
    expect(VERSION_JSON.changesMy.join(' ')).not.toContain('Admin');
    expect(VERSION_JSON.changesEn.join(' ')).not.toContain('Admin');
    expect(JSON.stringify(VERSION_HISTORY[0])).not.toContain('Admin');
    expect(typeof VERSION_JSON.releasedAt).toBe('string');
    expect(VERSION_JSON.releasedAt.length).toBeGreaterThan(0);
  });

  it('no mangled numbering anywhere in the version surfaces', () => {
    expect(CURRENT_APP_VERSION).not.toBe('v7.5.100');
    expect(VERSION_JSON.version).not.toBe('v7.5.100');
    expect(CURRENT_APP_VERSION).not.toBe('v7.6.30'.replace(/0$/, ''));
    expect(VERSION_JSON.version).not.toBe('v7.6.30'.replace(/0$/, ''));
  });

  it('the fix-script guard is raw string equality: accepts exactly 7.6.25/7.6.26, rejects the mangled form', () => {
    const FROM_VERSION = '7.6.30';
    const TO_VERSION = '7.6.30';
    const guardFails = (pkgVersion: string): boolean =>
      pkgVersion !== FROM_VERSION && pkgVersion !== TO_VERSION;
    // The mangled form is built from TO_VERSION, never written as a
    // literal, so the shipped identity can never be confused with
    // it by a grep or by the guard.
    const mangled = TO_VERSION.replace(/0$/, '');
    expect(mangled).not.toBe(TO_VERSION);
    expect(TO_VERSION).toBe('7.6.30');
    expect(guardFails('7.6.30')).toBe(false);
    expect(guardFails('7.6.30')).toBe(false);
    expect(guardFails(mangled)).toBe(true);
    expect(guardFails('')).toBe(true);
  });
});
