// [v7.5.98] 3-month free Premium offer made visible on arrival:
// TrialStrip at the top of Home, trial section first in the Premium
// modal's code tab, one trial line on the LoginScreen hero. Pure
// helper unit tests plus source-text assertions (same pattern as
// duplicateButtonsRemoved796.test.ts) — the components have no test
// renderer in this repo (vitest node env, no testing-library);
// layout behaviour is verified by renders.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { getTrialEligibility } from '../premiumActivation';
import {
  VERSION_HISTORY,
  CURRENT_APP_VERSION,
  CURRENT_BUILD_NUMBER,
} from '../../data/versionHistory';

const DAY_MS = 24 * 60 * 60 * 1000;
// 1s past the whole-day boundary so floor() lands exactly on `days`.
const createdDaysAgo = (days: number): string =>
  new Date(Date.now() - days * DAY_MS - 1000).toISOString();

const STRIP_SRC = readFileSync(
  new URL('../../components/TrialStrip.tsx', import.meta.url),
  'utf8',
);
const DASH_SRC = readFileSync(
  new URL('../../components/Dashboard.tsx', import.meta.url),
  'utf8',
);
const LOGIN_SRC = readFileSync(
  new URL('../../components/LoginScreen.tsx', import.meta.url),
  'utf8',
);
const MODAL_SRC = readFileSync(
  new URL('../../components/PremiumModal.tsx', import.meta.url),
  'utf8',
);
const APP_SRC = readFileSync(
  new URL('../../App.tsx', import.meta.url),
  'utf8',
);
const NAV_SRC = readFileSync(
  new URL('../../components/Navbar.tsx', import.meta.url),
  'utf8',
);
const VERSION_JSON = JSON.parse(
  readFileSync(new URL('../../../public/version.json', import.meta.url), 'utf8'),
);

describe('getTrialEligibility mirrors the PremiumModal formula (v7.5.98)', () => {
  it('age 0 via creationTime: 30 days left, eligible', () => {
    expect(
      getTrialEligibility({ creationTime: createdDaysAgo(0) }),
    ).toEqual({ accountAgeDays: 0, trialDaysLeft: 30, isEligible: true });
  });

  it('age 30 via creationTime: 0 days left, still eligible (boundary)', () => {
    expect(
      getTrialEligibility({ creationTime: createdDaysAgo(30) }),
    ).toEqual({ accountAgeDays: 30, trialDaysLeft: 0, isEligible: true });
  });

  it('age 31 via creationTime: 0 days left, ineligible', () => {
    expect(
      getTrialEligibility({ creationTime: createdDaysAgo(31) }),
    ).toEqual({ accountAgeDays: 31, trialDaysLeft: 0, isEligible: false });
  });

  it('falls back to accountCreatedAt when creationTime is absent', () => {
    expect(
      getTrialEligibility({ accountCreatedAt: createdDaysAgo(5) }),
    ).toEqual({ accountAgeDays: 5, trialDaysLeft: 25, isEligible: true });
  });

  it('creationTime wins over accountCreatedAt (modal ?? precedence)', () => {
    expect(
      getTrialEligibility({
        creationTime: createdDaysAgo(40),
        accountCreatedAt: createdDaysAgo(0),
      }),
    ).toEqual({ accountAgeDays: 40, trialDaysLeft: 0, isEligible: false });
    expect(
      getTrialEligibility({
        creationTime: createdDaysAgo(0),
        accountCreatedAt: createdDaysAgo(40),
      }),
    ).toEqual({ accountAgeDays: 0, trialDaysLeft: 30, isEligible: true });
  });

  it('no creation time at all: age 0, 30 days left, eligible', () => {
    expect(getTrialEligibility({})).toEqual({
      accountAgeDays: 0,
      trialDaysLeft: 30,
      isEligible: true,
    });
    expect(
      getTrialEligibility({ creationTime: null, accountCreatedAt: null }),
    ).toEqual({ accountAgeDays: 0, trialDaysLeft: 30, isEligible: true });
  });

  it('claimed trial is ineligible at every age', () => {
    for (const age of [0, 5, 30, 31, 90]) {
      const res = getTrialEligibility({
        creationTime: createdDaysAgo(age),
        trialClaimed: true,
      });
      expect(res.accountAgeDays).toBe(age);
      expect(res.isEligible).toBe(false);
    }
  });

  it('daysLeft is 30 / 0 / 0 for ages 0 / 30 / 31', () => {
    expect(
      getTrialEligibility({ creationTime: createdDaysAgo(0) }).trialDaysLeft,
    ).toBe(30);
    expect(
      getTrialEligibility({ creationTime: createdDaysAgo(30) }).trialDaysLeft,
    ).toBe(0);
    expect(
      getTrialEligibility({ creationTime: createdDaysAgo(31) }).trialDaysLeft,
    ).toBe(0);
  });
});

describe('TrialStrip visibility matrix + wording (v7.5.98 Fix 1)', () => {
  it('guest variant carries the exact guest strings', () => {
    expect(STRIP_SRC).toContain(
      '🎁 အကောင့်သစ်များ Premium ၃ လ အခမဲ့ — အကောင့်ဖွင့်ပြီး ရယူပါ ›',
    );
    expect(STRIP_SRC).toContain(
      '🎁 New accounts get 3 months of Premium FREE — sign in to claim ›',
    );
  });

  it('eligible variant carries the exact claim strings with days left', () => {
    expect(STRIP_SRC).toContain('🎁 ၃ လ အခမဲ့ Premium ရယူမည် — ');
    expect(STRIP_SRC).toContain('ရက် လက်ကျန် ›');
    expect(STRIP_SRC).toContain('🎁 Claim 3 months of Premium FREE — ');
    expect(STRIP_SRC).toContain('days left ›');
    expect(STRIP_SRC).toContain('trialDaysLeft');
  });

  it('branches: premium hides, guest shows, ineligible hides', () => {
    expect(STRIP_SRC).toContain("plan === 'premium'");
    expect(STRIP_SRC).toContain('if (!user)');
    expect(STRIP_SRC).toContain('getTrialEligibility');
    expect(STRIP_SRC).toContain('if (!isEligible) return null');
    expect(STRIP_SRC).toContain('trialClaimed');
    expect(STRIP_SRC).toContain('accountCreatedAt');
    expect(STRIP_SRC).toContain('creationTime');
  });

  it('whole strip is tappable buttons, >=44px, no dismiss, no auto-open', () => {
    // Two rendered buttons (guest + eligible branches); the header
    // comment's '<button>' wording is not a rendered element.
    expect(STRIP_SRC.match(/type="button"/g)?.length).toBe(2);
    expect(STRIP_SRC).toContain('min-h-[44px]');
    expect(STRIP_SRC).toContain('onClick={onOpenUpgrade}');
    expect(STRIP_SRC).not.toContain('onDismiss');
    expect(STRIP_SRC).not.toContain('setDismissed');
    expect(STRIP_SRC).not.toContain('useEffect');
    expect(STRIP_SRC).not.toContain('setIsPremiumModalOpen');
  });

  it('Dashboard mounts the strip first, before HEADER, via onOpenUpgrade', () => {
    expect(DASH_SRC).toContain("import { TrialStrip } from './TrialStrip';");
    expect(DASH_SRC).toContain('<TrialStrip');
    expect(DASH_SRC.indexOf('<TrialStrip')).toBeLessThan(
      DASH_SRC.indexOf('{/* HEADER */}'),
    );
    expect(DASH_SRC).toContain(
      '<TrialStrip plan={plan} lang={lang} onOpenUpgrade={onOpenUpgrade} />',
    );
    expect(DASH_SRC).toContain('onOpenUpgrade, onOpenSearch,');
  });
});

describe('Premium modal: trial section first in the code tab (v7.5.98 Fix 2)', () => {
  function codePanel(): string {
    // The panel render (not the tab buttons above it, which also
    // mention activeTab): '{activeTab === 'code' && (' ... up to the
    // payment panel's render expression.
    const start = MODAL_SRC.indexOf("{activeTab === 'code' && (");
    expect(start).toBeGreaterThan(-1);
    const end = MODAL_SRC.indexOf("{activeTab === 'payment' && (", start);
    expect(end).toBeGreaterThan(start);
    return MODAL_SRC.slice(start, end);
  }

  it('trial section precedes the sign-in box and the code form', () => {
    const panel = codePanel();
    const trial = panel.indexOf('SPECIAL WELCOME OFFER');
    const signin = panel.indexOf('အကောင့်ဝင်ရန် လိုအပ်ပါသည်');
    const codeForm = panel.indexOf('Activation Code ထည့်သွင်းပါ');
    expect(trial).toBeGreaterThan(-1);
    expect(signin).toBeGreaterThan(-1);
    expect(codeForm).toBeGreaterThan(-1);
    expect(trial).toBeLessThan(signin);
    expect(trial).toBeLessThan(codeForm);
  });

  it('premium active-state block still leads the panel, untouched', () => {
    const panel = codePanel();
    expect(panel.indexOf('Premium အဆင့် အပြည့်အစုံ')).toBeLessThan(
      panel.indexOf('SPECIAL WELCOME OFFER'),
    );
    expect(panel).toContain('သက်တမ်းတိုးရန် Code အသစ်ထည့်မည်');
  });

  it('claim handler, code logic, and payment-tab link untouched', () => {
    expect(MODAL_SRC).toContain('handleClaimTrial');
    expect(MODAL_SRC).toContain('claimFreeTrial');
    expect(MODAL_SRC).toContain('၃ လ အခမဲ့ Premium အထူးလက်ဆောင်');
    expect(MODAL_SRC).toContain('handleApplyPromo');
    expect(MODAL_SRC).toContain("setActiveTab('payment')");
    expect(MODAL_SRC).toContain('SPECIAL WELCOME OFFER');
  });

  it('default tab is already code: no initialTab prop added', () => {
    expect(MODAL_SRC).toContain(
      "useState<'code' | 'payment' | 'features'>('code')",
    );
    expect(MODAL_SRC).not.toContain('initialTab');
  });
});

describe('LoginScreen hero carries one static trial line (v7.5.98 Fix 3)', () => {
  it('exact gift line strings, after the tagline, text-only', () => {
    expect(LOGIN_SRC).toContain(
      '🎁 အကောင့်သစ်များ — Premium ၃ လ အခမဲ့ စမ်းသုံးနိုင်ပါသည်',
    );
    expect(LOGIN_SRC).toContain(
      '🎁 New accounts get 3 months of Premium free',
    );
    const tagline = LOGIN_SRC.indexOf(
      'ဝင်ငွေ၊ ထွက်ငွေနှင့် အကြွေးစာရင်းများကို စိတ်ချလုံခြုံစွာ စီမံခန့်ခွဲပါ',
    );
    const gift = LOGIN_SRC.indexOf(
      '🎁 အကောင့်သစ်များ — Premium ၃ လ အခမဲ့ စမ်းသုံးနိုင်ပါသည်',
    );
    expect(tagline).toBeGreaterThan(-1);
    expect(gift).toBeGreaterThan(tagline);
    const lineEnd = LOGIN_SRC.indexOf('</p>', gift);
    expect(LOGIN_SRC.slice(gift, lineEnd)).not.toContain('onClick');
    expect(LOGIN_SRC).toContain('text-amber-700');
  });
});

describe('Left alone: PlanBanner unmounted, Navbar chip untouched (v7.5.98)', () => {
  it('PlanBanner stays commented out in App', () => {
    expect(APP_SRC).toContain('PlanBanner /> Removed to save space');
    expect(STRIP_SRC).not.toContain('PlanBanner');
  });

  it('Navbar compact chip has no trial wording', () => {
    expect(NAV_SRC).not.toContain('၃ လ အခမဲ့');
    expect(NAV_SRC).not.toContain('Free Premium');
    expect(NAV_SRC).not.toContain('trial');
    expect(NAV_SRC).toContain('usageChip');
    expect(NAV_SRC).toContain('hidden md:inline-flex');
  });
});

describe('Version bump to v7.6.05 (build 319)', () => {
  it('version constants and history entry match version.json', () => {
    expect(CURRENT_APP_VERSION).toBe('v7.6.05');
    expect(CURRENT_BUILD_NUMBER).toBe(319);
    expect(VERSION_JSON.version).toBe('v7.6.05');
    expect(VERSION_JSON.buildNumber).toBe(319);
    const entry = VERSION_HISTORY[0];
    expect(entry.version).toBe('v7.6.05');
    expect(entry.buildNumber).toBe(319);
    expect(entry.releaseDate).toBe('2026-11-22');
    expect(entry.tag).toBe('fix');
    expect(entry.titleMy).toBe(
      'အသေးစားပြင်ဆင်ချက် ၃ ခု',
    );
    expect(entry.changesMy).toEqual(VERSION_JSON.changesMy);
    expect(entry.changesEn).toEqual(VERSION_JSON.changesEn);
    expect(entry.changesMy).toHaveLength(1);
    expect(entry.changesEn).toHaveLength(1);
  });

  it('change log has no Admin content and releasedAt is present-only', () => {
    expect(VERSION_JSON.changesMy.join(' ')).not.toContain('Admin');
    expect(VERSION_JSON.changesEn.join(' ')).not.toContain('Admin');
    expect(JSON.stringify(VERSION_HISTORY[0])).not.toContain('Admin');
    expect(typeof VERSION_JSON.releasedAt).toBe('string');
    expect(VERSION_JSON.releasedAt.length).toBeGreaterThan(0);
  });
});
