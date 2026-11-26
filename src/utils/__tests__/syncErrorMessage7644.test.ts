// [v7.6.44] Part E — syncError is shown as plain Burmese/English
// only. The raw Firebase message/code must NEVER appear on the
// surface: every non-empty input maps to one of four short lines
// ([v7.6.56] token, network, permission, generic), and null/empty
// maps to null (nothing renders, as today).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { friendlySyncErrorMessage } from '../syncErrorMessage';

const SRC = (rel: string) => readFileSync(new URL(rel, import.meta.url), 'utf8');

describe('friendlySyncErrorMessage (v7.6.44 Part E)', () => {
  it('null / empty maps to null — nothing renders', () => {
    expect(friendlySyncErrorMessage(null, 'my')).toBeNull();
    expect(friendlySyncErrorMessage('', 'my')).toBeNull();
    expect(friendlySyncErrorMessage('   ', 'en')).toBeNull();
    expect(friendlySyncErrorMessage(undefined, 'en')).toBeNull();
  });

  it('network failures → the short internet line, Burmese + English', () => {
    expect(friendlySyncErrorMessage('Failed to get document because the client is offline', 'my'))
      .toBe('အင်တာနက်ချိတ်ဆက်မှု မရပါ။ ချိတ်ဆက်မှုကို စစ်ပြီး ပြန်ကြိုးစားပါ။');
    expect(friendlySyncErrorMessage('Failed to get document because the client is offline', 'en'))
      .toBe('No internet connection. Check your connection and try again.');
    expect(friendlySyncErrorMessage('UNAVAILABLE: The service is currently unavailable.', 'en'))
      .toBe('No internet connection. Check your connection and try again.');
  });

  it('[v7.6.56] token failures → the token line, FIRST (never the internet line)', () => {
    // The 2026-11-26 failure: the Auth token endpoint was
    // unreachable while the internet worked. The raw code contains
    // 'network', so the token branch must win over the network one.
    expect(friendlySyncErrorMessage('auth/network-request-failed', 'my'))
      .toBe('Cloud အကောင့် တိုကင် ပြန်လည်ရယူ၍ မရပါ။ ပြောင်းလဲမှုကို စက်ထဲတွင် သိမ်းထားပြီး ချိတ်ဆက်မှု ပြန်ရလျှင် အလိုအလျောက် ပို့ပေးပါမည်။');
    expect(friendlySyncErrorMessage('auth/network-request-failed', 'en'))
      .toBe('Could not refresh the Cloud sign-in token. Your change is saved on this device and will sync automatically when the connection recovers.');
    expect(friendlySyncErrorMessage('Cloud sign-in token could not be refreshed', 'my'))
      .toBe('Cloud အကောင့် တိုကင် ပြန်လည်ရယူ၍ မရပါ။ ပြောင်းလဲမှုကို စက်ထဲတွင် သိမ်းထားပြီး ချိတ်ဆက်မှု ပြန်ရလျှင် အလိုအလျောက် ပို့ပေးပါမည်။');
    expect(friendlySyncErrorMessage('token-expired', 'en'))
      .toBe('Could not refresh the Cloud sign-in token. Your change is saved on this device and will sync automatically when the connection recovers.');
  });

  it('permission failures → the short permission line', () => {
    expect(friendlySyncErrorMessage('Missing or insufficient permissions.', 'my'))
      .toBe('ဒေတာသိမ်းခွင့် မရှိပါ။ ပြန်ဝင်ပြီး ပြန်ကြိုးစားပါ။');
    expect(friendlySyncErrorMessage('PERMISSION_DENIED: Permission denied', 'en'))
      .toBe('You do not have permission to save. Sign in again and retry.');
  });

  it('anything else → one generic retry line', () => {
    expect(friendlySyncErrorMessage('Some weird internal error 42', 'my'))
      .toBe('Sync မအောင်မြင်ပါ။ ခဏနေပြီး ပြန်ကြိုးစားပါ။');
    expect(friendlySyncErrorMessage('Some weird internal error 42', 'en'))
      .toBe('Sync failed. Please try again shortly.');
  });

  it('no output ever contains raw Firebase/code text', () => {
    const raws = [
      'Missing or insufficient permissions.',
      'Failed to get document because the client is offline',
      'PERMISSION_DENIED: Permission denied',
      'UNAVAILABLE: The service is currently unavailable.',
      'Error: quota exceeded (resource-exhausted)',
    ];
    for (const raw of raws) {
      for (const lang of ['my', 'en'] as const) {
        const out = friendlySyncErrorMessage(raw, lang);
        expect(out).not.toContain(raw);
        expect(out).not.toMatch(/PERMISSION_DENIED|UNAVAILABLE|resource-exhausted|Firebase/i);
      }
    }
  });

  it('AccountModal renders the mapped message, never the raw syncError', () => {
    const modal = SRC('../../components/AccountModal.tsx');
    expect(modal).toContain('friendlySyncErrorMessage(syncError, lang)');
    expect(modal).toContain('⚠️ {syncErrorMessage}');
    expect(modal).not.toContain('⚠️ {syncError}');
  });
});
