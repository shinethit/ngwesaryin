// [v7.6.09] Named savings pots — tracking-only progress toward a
// named goal. Pure helper tests (no Firestore, no component state) +
// wiring assertions (same pattern as expiryReminders7606.test.ts —
// the components have no test renderer in this repo; layout
// behaviour is verified by renders).
//
// Investigation locked in here: no pot type existed before — only
// MonthlySavingsTarget (a MONTHLY income-minus-expense target,
// guest-locked inside its own component). Pots persist like that
// target: the `ngwe_savings_pots` device key for everyone (guests
// included) plus the `savingsPots` field on the user document with
// merge:true for signed-in users; the user-document root update rule
// allows an owner to update ordinary fields freely and `savingsPots`
// is not a restricted upgrade field, so no rules change is needed.
// savedAmount is DERIVED (in minus out), never stored. IDs follow
// the app's `prefix_Date.now()_randomSuffix` pattern. The pots
// section sits BELOW MonthlySavingsTarget in the Budget sub-tab of
// AnalyticsView, outside that card's own lock (the lock lives
// inside MonthlySavingsTarget itself — AnalyticsView has no
// view-level lock). The REAL whole-view lock is in App.tsx, which
// replaces AnalyticsView with a lock card for guests: the same
// pots section renders BELOW that lock card too, so pots stay
// reachable for everyone.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  SAVINGS_POTS_STORAGE_KEY,
  SAVINGS_POTS_CLOUD_FIELD,
  getPotProgress,
  getSavedAmount,
  isPotComplete,
  newSavingsPotContributionId,
  newSavingsPotId,
  sanitizeSavingsPots,
  summarizeActivePots,
  todayLocalDateString,
  validateSavingsPotEntry,
  validateSavingsPotInput,
  type SavingsPot,
  type SavingsPotContribution,
} from '../savingsPots';
import {
  VERSION_HISTORY,
  CURRENT_APP_VERSION,
  CURRENT_BUILD_NUMBER,
} from '../../data/versionHistory';

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
const TARGET_SRC = readFileSync(
  new URL('../../components/MonthlySavingsTarget.tsx', import.meta.url),
  'utf8',
);
const APP_SRC = readFileSync(
  new URL('../../App.tsx', import.meta.url),
  'utf8',
);
const RULES_SRC = readFileSync(
  new URL('../../../firestore.rules', import.meta.url),
  'utf8',
);
const VERSION_JSON = JSON.parse(
  readFileSync(new URL('../../../public/version.json', import.meta.url), 'utf8'),
);

function contribution(
  overrides: Partial<SavingsPotContribution> & { amount: number },
): SavingsPotContribution {
  return {
    id: `c-${overrides.amount}-${overrides.type ?? 'in'}`,
    type: 'in',
    date: '2026-11-20',
    ...overrides,
  };
}

function pot(overrides: Partial<SavingsPot> = {}): SavingsPot {
  return {
    id: 'pot-1',
    name: 'ဆိုင်ကယ် အသစ်',
    targetAmount: 1000000,
    createdAt: 1763600000000,
    contributions: [],
    ...overrides,
  };
}

describe('derived saved amount — never stored (v7.6.09)', () => {
  it('sums in minus out', () => {
    const p = pot({
      contributions: [
        contribution({ amount: 400000, type: 'in' }),
        contribution({ amount: 150000, type: 'in' }),
        contribution({ amount: 50000, type: 'out', note: 'အရေးပေါ်' }),
      ],
    });
    expect(getSavedAmount(p)).toBe(500000);
  });

  it('tracks the contributions list as entries change', () => {
    const p = pot({ contributions: [contribution({ amount: 100000 })] });
    expect(getSavedAmount(p)).toBe(100000);
    p.contributions.push(contribution({ amount: 30000, type: 'out' }));
    expect(getSavedAmount(p)).toBe(70000);
  });

  it('zero contributions means zero saved', () => {
    expect(getSavedAmount(pot())).toBe(0);
  });

  it('no stored saved field exists on the pot shape', () => {
    expect(HELPER_SRC).not.toMatch(/savedAmount\s*:/);
    expect(HELPER_SRC).not.toContain('savedAmount?');
  });
});

describe('progress, remaining and completion (v7.6.09)', () => {
  it('partial pot: percent and remaining', () => {
    const progress = getPotProgress(
      pot({ contributions: [contribution({ amount: 250000 })] }),
    );
    expect(progress.saved).toBe(250000);
    expect(progress.percent).toBe(25);
    expect(progress.clampedPercent).toBe(25);
    expect(progress.remaining).toBe(750000);
    expect(progress.complete).toBe(false);
    expect(isPotComplete(pot({ contributions: [contribution({ amount: 250000 })] }))).toBe(false);
  });

  it('over-100%: display percent clamps, saved stays exact', () => {
    const progress = getPotProgress(
      pot({ contributions: [contribution({ amount: 1500000 })] }),
    );
    expect(progress.percent).toBe(150);
    expect(progress.clampedPercent).toBe(100);
    expect(progress.saved).toBe(1500000);
    expect(progress.remaining).toBe(0);
    expect(progress.complete).toBe(true);
  });

  it('exactly at target completes and stays listed (no auto-archive)', () => {
    const p = pot({ contributions: [contribution({ amount: 1000000 })] });
    expect(isPotComplete(p)).toBe(true);
    expect(p.archived).toBeUndefined();
  });

  it('zero contributions: 0% and full remaining', () => {
    const progress = getPotProgress(pot());
    expect(progress.percent).toBe(0);
    expect(progress.clampedPercent).toBe(0);
    expect(progress.remaining).toBe(1000000);
  });
});

describe('validation (v7.6.09)', () => {
  it('create/edit: blank name rejected', () => {
    expect(validateSavingsPotInput('', 100000)).toBe('name-required');
    expect(validateSavingsPotInput('   ', 100000)).toBe('name-required');
  });

  it('create/edit: target must be greater than 0', () => {
    expect(validateSavingsPotInput('ဆိုင်ကယ်', 0)).toBe('target-invalid');
    expect(validateSavingsPotInput('ဆိုင်ကယ်', -5)).toBe('target-invalid');
    expect(validateSavingsPotInput('ဆိုင်ကယ်', Number.NaN)).toBe('target-invalid');
    expect(validateSavingsPotInput('ဆိုင်ကယ်', 1)).toBeNull();
  });

  it('entries: amount must be greater than 0', () => {
    expect(validateSavingsPotEntry(0, 'in', 0)).toBe('amount-invalid');
    expect(validateSavingsPotEntry(-100, 'out', 500000)).toBe('amount-invalid');
    expect(validateSavingsPotEntry(100, 'in', 0)).toBeNull();
  });

  it('withdrawal blocked when it exceeds saved — saved never goes negative', () => {
    expect(validateSavingsPotEntry(500001, 'out', 500000)).toBe('withdraw-exceeds');
    expect(validateSavingsPotEntry(500000, 'out', 500000)).toBeNull();
    expect(validateSavingsPotEntry(1, 'out', 0)).toBe('withdraw-exceeds');
  });

  it('duplicate names are allowed', () => {
    expect(validateSavingsPotInput('ဆိုင်ကယ် အသစ်', 100000)).toBeNull();
    expect(validateSavingsPotInput('ဆိုင်ကယ် အသစ်', 200000)).toBeNull();
    const pots = sanitizeSavingsPots([
      pot({ id: 'pot-a', name: 'ဆိုင်ကယ် အသစ်' }),
      pot({ id: 'pot-b', name: 'ဆိုင်ကယ် အသစ်' }),
    ]);
    expect(pots).toHaveLength(2);
  });
});

describe('archive and active summary (v7.6.09)', () => {
  it('archived pots are excluded from the active summary but keep history', () => {
    const active = pot({
      id: 'pot-active',
      contributions: [contribution({ amount: 200000 })],
    });
    const archived = pot({
      id: 'pot-archived',
      archived: true,
      targetAmount: 500000,
      contributions: [contribution({ amount: 500000 })],
    });
    const summary = summarizeActivePots([active, archived]);
    expect(summary.potCount).toBe(1);
    expect(summary.totalSaved).toBe(200000);
    expect(summary.totalTarget).toBe(1000000);
    expect(summary.totalRemaining).toBe(800000);
    expect(summary.completedCount).toBe(0);
    // The archived pot itself still carries its history.
    expect(archived.contributions).toHaveLength(1);
    expect(getSavedAmount(archived)).toBe(500000);
  });

  it('completed active pots count separately', () => {
    const summary = summarizeActivePots([
      pot({ contributions: [contribution({ amount: 1000000 })] }),
    ]);
    expect(summary.completedCount).toBe(1);
    expect(summary.totalRemaining).toBe(0);
  });
});

describe('persistence shape and sanitize (v7.6.09)', () => {
  it('storage key and cloud field are locked', () => {
    expect(SAVINGS_POTS_STORAGE_KEY).toBe('ngwe_savings_pots');
    expect(SAVINGS_POTS_CLOUD_FIELD).toBe('savingsPots');
    expect(HELPER_SRC).toContain("export const SAVINGS_POTS_STORAGE_KEY = 'ngwe_savings_pots';");
    expect(HELPER_SRC).toContain("export const SAVINGS_POTS_CLOUD_FIELD = 'savingsPots';");
  });

  it('sanitize keeps valid pots and drops malformed ones', () => {
    const cleaned = sanitizeSavingsPots([
      pot(),
      { id: '', name: 'bad', targetAmount: 1, createdAt: 1, contributions: [] },
      { id: 'x', name: '   ', targetAmount: 1, createdAt: 1, contributions: [] },
      { id: 'x', name: 'bad', targetAmount: 0, createdAt: 1, contributions: [] },
      'not-a-pot',
      null,
    ]);
    expect(cleaned).toHaveLength(1);
    expect(cleaned[0].name).toBe('ဆိုင်ကယ် အသစ်');
  });

  it('sanitize drops malformed contributions and trims names/notes', () => {
    const cleaned = sanitizeSavingsPots([
      pot({
        name: '  ဆိုင်ကယ် အသစ်  ',
        contributions: [
          contribution({ amount: 100000, note: '  လစာ  ' }),
          contribution({ amount: -5 }),
          { id: 'bad', amount: 10, type: 'sideways', date: '2026-11-20' } as unknown as SavingsPotContribution,
        ],
      }),
    ]);
    expect(cleaned).toHaveLength(1);
    expect(cleaned[0].name).toBe('ဆိုင်ကယ် အသစ်');
    expect(cleaned[0].contributions).toHaveLength(1);
    expect(cleaned[0].contributions[0].note).toBe('လစာ');
  });

  it('ids follow the app prefix_Date.now()_randomSuffix pattern', () => {
    const potId = newSavingsPotId();
    const entryId = newSavingsPotContributionId();
    expect(potId.startsWith('pot_')).toBe(true);
    expect(entryId.startsWith('potentry_')).toBe(true);
    expect(newSavingsPotId()).not.toBe(potId);
    expect(todayLocalDateString(new Date(2026, 10, 23))).toBe('2026-11-23');
  });
});

describe('persistence wiring — same code path reads and writes (v7.6.09)', () => {
  it('component reads and writes the same device key', () => {
    expect(COMPONENT_SRC).toContain('safeGetItem(SAVINGS_POTS_STORAGE_KEY)');
    expect(COMPONENT_SRC).toContain('safeSetItem(SAVINGS_POTS_STORAGE_KEY, JSON.stringify(');
    expect(COMPONENT_SRC).toContain('SAVINGS_POTS_STORAGE_KEY');
  });

  it('component syncs through the user-document field with merge:true', () => {
    expect(COMPONENT_SRC).toContain('getDoc(doc(db, \'users\', user.uid))');
    expect(COMPONENT_SRC).toContain('data[SAVINGS_POTS_CLOUD_FIELD]');
    expect(COMPONENT_SRC).toContain('{ [SAVINGS_POTS_CLOUD_FIELD]:');
    expect(COMPONENT_SRC).toContain('{ merge: true }');
    expect(COMPONENT_SRC).toContain('safeSetDoc(doc(db, \'users\', user.uid)');
  });

  it('no rules change is needed: the root update rule allows ordinary fields', () => {
    // The owner update branch allows any non-premium field; the
    // restricted list contains only the upgrade fields.
    expect(RULES_SRC).toContain('touchingPremiumFields');
    expect(RULES_SRC).not.toContain('savingsPots');
    expect(RULES_SRC).not.toContain('savingsTargetDefault');
  });

  it('component mirrors the monthly-target cloud pattern (load, adopt, migrate)', () => {
    expect(COMPONENT_SRC).toContain('cloudReadyRef');
    expect(COMPONENT_SRC).toContain("setCloudState('synced')");
  });
});

describe('guest availability — no gate on the pots path (v7.6.09)', () => {
  it('component carries no plan, premium or lock tokens', () => {
    expect(COMPONENT_SRC).not.toContain('PlanType');
    expect(COMPONENT_SRC).not.toContain('premium');
    expect(COMPONENT_SRC).not.toContain('Premium');
    expect(COMPONENT_SRC).not.toContain('guest');
    expect(COMPONENT_SRC).not.toContain('Lock');
    expect(COMPONENT_SRC).not.toContain('onOpenUpgrade');
    expect(COMPONENT_SRC).not.toContain("from './MonthlySavingsTarget'");
    expect(COMPONENT_SRC).not.toContain('<MonthlySavingsTarget');
  });

  it('AnalyticsView renders pots with the wallet-transfer props and no plan prop', () => {
    expect(ANALYTICS_SRC).toContain('<SavingsPots lang={lang} wallets={wallets} categories={categories} onCreatePotTransfer={onCreatePotTransfer} />');
    expect(ANALYTICS_SRC).not.toContain('<SavingsPots lang={lang} plan=');
  });

  it('App renders the same pots section below the whole-view lock card', () => {
    // The gate itself is untouched — the lock card still replaces
    // AnalyticsView for guests; pots sit OUTSIDE it, below the card.
    // [v7.6.13] The guest-branch pots get the same wallet-transfer
    // props as the Budget-tab instance, so a picked wallet really
    // moves money for guests too.
    expect(APP_SRC).toContain("plan === 'guest' || !limits.hasBudgets");
    expect(APP_SRC).toContain('const SavingsPots = lazyWithRetry(');
    expect(APP_SRC).toContain('<SavingsPots lang={lang} wallets={computedWallets} categories={categories} onCreatePotTransfer={handleCreatePotTransfer} />');
    const lockAt = APP_SRC.indexOf('Guest Mode တွင် မရရှိနိုင်ပါ');
    const potsAt = APP_SRC.indexOf('<SavingsPots');
    expect(lockAt).toBeGreaterThan(-1);
    expect(potsAt).toBeGreaterThan(lockAt);
  });

  it('the monthly target keeps its own lock, untouched', () => {
    expect(TARGET_SRC).toContain("if (plan === 'guest')");
    expect(TARGET_SRC).not.toContain('SavingsPots');
    expect(TARGET_SRC).not.toContain('savingsPots');
  });
});

describe('placement and UI wiring (v7.6.09)', () => {
  it('pots section sits below the monthly target in the Budget sub-tab', () => {
    const targetAt = ANALYTICS_SRC.indexOf('<MonthlySavingsTarget');
    const potsAt = ANALYTICS_SRC.indexOf('<SavingsPots');
    expect(targetAt).toBeGreaterThan(-1);
    expect(potsAt).toBeGreaterThan(targetAt);
    expect(ANALYTICS_SRC).toContain("import { SavingsPots } from './SavingsPots';");
  });

  it('helper stays pure: no storage, database or money-moving tokens', () => {
    expect(HELPER_SRC).not.toContain('firestore');
    expect(HELPER_SRC).not.toContain('firebase');
    expect(HELPER_SRC).not.toContain('localStorage');
    expect(HELPER_SRC).not.toContain('premium');
    expect(HELPER_SRC).not.toContain('Premium');
    expect(HELPER_SRC).not.toContain('setDoc');
    expect(HELPER_SRC).not.toContain('getDoc');
  });

  it('component shows the tracking-only line and the required controls', () => {
    expect(COMPONENT_SRC).toContain('စုငွေအိုးက တိုးတက်မှုကို ခြေရာခံခြင်းသာ — ပိုက်ဆံအိတ်လက်ကျန်ကို မထိပါ');
    expect(COMPONENT_SRC).toContain('Savings pots track progress only — wallet balances are untouched.');
    expect(COMPONENT_SRC).toContain('ထည့်မည်');
    expect(COMPONENT_SRC).toContain('ထုတ်မည်');
    expect(COMPONENT_SRC).toContain('ပြည့်စုံပြီ');
    expect(COMPONENT_SRC).toContain('သိမ်းထားသော အိုးများ');
    expect(COMPONENT_SRC).toContain('formatLakhs');
    expect(COMPONENT_SRC).toContain('parseMyanmarNumber');
  });

  it('component writes no transaction itself — creation goes only through the injected callback (v7.6.13)', () => {
    expect(COMPONENT_SRC).not.toContain('setTransactions');
    expect(COMPONENT_SRC).not.toContain('setWallets');
    expect(COMPONENT_SRC).not.toContain('TransactionModal');
    expect(COMPONENT_SRC).not.toContain("doc(db, 'transactions'");
    // [v7.6.13] A wallet-picked entry DOES create a real
    // transaction, but only inside the caller-supplied callback —
    // the component holds no transaction or wallet state of its own.
    expect(COMPONENT_SRC).toContain('onCreatePotTransfer');
  });
});

describe('version pins rolled forward to v7.6.27 (build 342)', () => {
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
    expect(entry.changesMy).toEqual([
      'ကဏ္ဍအိုင်ကွန်ရုပ်ပုံတွေ အကုန်လုံး ရောက်လာပါပြီ — အုပ်စု ၁၄ ခု၊ ရုပ်ပုံ ၄၆၃ ခု၊ အိမ်၊ ပြုပြင်ရေး၊ အစားအသောက်၊ မီးဖိုချောင်၊ နေ့စဉ်သုံး၊ အလှအပ၊ အိမ်မွေးတိရစ္ဆာန်၊ ကျန်းမာရေး၊ အချစ်၊ ခရီး၊ ငွေ၊ ဖျော်ဖြေရေး၊ ရာသီပွဲများနဲ့ အခြားအကုန်ပါပါတယ်',
      'အိုင်ကွန်ရွေးချယ်တဲ့နေရာမှာ ရုပ်ပုံတွေကို သူ့အုပ်စုနဲ့သူ ခွဲပြထားပါပြီ — လိုချင်တဲ့အုပ်စုကို နှိပ်ပြီး ရှာရလွယ်ပါတယ်',
      'အခြေခံအိုင်ကွန် (Free) — အုပ်စုတစ်ခုမှာ အသုံးအများဆုံး ၁၀ ခုကို အားလုံးသုံးနိုင်ပါတယ်',
      'အထူးအိုင်ကွန် (Premium) — အုပ်စုတိုင်းရဲ့ ကျန်တဲ့ရုပ်ပုံအကုန်လုံးကို Premium နဲ့ သုံးနိုင်ပါတယ်',
      'Premium နဲ့ ရွေးထားတဲ့ အိုင်ကွန်က Premium သက်တမ်းကုန်သွားရင်လည်း ကဏ္ဍမှာ ဆက်ကျန်နေပါမယ် — ပြောင်းလိုက်မှသာ ပြန်ရွေးလို့ မရတော့ပါဘူး',
      'အိုင်ကွန်ရုပ်ပုံအကုန်လုံးကို အင်တာနက်မရှိလည်း ဖွင့်လို့ရအောင် ဖုန်းထဲမှာ သိမ်းထားပေးပါပြီ',
      'အိုင်ကွန်ဟောင်း (ရိုးရိုးပုံလေးတွေ) ကိုလည်း ဆက်သုံးနိုင်ပါပြီ — ကိုယ်တိုင်ထည့်ထားတဲ့ ကဏ္ဍတွေမှာ အရင်အတိုင်း ပြပေးပါတယ်',
      'ကဏ္ဍခွဲတွေမှာလည်း ကိုယ်ပိုင်အိုင်ကွန်ထည့်နိုင်ပါပြီ — မူရင်းကဏ္ဍခွဲတိုင်းမှာ သူ့အဓိပ္ပာယ်နဲ့ ကိုက်တဲ့ အိုင်ကွန်ကို ကြိုတင်ထည့်ပေးထားပါတယ်'
    ]);
    expect(entry.changesEn).toEqual([
      'The full pictorial icon library is here — 463 pictures in 14 packs: home, repairing, food, kitchen, daily care, beauty, pets, health, love, travel, money, entertainment, seasonal and more',
      'The icon picker groups every picture into its own pack, so the one you want is easy to find',
      'Core icons (Free) — the 10 most everyday pictures in each pack are free for everyone',
      'Special icons (Premium) — all the remaining pictures in every pack are available with Premium',
      'An icon chosen while Premium stays on its category after Premium lapses — it only becomes unavailable again once you change away from it',
      'All icon pictures are saved on the phone so they still show without internet',
      'The classic plain icons still work too — custom categories keep showing them exactly as before',
      'Sub-categories can have their own icons too — every default sub-category comes pre-assigned with a matching icon'
    ]);
    expect(VERSION_JSON.changesMy).toEqual(entry.changesMy);
    expect(VERSION_JSON.changesEn).toEqual(entry.changesEn);
    expect(JSON.stringify(entry)).not.toContain('Admin');
  });

  it('releasedAt is present only — its value varies per run by design', () => {
    expect(typeof VERSION_JSON.releasedAt).toBe('string');
    expect(VERSION_JSON.releasedAt.length).toBeGreaterThan(0);
  });

  it('no 7.5.100 / 7.6.9 numbering anywhere in the version surfaces', () => {
    expect(CURRENT_APP_VERSION).not.toBe('v7.6.9');
    expect(VERSION_JSON.version).not.toBe('v7.6.9');
  });
});
