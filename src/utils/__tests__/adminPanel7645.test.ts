// [v7.6.45] Part A — AdminPanel thorough check: layout and
// navigation usability fixes only, ZERO function loss. Wiring
// pins are source-text assertions (no test renderer in this repo;
// vitest node env). NO path comparisons: sources are read via
// new URL(..., import.meta.url). The full before/after function
// inventory lives in the delivery report; these pins guard the
// fixes themselves. Admin strings never appear in the public
// changelog (guarded by the version block below + the per-file
// version blocks).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  VERSION_HISTORY,
  CURRENT_APP_VERSION,
  CURRENT_BUILD_NUMBER,
} from '../../data/versionHistory';

const VERSION_JSON = JSON.parse(
  readFileSync(new URL('../../../public/version.json', import.meta.url), 'utf8'),
);

const ADMIN_SRC = readFileSync(
  new URL('../../components/AdminPanel.tsx', import.meta.url),
  'utf8',
);

const count = (needle: string) => ADMIN_SRC.split(needle).length - 1;

describe('AdminPanel usability (v7.6.45 Part A)', () => {
  it('the header is one row on phones — the close button sits beside the title, not on its own row', () => {
    expect(ADMIN_SRC).toContain('flex items-start justify-between gap-2 sm:gap-4 pb-2 sm:pb-4 border-b border-slate-100 shrink-0');
    // The close button itself carries no self-end/self-auto alignment
    // (the Overview Refresh button legitimately keeps self-end).
    expect(ADMIN_SRC).toContain('p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors shrink-0 cursor-pointer');
  });

  it('all six tab buttons share one padding', () => {
    expect(ADMIN_SRC).not.toContain('px-2 sm:px-3 py-2.5 rounded-xl');
    expect(count('py-2 sm:py-2.5 rounded-xl')).toBeGreaterThanOrEqual(6);
  });

  it('all six tab bodies share one spacing', () => {
    expect(count('pt-3 space-y-4 pr-1')).toBe(6);
    expect(ADMIN_SRC).not.toContain('pt-4 space-y-5');
    expect(ADMIN_SRC).not.toContain('pt-3 space-y-5');
  });

  it('the visitor KPI card matches the other three cards', () => {
    expect(ADMIN_SRC).not.toContain('rounded-2xl p-4 shadow-2xs space-y-1');
  });

  it('the duplicate broadcast-counter navigation button is gone; the count text stays', () => {
    expect(ADMIN_SRC).not.toContain('ကြည့်ရန် →');
    expect(ADMIN_SRC).toContain('ခု ကြေညာထားဆဲ');
    expect(ADMIN_SRC).toContain('Quick Navigation Shortcuts');
  });

  it('the code-status pills hide in the Users view while the Users pill stays', () => {
    expect(ADMIN_SRC).toContain("{statusFilter !== 'users' && (");
    expect(ADMIN_SRC).toContain("onClick={() => setStatusFilter('users')}");
  });

  it('the Active visitor pill shows its count, like the other three pills', () => {
    expect(ADMIN_SRC).toContain('activeVisitorsCount');
    expect(ADMIN_SRC).toContain("({activeVisitorsCount})");
  });

  it('the Analytics tab can recount the headline visitor total on demand', () => {
    expect(ADMIN_SRC).toContain('refreshVisitorsTotalCount');
    expect(ADMIN_SRC).toContain('စုစုပေါင်း အသစ်ယူမည်');
  });

  it('closing the panel guards a half-written broadcast draft like the contact form', () => {
    expect(ADMIN_SRC).toContain('isBroadcastDraftDirty');
    expect(ADMIN_SRC).toContain('ကြေညာချက် အကြမ်း မသိမ်းရသေးပါ');
  });

  it('the transactions modal resets its page size when closed', () => {
    expect(count('setModalVisibleCount(100); setShowTxManagerModal(false)')).toBe(2);
  });

  it('dead code is gone: the unwired wallet-backfill state and the unused Database icon', () => {
    expect(ADMIN_SRC).not.toContain('isBackfillingWallets');
    expect(ADMIN_SRC).not.toContain('Flame, Database,');
  });

  it('the shop error strings no longer name a Refresh that cannot reload them', () => {
    expect(ADMIN_SRC).not.toContain('ဆိုင်အကြောင်း Report များ ဆွဲယူ၍ မရပါ — အင်တာနက်/ခွင့်ပြုချက်ကို စစ်ဆေးပြီး Refresh နှိပ်ပါ');
    expect(ADMIN_SRC).not.toContain('ဈေးနှုန်း Alert များ ဆွဲယူ၍ မရပါ — အင်တာနက်/ခွင့်ပြုချက်ကို စစ်ဆေးပြီး Refresh နှိပ်ပါ');
    expect(ADMIN_SRC).toContain('ဆိုင်အကြောင်း Report များ ဆွဲယူ၍ မရပါ — အင်တာနက်/ခွင့်ပြုချက်ကို စစ်ဆေးပါ');
  });

  it('every tab still renders its tables and actions (no function loss)', () => {
    // Spot pins for one action per tab + the shared modals.
    expect(ADMIN_SRC).toContain('handleGenerateCodes');
    expect(ADMIN_SRC).toContain('handleSaveMessage');
    expect(ADMIN_SRC).toContain('handleSaveContactInfo');
    expect(ADMIN_SRC).toContain('handleDeleteVisitor');
    expect(ADMIN_SRC).toContain('runShopImport');
    expect(ADMIN_SRC).toContain('handleDeleteShopFromReport');
    expect(ADMIN_SRC).toContain('handleDismissShopPriceAlert');
    expect(ADMIN_SRC).toContain('handleGrantPlanWithDuration');
    expect(ADMIN_SRC).toContain('handlePurgeCategoryTransactions');
    expect(ADMIN_SRC).toContain('<QuotaDashboard');
  });
});

describe('Version pins roll to v7.6.52 / build 366', () => {
  it('constants, version.json and the top history entry agree, with no Admin strings', () => {
    expect(CURRENT_APP_VERSION).toBe('v7.6.57');
    expect(CURRENT_BUILD_NUMBER).toBe(371);
    expect(VERSION_JSON.version).toBe('v7.6.57');
    expect(VERSION_JSON.buildNumber).toBe(371);
    const top = VERSION_HISTORY[0];
    expect(top.version).toBe('v7.6.57');
    expect(top.buildNumber).toBe(371);
    expect(top.changesMy.join(' ')).not.toContain('Admin');
    expect(top.changesEn.join(' ')).not.toContain('Admin');
    expect(top.changesMy.length).toBe(4);
    expect(top.changesEn.length).toBe(4);
    expect(VERSION_JSON.changesMy).toEqual(top.changesMy);
    expect(VERSION_JSON.changesEn).toEqual(top.changesEn);
  });
});
