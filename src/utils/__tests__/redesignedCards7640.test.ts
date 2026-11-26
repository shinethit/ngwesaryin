// [v7.6.40] Wallet and shop cards are REDESIGNED (not just tighter
// spacing): the wallet name moves up into the header row, the
// balance / flow / Reconcile share one row, the shop name shares
// its row with the badges, and KPay + address + notes share one
// details box. NOTHING is removed: every number, label, badge,
// menu item, price, and button stays with identical behavior, no
// name is truncated away, and no tap target shrinks below the
// settled 44px. The separate balance label row above the wallet
// balance is the ONE removal, by design — the balance stays
// unmistakable (big bold number + the currency flag in Row A).
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
const SHOP_SRC = readFileSync(
  new URL('../../components/shops/ShopCard.tsx', import.meta.url),
  'utf8',
);
const VERSION_JSON = JSON.parse(
  readFileSync(new URL('../../../public/version.json', import.meta.url), 'utf8'),
);
const count = (src: string, needle: string) =>
  src.split(needle).length - 1;
// The wallet card block only: from the cards grid to the Transfer
// Funds modal (modals are excluded, so bulky classes elsewhere in
// the file must not fail these assertions).
const CARD_BLOCK = WALLET_SRC.slice(
  WALLET_SRC.indexOf('lg:grid-cols-3 gap-3'),
  WALLET_SRC.indexOf('{/* Transfer Funds Modal */}'),
);

describe('Redesigned wallet cards (v7.6.40)', () => {
  it('Row A: the name sits in the header row beside the icon and flag', () => {
    // One header row: icon group, name, actions — no separate
    // info block below it.
    expect(CARD_BLOCK).toContain('<div className="flex items-start justify-between gap-3">');
    expect(CARD_BLOCK).toContain(
      '<h3 className="font-bold text-base text-slate-900 tracking-tight break-words min-w-0 flex-1">',
    );
    expect(CARD_BLOCK).not.toContain('<div className="mt-2.5">');
    // The name wraps instead of truncating away: break-words, no truncate.
    const h3 = CARD_BLOCK.slice(CARD_BLOCK.indexOf('<h3 className="font-bold text-base'));
    expect(h3.startsWith('<h3 className="font-bold text-base text-slate-900 tracking-tight break-words min-w-0 flex-1">')).toBe(true);
  });

  it('Row A order: icon group with flag, then name; badges then actions on the row beneath', () => {
    const flagIdx = CARD_BLOCK.indexOf('{currInfo.flag} {currInfo.code}');
    const nameIdx = CARD_BLOCK.indexOf('min-w-0 flex-1');
    const badgesIdx = CARD_BLOCK.indexOf('handleToggleIncludeInTotals');
    const actionsIdx = CARD_BLOCK.indexOf('setSelectedWalletForShare(wallet)');
    expect(flagIdx).toBeGreaterThan(-1);
    expect(nameIdx).toBeGreaterThan(flagIdx);
    expect(badgesIdx).toBeGreaterThan(nameIdx);
    expect(actionsIdx).toBeGreaterThan(badgesIdx);
    // Badges still flow on their own wrapping row under Row A.
    expect(CARD_BLOCK).toContain('flex items-center gap-1.5 flex-wrap mt-1');
  });

  it('Row B: balance, this-month flow, and Reconcile share one row', () => {
    expect(CARD_BLOCK).toContain('flex flex-wrap items-baseline gap-x-2 gap-y-0.5');
    expect(CARD_BLOCK).toContain('text-xl font-black text-slate-900 tracking-tight leading-tight');
    expect(CARD_BLOCK).toContain('ဒီလ');
    expect(CARD_BLOCK).toContain('This month');
    expect(CARD_BLOCK).toContain('onOpenReconcileModal(wallet.id)');
    // The separate label row above the balance is gone by design.
    expect(CARD_BLOCK).not.toContain('လက်ကျန်ငွေ');
  });

  it('the foreign-currency line is inline under Row B with the same text and values', () => {
    expect(CARD_BLOCK).toContain('mt-0.5 flex items-center gap-1.5 text-[11px] font-semibold text-slate-500');
    expect(CARD_BLOCK).toContain('1 {wallet.currency} = {effectiveRate.toLocaleString()} Ks');
    expect(CARD_BLOCK).toContain('≈ {convertedBalance.toLocaleString()} MMK');
    expect(CARD_BLOCK).not.toContain('p-1.5 bg-slate-50 rounded-xl');
  });

  it('every wallet badge, button, and handler stays', () => {
    expect(CARD_BLOCK).toContain('မူလအကောင့်');
    expect(CARD_BLOCK).toContain('စုစုပေါင်းထဲ ရောမည်');
    expect(CARD_BLOCK).toContain('မျှဝေထားသည်');
    expect(CARD_BLOCK).toContain('sharedByLabel(wallet)');
    expect(CARD_BLOCK).toContain('handleOpenEditWallet(wallet)');
    expect(CARD_BLOCK).toContain('requestDeleteWallet(wallet)');
    expect(CARD_BLOCK).toContain('handleTransferOwnershipClick(wallet)');
    expect(CARD_BLOCK).toContain('မှတ်တမ်းသွင်း');
    expect(CARD_BLOCK).toContain('ငွေလွှဲ');
    expect(CARD_BLOCK).toContain('handleOpenTransferModal(wallet.id)');
    expect(CARD_BLOCK).toContain('absolute top-0 left-0 right-0 h-1.5');
    expect(CARD_BLOCK).toContain('min-w-9 min-h-9 p-2.5');
    expect(CARD_BLOCK).toContain('col-span-3 py-2 px-2.5');
    expect(CARD_BLOCK).toContain('col-span-2 py-2 px-2');
  });
});

describe('Redesigned shop cards (v7.6.40)', () => {
  it('the grid view name keeps full width; only the vote button shares its row', () => {
    // The old separate "Shop Name" block is gone; the name is the
    // first child of the wrapping badge row, and it wraps instead
    // of truncating away. [v7.6.42] Edit/delete moved to the footer
    // row: the header actions narrowed long names to 3 lines.
    expect(SHOP_SRC).not.toContain('{/* Shop Name */}');
    expect(SHOP_SRC).toContain(
      '<h3 className="font-extrabold text-slate-900 text-base tracking-tight leading-normal break-words min-w-0">',
    );
    expect(SHOP_SRC).toContain('<div className="p-3 pb-2">');
    expect(SHOP_SRC).toContain('Edit/delete moved here from the header row');
  });

  it('KPay, address, and notes share ONE details box in both views', () => {
    // Compact view: one box, space-y-1. Grid view: one box, space-y-1.5.
    expect(count(SHOP_SRC, 'border border-slate-200 p-2 space-y-1">')).toBe(1);
    expect(count(SHOP_SRC, 'border border-slate-200 p-2 space-y-1.5">')).toBe(1);
    expect(SHOP_SRC).toContain('(shop.kpayNumber || primaryAddress || shop.generalNotes)');
    expect(SHOP_SRC).toContain('(primaryAddress || secondaryPhones.length > 0 || shop.kpayNumber)');
    // The three separate boxes are gone.
    expect(SHOP_SRC).not.toContain('bg-indigo-50/70 border border-indigo-100 rounded-xl');
    expect(SHOP_SRC).not.toContain('bg-amber-50/40 p-1.5 rounded-xl border border-amber-100/60');
    // …but every detail line and the KPay copy button stay.
    expect(SHOP_SRC).toContain('normalizedKpay || shop.kpayNumber');
    expect(SHOP_SRC).toContain('{primaryAddress}');
    expect(SHOP_SRC).toContain('📝 {shop.generalNotes}');
    expect(SHOP_SRC).toContain('handleCopyText(`kpay-${shop.id}`');
  });

  it('menu items, prices, the add-item form, and all buttons stay', () => {
    expect(SHOP_SRC).toContain('onSubmit={handleAddItem}');
    expect(SHOP_SRC).toContain('onDeletePricingItem(shop, idx)');
    expect(SHOP_SRC).toContain('ဈေးနှုန်းအသစ် ထည့်သွင်းမည်');
    expect(SHOP_SRC).toContain('Save Price');
    expect(SHOP_SRC).toContain('onToggleVote(pub)');
    expect(SHOP_SRC).toContain('onReport?.(shop)');
    expect(SHOP_SRC).toContain('အကြောင်းကြား');
    expect(SHOP_SRC).toContain('onOpenEdit(shop)');
    expect(SHOP_SRC).toContain('onDelete(shop.id, shop.name)');
    expect(SHOP_SRC).toContain('handleCopyText');
    expect(SHOP_SRC).toContain('https://www.google.com/maps/search/?api=1&query=');
  });

  it('no tap target shrinks below the settled 44px', () => {
    expect(count(SHOP_SRC, 'min-h-[44px]')).toBe(38);
    expect(SHOP_SRC).toContain('w-full px-3.5 py-2.5 min-h-[44px]');
    expect(SHOP_SRC).toContain('mt-1.5 p-1.5 bg-emerald-50');
  });

  it('version pins roll to v7.6.42 / build 356', () => {
    expect(CURRENT_APP_VERSION).toBe('v7.6.57');
    expect(CURRENT_BUILD_NUMBER).toBe(371);
    expect(VERSION_HISTORY[0].version).toBe('v7.6.57');
    expect(VERSION_HISTORY[0].buildNumber).toBe(371);
    expect(VERSION_JSON.version).toBe('v7.6.57');
    expect(VERSION_JSON.buildNumber).toBe(371);
    expect(VERSION_HISTORY[0].changesMy).toContain(
      'စာရင်းမျက်နှာက လက်ကျန်ကတ်ရဲ့ အရောင်တွေ စိုစိုတောက်တောက် ဖြစ်လာပါပြီ — အနီ၊ အဝါ၊ အဖြူရဲ့ အဓိပ္ပာယ်တွေ အတိုင်းပါပဲ',
    );
    expect(VERSION_HISTORY[0].changesEn).toContain(
      'The Records balance card colours are vivid now — red, yellow and white keep their meanings',
    );
  });
});
