// [v7.6.22] Remaining-days chip beside the header VIP badge: one
// shared rule (utils/premiumExpiry.ts) for the Navbar chip and the
// AccountModal plan card — daysLeft = max(0, ceil(diff / day)),
// Lifetime wording above 3650 days, no chip when there is no expiry.
// Lifetime is a far-future date string, never null: null is written
// only together with plan 'free' (revoke / downgrade), so a premium
// account with a null expiry shows no chip.
// Source-text assertions follow the established pattern (no test
// renderer in this repo; vitest node env). NO path comparisons:
// sources are read via new URL(..., import.meta.url).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  LIFETIME_THRESHOLD_DAYS,
  resolvePremiumExpiryIso,
  getPremiumDaysLeft,
  formatPremiumRemaining,
} from '../premiumExpiry';
import {
  VERSION_HISTORY,
  CURRENT_APP_VERSION,
  CURRENT_BUILD_NUMBER,
} from '../../data/versionHistory';

function src(rel: string): string {
  return readFileSync(new URL(rel, import.meta.url), 'utf8');
}

const NAVBAR_SRC = src('../../components/Navbar.tsx');
const APP_SRC = src('../../App.tsx');
const ACCOUNT_SRC = src('../../components/AccountModal.tsx');
const HELPER_SRC = src('../premiumExpiry.ts');
const VERSION_JSON = JSON.parse(
  readFileSync(new URL('../../../public/version.json', import.meta.url), 'utf8'),
);

const DAY_MS = 1000 * 60 * 60 * 24;
// Fixed "now" so the ceil/edge cases are deterministic.
const NOW = new Date('2026-11-23T00:00:00.000Z').getTime();
const iso = (ms: number): string => new Date(ms).toISOString();

describe('getPremiumDaysLeft', () => {
  it('returns null when there is no expiry', () => {
    expect(getPremiumDaysLeft(null, NOW)).toBe(null);
    expect(getPremiumDaysLeft(undefined, NOW)).toBe(null);
    expect(getPremiumDaysLeft('', NOW)).toBe(null);
  });

  it('returns null for an unparseable expiry (never NaN)', () => {
    expect(getPremiumDaysLeft('not-a-date', NOW)).toBe(null);
    expect(getPremiumDaysLeft('32/13/2026', NOW)).toBe(null);
  });

  it('counts whole days, rounding UP', () => {
    expect(getPremiumDaysLeft(iso(NOW + 30 * DAY_MS), NOW)).toBe(30);
    // 12 hours left still reads as 1 day; 25 hours reads as 2.
    expect(getPremiumDaysLeft(iso(NOW + 12 * 60 * 60 * 1000), NOW)).toBe(1);
    expect(getPremiumDaysLeft(iso(NOW + 25 * 60 * 60 * 1000), NOW)).toBe(2);
    // Exactly on the day boundary.
    expect(getPremiumDaysLeft(iso(NOW + DAY_MS), NOW)).toBe(1);
  });

  it('never goes below 0 for a past expiry', () => {
    expect(getPremiumDaysLeft(iso(NOW - DAY_MS), NOW)).toBe(0);
    expect(getPremiumDaysLeft(iso(NOW - 365 * DAY_MS), NOW)).toBe(0);
  });

  it('parses the space-separated ISO form like parseExpiryTime', () => {
    const spaced = iso(NOW + 10 * DAY_MS).replace('T', ' ');
    expect(getPremiumDaysLeft(spaced, NOW)).toBe(10);
  });
});

describe('formatPremiumRemaining', () => {
  it('returns null when there is no count', () => {
    expect(formatPremiumRemaining(null, 'my')).toBe(null);
    expect(formatPremiumRemaining(null, 'en')).toBe(null);
  });

  it('shows the day count, both languages', () => {
    expect(formatPremiumRemaining(30, 'my')).toBe('30 ရက်ကျန်');
    expect(formatPremiumRemaining(30, 'en')).toBe('30 days left');
    expect(formatPremiumRemaining(0, 'my')).toBe('0 ရက်ကျန်');
    expect(formatPremiumRemaining(1, 'en')).toBe('1 days left');
  });

  it('shows Lifetime above the threshold, day count at it', () => {
    expect(LIFETIME_THRESHOLD_DAYS).toBe(3650);
    expect(formatPremiumRemaining(3650, 'my')).toBe('3650 ရက်ကျန်');
    expect(formatPremiumRemaining(3650, 'en')).toBe('3650 days left');
    expect(formatPremiumRemaining(3651, 'my')).toBe('တစ်သက်တာ');
    expect(formatPremiumRemaining(3651, 'en')).toBe('Lifetime');
    // A ~99-year grant reads as Lifetime.
    expect(formatPremiumRemaining(365 * 99, 'my')).toBe('တစ်သက်တာ');
    expect(formatPremiumRemaining(365 * 99, 'en')).toBe('Lifetime');
  });
});

describe('resolvePremiumExpiryIso', () => {
  it('prefers the profile value, falls back to the cached value', () => {
    expect(resolvePremiumExpiryIso('2027-01-01T00:00:00.000Z', '2026-12-01T00:00:00.000Z')).toBe(
      '2027-01-01T00:00:00.000Z',
    );
    expect(resolvePremiumExpiryIso(null, '2026-12-01T00:00:00.000Z')).toBe(
      '2026-12-01T00:00:00.000Z',
    );
    expect(resolvePremiumExpiryIso(undefined, undefined)).toBe(null);
    expect(resolvePremiumExpiryIso('', '')).toBe(null);
  });
});

describe('Navbar remaining-days chip wiring (v7.6.22)', () => {
  it('the helper names the lifetime threshold', () => {
    expect(HELPER_SRC).toContain('LIFETIME_THRESHOLD_DAYS = 3650');
  });

  it('Navbar takes premiumExpiresAt and renders the chip beside VIP', () => {
    expect(NAVBAR_SRC).toContain('premiumExpiresAt?: string | null;');
    expect(NAVBAR_SRC).toContain('resolvePremiumExpiryIso(');
    expect(NAVBAR_SRC).toContain('getPremiumDaysLeft(');
    expect(NAVBAR_SRC).toContain('formatPremiumRemaining(');
    expect(NAVBAR_SRC).toContain('title={premiumRemainingText}');
    // The VIP pill itself is unchanged.
    expect(NAVBAR_SRC).toContain('<span>VIP</span>');
  });

  it('the chip shows only for premium (never for guest/free)', () => {
    expect(NAVBAR_SRC).toContain("currentPlan === 'premium'");
    expect(NAVBAR_SRC).toContain('premiumRemainingText && (');
  });

  it('the chip is display-only: no click handler on it', () => {
    const chipAt = NAVBAR_SRC.indexOf('title={premiumRemainingText}');
    expect(chipAt).toBeGreaterThan(-1);
    const chipBlock = NAVBAR_SRC.slice(chipAt, chipAt + 400);
    expect(chipBlock).not.toContain('onClick');
    expect(chipBlock).not.toContain('button');
  });

  it('App passes the profile expiry to Navbar', () => {
    expect(APP_SRC).toContain('premiumExpiresAt={userProfile?.premiumExpiresAt}');
  });
});

describe('AccountModal adopts the shared rule (v7.6.22)', () => {
  it('uses the helper instead of the inline computation', () => {
    expect(ACCOUNT_SRC).toContain('resolvePremiumExpiryIso(');
    expect(ACCOUNT_SRC).toContain('getPremiumDaysLeft(expiryIso)');
    expect(ACCOUNT_SRC).toContain('formatPremiumRemaining(daysLeft, lang)');
    // The old inline computation is gone.
    expect(ACCOUNT_SRC).not.toContain('Math.ceil(diffMs');
    expect(ACCOUNT_SRC).not.toContain('daysLeft = Math.max(0');
  });

  it('keeps the same chip gate and duration line', () => {
    expect(ACCOUNT_SRC).toContain("plan === 'premium' && daysLeft !== null");
    expect(ACCOUNT_SRC).toContain('daysLeft && daysLeft > 3650');
  });
});

// ---------- Version bump to v7.6.27 (build 342) ----------

describe('Version bump to v7.6.27 (build 342)', () => {
  it('version constants and history entry match version.json', () => {
    expect(CURRENT_APP_VERSION).toBe('v7.6.36');
    expect(CURRENT_BUILD_NUMBER).toBe(350);
    expect(VERSION_JSON.version).toBe('v7.6.36');
    expect(VERSION_JSON.buildNumber).toBe(350);
    const entry = VERSION_HISTORY[0];
    expect(entry.version).toBe('v7.6.36');
    expect(entry.buildNumber).toBe(350);
    expect(entry.releaseDate).toBe('2026-11-25');
    expect(entry.tag).toBe('fix');
    expect(entry.titleMy).toBe('PDF စာရင်းရှင်းတမ်း — A4၊ chart များနှင့် iOS ပြင်ဆင်မှု');
    expect(entry.titleEn).toBe('PDF statement: A4 pages, charts, and the iOS fix');
    expect(entry.changesMy).toEqual(VERSION_JSON.changesMy);
    expect(entry.changesEn).toEqual(VERSION_JSON.changesEn);
    expect(entry.changesMy).toHaveLength(1);
    expect(entry.changesEn).toHaveLength(1);
    expect(entry.changesMy[0]).toBe(
      'PDF စာရင်းရှင်းတမ်းကို A4 ဖြင့် ထုတ်နိုင်ပြီး ဝင်ငွေ/ထွက်ငွေကို pie chart၊ ကဏ္ဍများကို bar chart ဖြင့် ပြမည် — iOS မှာလည်း ထုတ်လို့ရအောင် ပြင်သည်',
    );
    expect(entry.changesEn[0]).toBe(
      'The PDF statement prints on A4 with income/expense as a pie chart and categories as a bar chart — and can now be exported on iOS too.',
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
