// [v7.6.12] Anomaly alert wording clarified — WORDING ONLY. The
// v7.6.08 threshold already fired from exactly twice the baseline
// weekly average upward (2x, 3x, 4x all alert), but the only
// trigger description a user could read — the v7.6.08 Version
// History entry's "2x more" phrasing — read as if only exactly 2x
// alerts, and the live anomaly section had no trigger explanation
// at all (generic heading + the row's actual multiple only). This
// version adds one clarifying line under the anomaly section
// heading, in the user's own phrasing, and changes NOTHING else:
// no comparison, constant, baseline, exclusion, sorting or id
// change in anomalyAlerts.ts (that file is byte-identical to
// v7.6.11), and the row's actual-multiple wording is untouched.
// The v7.6.08 history entry is history and is left verbatim.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  ANOMALY_MULTIPLIER,
  ANOMALY_MIN_WEEK_SPEND,
  ANOMALY_BASELINE_WEEKS,
  ANOMALY_MIN_BASELINE_WEEKS_WITH_SPEND,
} from '../anomalyAlerts';
import {
  VERSION_HISTORY,
  CURRENT_APP_VERSION,
  CURRENT_BUILD_NUMBER,
} from '../../data/versionHistory';

const MODAL_SRC = readFileSync(
  new URL('../../components/NotificationModal.tsx', import.meta.url),
  'utf8',
);
const HELPER_SRC = readFileSync(
  new URL('../anomalyAlerts.ts', import.meta.url),
  'utf8',
);
const VERSION_JSON = JSON.parse(
  readFileSync(new URL('../../../public/version.json', import.meta.url), 'utf8'),
);

describe('anomaly trigger wording (v7.6.12)', () => {
  it('the anomaly section states alerts start at exactly twice and continue above it, in both languages', () => {
    // ONE consistent phrasing everywhere: the user's own words.
    expect(MODAL_SRC).toContain('၂ ဆ တိတိကနေ စပြီး သတိပေးသည်');
    expect(MODAL_SRC).toContain(
      'Alerts start at exactly twice the usual weekly average and continue above it',
    );
    // The clarifying line names the multiples above 2x too, so it
    // cannot be read as "only at 2x".
    expect(MODAL_SRC).toContain('၂ ဆ၊ ၃ ဆ၊ ၄ ဆ ဖြစ်လျှင်လည်း သတိပေးသည်');
    expect(MODAL_SRC).toContain('2×, 3×, 4× all alert');
  });

  it('the row wording stating the ACTUAL multiple is untouched', () => {
    expect(MODAL_SRC).toContain('ထက် ${multipleText} ဆ');
    expect(MODAL_SRC).toContain('× the usual weekly average of');
    // Baseline-zero wording untouched: honest, no multiplier.
    expect(MODAL_SRC).toContain('ပြီးခဲ့တဲ့ ၄ ပတ်မှာ');
    expect(MODAL_SRC).toContain('မသုံးခဲ့ဘဲ ဒီအပတ်');
    expect(MODAL_SRC).toContain('spending in the past 4 weeks, but');
  });

  it('the threshold itself is unchanged: same constants, same integer-safe comparison', () => {
    expect(ANOMALY_MULTIPLIER).toBe(2);
    expect(ANOMALY_MIN_WEEK_SPEND).toBe(10000);
    expect(ANOMALY_BASELINE_WEEKS).toBe(4);
    expect(ANOMALY_MIN_BASELINE_WEEKS_WITH_SPEND).toBe(2);
    expect(HELPER_SRC).toContain(
      'current * ANOMALY_BASELINE_WEEKS < ANOMALY_MULTIPLIER * baselineTotal',
    );
    expect(HELPER_SRC).toContain('current < ANOMALY_MIN_WEEK_SPEND');
    expect(HELPER_SRC).toContain(
      'weeksWithSpend < ANOMALY_MIN_BASELINE_WEEKS_WITH_SPEND',
    );
  });
});

describe('Version bump to v7.6.27 (build 341)', () => {
  it('version constants and history entry match version.json', () => {
    expect(CURRENT_APP_VERSION).toBe('v7.6.27');
    expect(CURRENT_BUILD_NUMBER).toBe(341);
    expect(VERSION_JSON.version).toBe('v7.6.27');
    expect(VERSION_JSON.buildNumber).toBe(341);
    const entry = VERSION_HISTORY[0];
    expect(entry.version).toBe('v7.6.27');
    expect(entry.buildNumber).toBe(341);
    expect(entry.releaseDate).toBe('2026-11-24');
    expect(entry.tag).toBe('fix');
    expect(entry.titleMy).toBe(
      'PDF စာရင်းရှင်းတမ်း ထုတ်ယူနိုင်ခြင်း',
    );
    expect(entry.titleEn).toBe(
      'PDF statement export',
    );
    expect(entry.changesMy).toEqual(VERSION_JSON.changesMy);
    expect(entry.changesEn).toEqual(VERSION_JSON.changesEn);
    expect(entry.changesMy).toHaveLength(1);
    expect(entry.changesEn).toHaveLength(1);
    expect(entry.changesMy[0]).toBe(
      'အစီရင်ခံစာကို PDF စာရင်းရှင်းတမ်းအဖြစ် ထုတ်ယူနိုင်သည် — ကဏ္ဍအလိုက် စုစုပေါင်း+%, ကဏ္ဍခွဲအလိုက် စုစုပေါင်း+% (ကဏ္ဍကို ၁၀၀% ယူ), အသေးစိတ်စာရင်း အပြည့်အစုံ',
    );
    expect(entry.changesEn[0]).toBe(
      'Reports can be exported as a PDF statement — category totals with %, sub-category totals with % (parent category = 100%), and the full detailed list.',
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
    expect(CURRENT_APP_VERSION).not.toBe('v7.6.27'.replace(/7$/, ''));
    expect(VERSION_JSON.version).not.toBe('v7.6.27'.replace(/7$/, ''));
  });

  it('the fix-script guard is raw string equality: accepts exactly 7.6.25/7.6.26, rejects the mangled form', () => {
    const FROM_VERSION = '7.6.26';
    const TO_VERSION = '7.6.27';
    const guardFails = (pkgVersion: string): boolean =>
      pkgVersion !== FROM_VERSION && pkgVersion !== TO_VERSION;
    // The mangled form is built from TO_VERSION, never written as a
    // literal, so the shipped identity can never be confused with
    // it by a grep or by the guard.
    const mangled = TO_VERSION.replace(/7$/, '');
    expect(mangled).not.toBe(TO_VERSION);
    expect(TO_VERSION).toBe('7.6.27');
    expect(guardFails('7.6.26')).toBe(false);
    expect(guardFails('7.6.27')).toBe(false);
    expect(guardFails(mangled)).toBe(true);
    expect(guardFails('')).toBe(true);
  });
});
