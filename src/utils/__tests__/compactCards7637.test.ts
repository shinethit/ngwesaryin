// [v7.6.37] Wallet cards in WalletsView are compact: spacing and
// sizing only — card padding, icon size, header/info gaps, the
// balance-section spacing, and the balance font. NOTHING is removed:
// every number, label, badge, count, and button stays with identical
// behavior, and the action-button hit areas are untouched.
// Source-text assertions follow the established pattern (no test
// renderer in this repo; vitest node env). NO path comparisons:
// sources are read via new URL(..., import.meta.url).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  VERSION_HISTORY,
  CURRENT_APP_VERSION,
  CURRENT_BUILD_NUMBER,
} from '../../data/versionHistory';

const WALLET_SRC = readFileSync(
  new URL('../../components/WalletsView.tsx', import.meta.url),
  'utf8',
);
const VERSION_JSON = JSON.parse(
  readFileSync(new URL('../../../public/version.json', import.meta.url), 'utf8'),
);
// The card block only: from the cards grid to the Transfer Funds modal
// (modals are excluded from this sweep, so bulky classes elsewhere in
// the file must not fail these assertions).
const CARD_BLOCK = WALLET_SRC.slice(
  WALLET_SRC.indexOf('lg:grid-cols-3 gap-3'),
  WALLET_SRC.indexOf('{/* Transfer Funds Modal */}'),
);

describe('Wallet cards are compact (v7.6.37)', () => {
  it('the grid, card padding, icon, and gaps are compact', () => {
    expect(WALLET_SRC).toContain('lg:grid-cols-3 gap-3');
    expect(CARD_BLOCK).toContain('bg-white rounded-3xl p-3 border');
    expect(CARD_BLOCK).toContain('w-10 h-10 rounded-2xl');
    expect(CARD_BLOCK).toContain('w-5 h-5 text-white');
    expect(CARD_BLOCK).toContain('<div className="mt-2.5">');
    expect(CARD_BLOCK).toContain('flex-wrap mt-1">');
    expect(CARD_BLOCK).toContain('mt-2 pt-1.5 border-t border-slate-100');
    expect(CARD_BLOCK).toContain('mt-3 pt-2.5 border-t border-slate-100 space-y-1.5');
    expect(CARD_BLOCK).toContain('text-xl font-black');
    expect(CARD_BLOCK).toContain('p-1.5 bg-slate-50 rounded-xl');
    expect(CARD_BLOCK).toContain('<div className="pt-1">');
  });

  it('the old bulky sizes are gone from the card block', () => {
    expect(CARD_BLOCK).not.toContain('w-12 h-12 rounded-2xl');
    expect(CARD_BLOCK).not.toContain('w-6 h-6 text-white');
    expect(CARD_BLOCK).not.toContain('mt-3.5');
    expect(CARD_BLOCK).not.toContain('mt-5 pt-3');
    expect(CARD_BLOCK).not.toContain('text-2xl font-black');
    expect(CARD_BLOCK).not.toContain('lg:grid-cols-3 gap-4');
  });

  it('every number, label, badge, and button stays with identical behavior', () => {
    // Balance + flow + foreign pill.
    expect(CARD_BLOCK).toContain('လက်ကျန်ငွေ');
    expect(CARD_BLOCK).toContain('Balance');
    expect(CARD_BLOCK).toContain('ဒီလ');
    expect(CARD_BLOCK).toContain('This month');
    expect(CARD_BLOCK).toContain('1 {wallet.currency}');
    expect(CARD_BLOCK).toContain('convertedBalance');
    // Badges: primary, scope toggle, shared indicators.
    expect(CARD_BLOCK).toContain('မူလအကောင့်');
    expect(CARD_BLOCK).toContain('စုစုပေါင်းထဲ ရောမည်');
    expect(CARD_BLOCK).toContain('မျှဝေထားသည်');
    expect(CARD_BLOCK).toContain('handleToggleIncludeInTotals');
    expect(CARD_BLOCK).toContain('sharedByLabel(wallet)');
    // Actions: share, edit, delete, transfer-ownership, reconcile,
    // record, transfer — handlers and labels unchanged.
    expect(CARD_BLOCK).toContain('setSelectedWalletForShare(wallet)');
    expect(CARD_BLOCK).toContain('handleOpenEditWallet(wallet)');
    expect(CARD_BLOCK).toContain('requestDeleteWallet(wallet)');
    expect(CARD_BLOCK).toContain('handleTransferOwnershipClick(wallet)');
    expect(CARD_BLOCK).toContain('onOpenReconcileModal(wallet.id)');
    expect(CARD_BLOCK).toContain('စာရင်းညှိမည်');
    expect(CARD_BLOCK).toContain('Reconcile');
    expect(CARD_BLOCK).toContain('မှတ်တမ်းသွင်း');
    expect(CARD_BLOCK).toContain('ငွေလွှဲ');
    expect(CARD_BLOCK).toContain('handleOpenTransferModal(wallet.id)');
    // Accent strip stays.
    expect(CARD_BLOCK).toContain('absolute top-0 left-0 right-0 h-1.5');
  });

  it('tap targets are untouched: action buttons and quick-add buttons keep their sizes', () => {
    expect(CARD_BLOCK).toContain('min-w-9 min-h-9 p-2.5');
    expect(CARD_BLOCK).toContain('col-span-3 py-2 px-2.5');
    expect(CARD_BLOCK).toContain('col-span-2 py-2 px-2');
  });

  it('version pins roll to v7.6.37 / build 351', () => {
    expect(CURRENT_APP_VERSION).toBe('v7.6.37');
    expect(CURRENT_BUILD_NUMBER).toBe(351);
    expect(VERSION_HISTORY[0].version).toBe('v7.6.37');
    expect(VERSION_HISTORY[0].buildNumber).toBe(351);
    expect(VERSION_JSON.version).toBe('v7.6.37');
    expect(VERSION_JSON.buildNumber).toBe(351);
    expect(VERSION_HISTORY[0].changesMy).toContain(
      'ပိုက်ဆံအိတ်ကတ်တွေကို ကျစ်လစ်အောင် ပြင်သည် — အချက်အလက်နဲ့ ခလုတ်အကုန် ရှိနေမည်',
    );
    expect(VERSION_HISTORY[0].changesEn).toContain(
      'Wallet cards are now compact — every detail and button stays in place.',
    );
  });
});
