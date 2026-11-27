// [v7.6.39] Shop cards in ShopsView are compact: spacing and sizing
// only — card padding, header gaps, button-row gaps, the menu-section
// spacing, the add-item form spacing, and the grid gap. NOTHING is
// removed: every menu item, price, label, badge, and button (Report,
// add-item, edit/delete/share, vote, menu actions) stays with identical
// behavior, and no tap target shrinks below the settled 44px — the
// compaction comes from gaps/padding, never from button height.
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

const SHOP_SRC = readFileSync(
  new URL('../../components/shops/ShopCard.tsx', import.meta.url),
  'utf8',
);
const SHOPS_SRC = readFileSync(
  new URL('../../components/ShopsView.tsx', import.meta.url),
  'utf8',
);
const VERSION_JSON = JSON.parse(
  readFileSync(new URL('../../../public/version.json', import.meta.url), 'utf8'),
);
const count = (src: string, needle: string) =>
  src.split(needle).length - 1;

describe('Shop cards are compact (v7.6.39)', () => {
  it('the compact view uses the tightened padding and gaps', () => {
    expect(SHOP_SRC).toContain('rounded-2xl p-3 shadow-sm');
    expect(SHOP_SRC).toContain('w-10 h-10 rounded-2xl');
    // [v7.6.40] Address / phones / KPay share ONE details box.
    expect(SHOP_SRC).toContain('<div className="mt-2 bg-slate-50 rounded-xl border border-slate-200 p-2 space-y-1">');
    expect(SHOP_SRC).toContain('bg-white p-2 rounded-xl border border-slate-200 space-y-1.5');
  });

  it('the grid view uses the tightened padding and gaps', () => {
    // [v7.6.40] The name moved up into the badge row; the phone
    // bar, accordion toggle, expanded section, and footer are
    // tightened; KPay / address / notes share ONE details box.
    // [v7.6.42] Header padding and the phone/details/expanded
    // margins tightened one more step.
    expect(SHOP_SRC).toContain('<div className="p-3 pb-2">');
    expect(SHOP_SRC).toContain('mt-1.5 p-1.5 bg-emerald-50');
    expect(SHOP_SRC).toContain('w-full px-3.5 py-2.5 min-h-[44px]');
    expect(SHOP_SRC).toContain('<div className="px-3 pt-0.5 pb-2 space-y-1.5">');
    expect(SHOP_SRC).toContain('<div className="mt-1.5 bg-slate-50 rounded-xl border border-slate-200 p-2 space-y-1.5">');
  });

  it('the ShopsView card grids and compact lists are tightened', () => {
    // [v7.6.63] Compact round: both card grids gap-3 -> gap-2.5.
    expect(count(SHOPS_SRC, 'lg:grid-cols-3 gap-2.5')).toBe(2);
    expect(SHOPS_SRC).toContain('<div className="space-y-2">');
    expect(SHOPS_SRC).not.toContain('lg:grid-cols-3 gap-4');
    expect(SHOPS_SRC).not.toContain('lg:grid-cols-3 gap-3');
  });

  it('the old bulky sizes are gone from the card', () => {
    expect(SHOP_SRC).not.toContain('rounded-2xl p-4');
    expect(SHOP_SRC).not.toContain('w-11 h-11');
    expect(SHOP_SRC).not.toContain('mt-3 pt-3 space-y-3');
    expect(SHOP_SRC).not.toContain('p-5 pb-3');
    expect(SHOP_SRC).not.toContain('p-4 pt-1 space-y-3');
    expect(SHOP_SRC).not.toContain('mt-3.5');
    expect(SHOP_SRC).not.toContain('space-y-2.5');
    expect(SHOP_SRC).not.toContain('p-2.5 space-y-2');
  });

  it('every menu item, price, label, badge, and button stays with identical behavior', () => {
    // Menu + prices: add-item form (both views share the handler) and
    // per-item delete keep their handlers and labels.
    expect(SHOP_SRC).toContain('onSubmit={handleAddItem}');
    expect(SHOP_SRC).toContain('onDeletePricingItem(shop, idx)');
    expect(SHOP_SRC).toContain('ဈေးနှုန်းအသစ် ထည့်သွင်းမည်');
    expect(SHOP_SRC).toContain('Save Price');
    // Vote, Report, edit, delete, copy, maps — handlers and labels.
    expect(SHOP_SRC).toContain('onToggleVote(pub)');
    expect(SHOP_SRC).toContain('helpfulCount');
    expect(SHOP_SRC).toContain('အသုံးဝင်ကြောင်း မဲပေးမည်');
    expect(SHOP_SRC).toContain('Helpful Vote');
    expect(SHOP_SRC).toContain('onReport?.(shop)');
    expect(SHOP_SRC).toContain('အကြောင်းကြား');
    expect(SHOP_SRC).toContain('Report');
    expect(SHOP_SRC).toContain('onOpenEdit(shop)');
    expect(SHOP_SRC).toContain('onDelete(shop.id, shop.name)');
    expect(SHOP_SRC).toContain('handleCopyText');
    expect(SHOP_SRC).toContain('https://www.google.com/maps/search/?api=1&query=');
    // Phone / address / KPay / notes sections stay.
    expect(SHOP_SRC).toContain('primaryPhone');
    expect(SHOP_SRC).toContain('generalNotes');
    expect(SHOP_SRC).toContain('kpayNumber');
  });

  it('no tap target shrinks below the settled 44px', () => {
    expect(count(SHOP_SRC, 'min-h-[44px]')).toBe(38);
    // [v7.6.43] 26 -> 27: the new subcategory filter select is itself
    // a 44px target. Nothing shrank; one control was added.
    // [v7.6.44] 27 -> 28: the global "Refresh All Menus" header button
    // is itself a 44px target. Nothing shrank; one control was added.
    // [v7.6.63] 28 -> 27: the Row 4 needs-details button moved to
    // Row 1 beside Unknown as an h-11 (44px) toggle — same target
    // height, different class spelling, so the min-h-[44px] count
    // drops by one. Nothing shrank; one control moved.
    expect(count(SHOPS_SRC, 'min-h-[44px]')).toBe(27);
  });

  it('version pins roll to v7.6.42 / build 356', () => {
    expect(CURRENT_APP_VERSION).toBe('v7.6.63');
    expect(CURRENT_BUILD_NUMBER).toBe(377);
    expect(VERSION_HISTORY[0].version).toBe('v7.6.63');
    expect(VERSION_HISTORY[0].buildNumber).toBe(377);
    expect(VERSION_JSON.version).toBe('v7.6.63');
    expect(VERSION_JSON.buildNumber).toBe(377);
    expect(VERSION_HISTORY[0].changesMy).toContain(
      'သိမ်းတဲ့အခါ မျက်နှာပြင်မှာ ပြထားတဲ့ စုစုပေါင်းအတိုင်း သိမ်းပါပြီ — ၀ ကျပ် ဖြစ်သွားတာ မရှိတော့ပါ',
    );
    expect(VERSION_HISTORY[0].changesEn).toContain(
      "Saving stores the total shown on screen — it can no longer become 0 kyat",
    );
  });
});
