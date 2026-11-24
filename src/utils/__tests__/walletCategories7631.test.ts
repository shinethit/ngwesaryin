// [v7.6.31] Per-wallet category visibility (denylist): a wallet's
// hiddenCategoryIds hides categories from THAT wallet's entry
// pickers only. Pure-helper tests + wiring assertions (the repo
// pattern: components have no test renderer; layout behaviour is
// verified by renders). Source reads use `new URL` — NO path
// comparisons.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  getVisibleCategories,
  isCategoryHiddenForWallet,
  TRANSFER_CATEGORY_ID,
} from '../walletCategories';
import type { Category, Wallet } from '../../types';
import {
  VERSION_HISTORY,
  CURRENT_APP_VERSION,
  CURRENT_BUILD_NUMBER,
} from '../../data/versionHistory';

const VERSION_JSON = JSON.parse(
  readFileSync(new URL('../../../public/version.json', import.meta.url), 'utf8'),
);
const HELPER_SRC = readFileSync(new URL('../walletCategories.ts', import.meta.url), 'utf8');
const TYPES_SRC = readFileSync(new URL('../../types.ts', import.meta.url), 'utf8');
const TXMODAL_SRC = readFileSync(
  new URL('../../components/TransactionModal.tsx', import.meta.url),
  'utf8',
);
const WALLET_MODAL_SRC = readFileSync(
  new URL('../../components/WalletModal.tsx', import.meta.url),
  'utf8',
);
const WALLETS_VIEW_SRC = readFileSync(
  new URL('../../components/WalletsView.tsx', import.meta.url),
  'utf8',
);
const APP_SRC = readFileSync(new URL('../../App.tsx', import.meta.url), 'utf8');
const SHARED_SVC_SRC = readFileSync(
  new URL('../../lib/sharedWalletService.ts', import.meta.url),
  'utf8',
);
const AUTH_CTX_SRC = readFileSync(
  new URL('../../context/AuthContext.tsx', import.meta.url),
  'utf8',
);
const RULES_SRC = readFileSync(new URL('../../../firestore.rules', import.meta.url), 'utf8');

function cat(
  id: string,
  type: 'income' | 'expense',
  subIds: string[] = [],
): Category {
  return {
    id,
    name: id,
    nameEn: id,
    type,
    icon: 'Tag',
    color: '#000000',
    subCategories: subIds.map((sid) => ({ id: sid, name: sid, nameEn: sid })),
  };
}

function wallet(hiddenCategoryIds?: string[]): Wallet {
  return {
    id: 'wallet_1',
    name: 'Personal',
    nameEn: 'Personal',
    balance: 0,
    color: '#10B981',
    icon: 'wallet',
    hiddenCategoryIds,
  };
}

const CATS = [
  cat('cat_food', 'expense', ['sub_food_snack']),
  cat('cat_transport', 'expense'),
  cat('cat_salary', 'income'),
  cat('cat_transfer', 'expense', ['sub_tf_out', 'sub_tf_in']),
];

describe('getVisibleCategories (v7.6.31)', () => {
  it('absent denylist -> all categories visible', () => {
    expect(getVisibleCategories(CATS, wallet(undefined)).map((c) => c.id)).toEqual([
      'cat_food',
      'cat_transport',
      'cat_salary',
      'cat_transfer',
    ]);
  });

  it('empty denylist -> all categories visible', () => {
    expect(getVisibleCategories(CATS, wallet([])).map((c) => c.id)).toEqual([
      'cat_food',
      'cat_transport',
      'cat_salary',
      'cat_transfer',
    ]);
  });

  it('no wallet selected yet -> all categories visible', () => {
    expect(getVisibleCategories(CATS, undefined).map((c) => c.id)).toEqual([
      'cat_food',
      'cat_transport',
      'cat_salary',
      'cat_transfer',
    ]);
    expect(getVisibleCategories(CATS, null).map((c) => c.id)).toHaveLength(4);
  });

  it('hidden ids are excluded', () => {
    const visible = getVisibleCategories(CATS, wallet(['cat_food', 'cat_salary']));
    expect(visible.map((c) => c.id)).toEqual(['cat_transport', 'cat_transfer']);
  });

  it('a new category (in no list) is visible automatically', () => {
    const withNew = [...CATS, cat('cat_brand_new', 'expense')];
    const visible = getVisibleCategories(withNew, wallet(['cat_food']));
    expect(visible.map((c) => c.id)).toContain('cat_brand_new');
    expect(visible.map((c) => c.id)).not.toContain('cat_food');
  });

  it('the edit target category is always included', () => {
    const visible = getVisibleCategories(CATS, wallet(['cat_food']), ['cat_food']);
    expect(visible.map((c) => c.id)).toContain('cat_food');
    // ...and its sub-categories ride along on the category object.
    expect(visible.find((c) => c.id === 'cat_food')?.subCategories).toHaveLength(1);
  });

  it('cat_transfer is never hidden, even when named in the denylist', () => {
    expect(TRANSFER_CATEGORY_ID).toBe('cat_transfer');
    const visible = getVisibleCategories(CATS, wallet(['cat_transfer', 'cat_food']));
    expect(visible.map((c) => c.id)).toContain('cat_transfer');
    expect(visible.map((c) => c.id)).not.toContain('cat_food');
  });

  it('input arrays are never mutated and the result is a new array', () => {
    const catsSnapshot = JSON.stringify(CATS);
    const w = wallet(['cat_food']);
    const hiddenSnapshot = JSON.stringify(w.hiddenCategoryIds);
    const visible = getVisibleCategories(CATS, w, ['cat_food']);
    expect(visible).not.toBe(CATS);
    expect(JSON.stringify(CATS)).toBe(catsSnapshot);
    expect(JSON.stringify(w.hiddenCategoryIds)).toBe(hiddenSnapshot);
    expect(visible.map((c) => c.id)).toEqual(['cat_food', 'cat_transport', 'cat_salary', 'cat_transfer']);
  });

  it('hiding a parent hides it at category level; a sub-category id in the list hides nothing', () => {
    // Parent hidden -> the whole category (subs included) is gone.
    const hidden = getVisibleCategories(CATS, wallet(['cat_food']));
    expect(hidden.map((c) => c.id)).not.toContain('cat_food');
    // A sub id alone is inert: there are no per-sub toggles.
    const subOnly = getVisibleCategories(CATS, wallet(['sub_food_snack']));
    expect(subOnly.map((c) => c.id)).toContain('cat_food');
  });

  it('preserves the caller order', () => {
    const visible = getVisibleCategories(CATS, wallet(['cat_transport']));
    expect(visible.map((c) => c.id)).toEqual(['cat_food', 'cat_salary', 'cat_transfer']);
  });
});

describe('isCategoryHiddenForWallet (v7.6.31)', () => {
  it('false for absent / empty denylist, missing wallet, and other ids', () => {
    expect(isCategoryHiddenForWallet('cat_food', wallet(undefined))).toBe(false);
    expect(isCategoryHiddenForWallet('cat_food', wallet([]))).toBe(false);
    expect(isCategoryHiddenForWallet('cat_food', undefined)).toBe(false);
    expect(isCategoryHiddenForWallet('cat_food', null)).toBe(false);
    expect(isCategoryHiddenForWallet('cat_salary', wallet(['cat_food']))).toBe(false);
    expect(isCategoryHiddenForWallet('', wallet(['cat_food']))).toBe(false);
  });

  it('true only for a listed id', () => {
    expect(isCategoryHiddenForWallet('cat_food', wallet(['cat_food']))).toBe(true);
  });

  it('never true for cat_transfer', () => {
    expect(isCategoryHiddenForWallet('cat_transfer', wallet(['cat_transfer']))).toBe(false);
  });
});

describe('WalletModal wiring (v7.6.31)', () => {
  it('Wallet carries the optional denylist field', () => {
    expect(TYPES_SRC).toContain('hiddenCategoryIds?: string[];');
  });

  it('WalletModal takes a categories prop for the checklist', () => {
    expect(WALLET_MODAL_SRC).toContain('categories?: Category[];');
    expect(WALLET_MODAL_SRC).toContain('categories = [],');
  });

  it('checklist state initializes from walletToEdit on open, and resets for a new wallet', () => {
    expect(WALLET_MODAL_SRC).toContain(
      'setHiddenCategoryIds([...(walletToEdit.hiddenCategoryIds || [])])',
    );
    expect(WALLET_MODAL_SRC).toContain('setHiddenCategoryIds([]);');
  });

  it('both save branches write the denylist EXPLICITLY (merge-clear safe)', () => {
    const writes = WALLET_MODAL_SRC.split('hiddenCategoryIds: [...hiddenCategoryIds],').length - 1;
    expect(writes).toBe(2);
  });

  it('checklist groups expense before income and excludes cat_transfer', () => {
    expect(WALLET_MODAL_SRC).toContain("c.id !== 'cat_transfer'");
    const expenseIdx = WALLET_MODAL_SRC.indexOf('cats: expenseChecklist');
    const incomeIdx = WALLET_MODAL_SRC.indexOf('cats: incomeChecklist');
    expect(expenseIdx).toBeGreaterThan(-1);
    expect(incomeIdx).toBeGreaterThan(expenseIdx);
    expect(WALLET_MODAL_SRC).toContain('max-h-64 overflow-y-auto');
    expect(WALLET_MODAL_SRC).toContain('Select all');
    expect(WALLET_MODAL_SRC).toContain('Clear all');
  });

  it('categories thread App -> WalletsView -> WalletModal', () => {
    expect(APP_SRC).toMatch(/<WalletsView[\s\S]*?categories=\{categories\}/);
    expect(WALLETS_VIEW_SRC).toContain('categories?: Category[];');
    expect(WALLETS_VIEW_SRC).toContain('categories={categories}');
  });
});

describe('TransactionModal wiring (v7.6.31)', () => {
  it('computes the visible list from the form selected wallet, always including the current + split categories', () => {
    expect(TXMODAL_SRC).toContain('getVisibleCategories(categories, selectedWallet, [');
    expect(TXMODAL_SRC).toContain('...splitRows.map((r) => r.categoryId)');
  });

  it('both CategoryPickerModal instances receive the visible list', () => {
    const count = TXMODAL_SRC.split('categories={visibleCategories}').length - 1;
    expect(count).toBe(2);
  });

  it('filteredCats and the effectiveCategoryId fallback use the visible list', () => {
    expect(TXMODAL_SRC).toContain('const cats = visibleCategories.filter(');
    expect(TXMODAL_SRC).toContain('}, [visibleCategories, type, allTransactions, lang]);');
    expect(TXMODAL_SRC).toContain(
      "const effectiveCategoryId = categoryId ? categoryId : (filteredCats[0]?.id || '');",
    );
  });

  it('the v7.6.14 explicit-category vehicle gate is untouched (neutral fresh open)', () => {
    expect(TXMODAL_SRC).toContain(
      'const explicitCatObj = categoryId ? categories.find((c) => c.id === categoryId) : undefined;',
    );
  });

  it('CategoryPickerModal itself is untouched — the list is filtered at the call site', () => {
    const pickerSrc = readFileSync(
      new URL('../../components/CategoryPickerModal.tsx', import.meta.url),
      'utf8',
    );
    expect(pickerSrc).not.toContain('hiddenCategoryIds');
    expect(pickerSrc).not.toContain('getVisibleCategories');
  });
});

describe('shared-wallet mirror + rules (v7.6.31)', () => {
  it('the shared payload carries the denylist and both publishers write it explicitly', () => {
    expect(SHARED_SVC_SRC).toContain('hiddenCategoryIds?: string[];');
    expect(SHARED_SVC_SRC).toContain('hiddenCategoryIds: [...(wallet.hiddenCategoryIds || [])]');
    expect(AUTH_CTX_SRC).toContain('hiddenCategoryIds: [...(wallet.hiddenCategoryIds || [])]');
  });

  it('firestore.rules has NO field whitelist for wallet docs — no rules change needed', () => {
    expect(RULES_SRC).toContain('match /wallets/{walletId}');
    expect(RULES_SRC).not.toContain('hiddenCategoryIds');
  });
});

describe('Version bump to v7.6.31 (build 345)', () => {
  it('version surfaces agree on v7.6.31 / build 345', () => {
    expect(CURRENT_APP_VERSION).toBe('v7.6.31');
    expect(CURRENT_BUILD_NUMBER).toBe(345);
    expect(VERSION_JSON.version).toBe('v7.6.31');
    expect(VERSION_JSON.buildNumber).toBe(345);
    const entry = VERSION_HISTORY[0];
    expect(entry.version).toBe('v7.6.31');
    expect(entry.buildNumber).toBe(345);
    expect(entry.changesMy).toEqual(VERSION_JSON.changesMy);
    expect(entry.changesEn).toEqual(VERSION_JSON.changesEn);
    expect(entry.changesMy).toHaveLength(1);
    expect(entry.changesEn).toHaveLength(1);
    expect(entry.changesMy[0]).toBe(
      'Wallet တစ်ခုချင်းစီမှာ ပြမယ့် Category တွေကို ရွေးနိုင်သည် — မလိုတဲ့ Category တွေကို ဖြုတ်ထားရင် စာရင်းသွင်းတဲ့အခါ မပေါ်တော့ပါ',
    );
    expect(entry.changesEn[0]).toBe(
      'Each wallet can choose which categories it shows — hidden categories no longer appear when entering records for that wallet.',
    );
    expect([...entry.changesMy, ...entry.changesEn].join(' ')).not.toContain('Admin');
  });

  it('the helper module exports the documented API', () => {
    expect(HELPER_SRC).toContain('export function getVisibleCategories');
    expect(HELPER_SRC).toContain('export function isCategoryHiddenForWallet');
  });

  // Regression: the v7.6.31 checklist useMemos were first placed AFTER
  // `if (!isOpen) return null;` — opening the modal then ran more hooks
  // than the closed render and React threw error #310 (whole-app crash).
  // The early return must sit after every hook call in the component.
  it('WalletModal runs no hooks after its isOpen early return', () => {
    const returns = WALLET_MODAL_SRC.split('if (!isOpen) return null;');
    expect(returns).toHaveLength(2);
    const afterReturn = returns[1];
    expect(afterReturn).not.toMatch(/use(State|Effect|Memo|Callback|Ref)\s*\(/);
  });
});
