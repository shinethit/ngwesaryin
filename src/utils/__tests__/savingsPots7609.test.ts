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
  isValidSavingsPots,
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

  it('isValidSavingsPots accepts the spec shape and rejects the rest', () => {
    expect(isValidSavingsPots([pot()])).toBe(true);
    expect(isValidSavingsPots([])).toBe(true);
    expect(isValidSavingsPots([pot({ targetAmount: 0 })])).toBe(false);
    expect(isValidSavingsPots('nope')).toBe(false);
    expect(isValidSavingsPots(null)).toBe(false);
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

  it('AnalyticsView renders pots without a plan prop', () => {
    expect(ANALYTICS_SRC).toContain('<SavingsPots lang={lang} />');
    expect(ANALYTICS_SRC).not.toContain('<SavingsPots lang={lang} plan=');
  });

  it('App renders the same pots section below the whole-view lock card', () => {
    // The gate itself is untouched — the lock card still replaces
    // AnalyticsView for guests; pots sit OUTSIDE it, below the card.
    expect(APP_SRC).toContain("plan === 'guest' || !limits.hasBudgets");
    expect(APP_SRC).toContain('const SavingsPots = lazyWithRetry(');
    expect(APP_SRC).toContain('<SavingsPots lang={lang} />');
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

  it('component creates no transaction and touches no wallet state', () => {
    expect(COMPONENT_SRC).not.toContain('setTransactions');
    expect(COMPONENT_SRC).not.toContain('setWallets');
    expect(COMPONENT_SRC).not.toContain('TransactionModal');
    expect(COMPONENT_SRC).not.toContain("doc(db, 'transactions'");
  });
});

describe('version pins rolled forward to v7.6.12 (build 326)', () => {
  it('version constants and history entry match version.json', () => {
    expect(CURRENT_APP_VERSION).toBe('v7.6.12');
    expect(CURRENT_BUILD_NUMBER).toBe(326);
    expect(VERSION_JSON.version).toBe('v7.6.12');
    expect(VERSION_JSON.buildNumber).toBe(326);
    const entry = VERSION_HISTORY[0];
    expect(entry.version).toBe('v7.6.12');
    expect(entry.buildNumber).toBe(326);
    expect(entry.releaseDate).toBe('2026-11-23');
    expect(entry.tag).toBe('fix');
    expect(entry.titleMy).toBe('သတိပေးချက် စာသား ရှင်းလင်းခြင်း (၂ ဆ တိတိကနေ စပြီး)');
    expect(entry.changesMy).toEqual([
      'ပုံမှန်ထက် အသုံးများခြင်း သတိပေးချက် စာသား ပြင်ဆင်ခြင်း — ၂ ဆ တိတိကနေ စပြီး သတိပေးသည် (၂ ဆ၊ ၃ ဆ၊ ၄ ဆ အားလုံး ပါဝင်သည်)',
    ]);
    expect(entry.changesEn).toEqual([
      'Anomaly alert wording clarified — alerts start at exactly twice the 4-week weekly average and continue above it (2×, 3×, 4× all alert). The threshold itself is unchanged.',
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
