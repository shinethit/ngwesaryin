// [v7.6.53] Set-a-password for Google-signed-in users: the account
// links an email/password credential to the EXISTING UID (same data,
// Google keeps working). The linking itself needs a live Google
// account, so behavior is pinned here by mapper unit tests + source
// pins for the guard/reauth/refresh wiring; the live link stays on
// the honest not-verified list. Source reads use `new URL` — NO path
// comparisons.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  CURRENT_APP_VERSION,
  CURRENT_BUILD_NUMBER,
  VERSION_HISTORY,
} from '../../data/versionHistory';
import {
  mapSetPasswordError,
  validateEmailAuthInput,
} from '../../utils/authErrorMapper';

const SRC = (rel: string) => readFileSync(new URL(rel, import.meta.url), 'utf8');

const AUTH_SRC = SRC('../../context/AuthContext.tsx');
const MODAL_SRC = SRC('../../components/AccountModal.tsx');
const MAPPER_SRC = SRC('../../utils/authErrorMapper.ts');

describe('set-password error mapping (mapSetPasswordError)', () => {
  it('credential-already-in-use maps to the conflict key, never a raw code', () => {
    expect(mapSetPasswordError({ code: 'auth/credential-already-in-use' })).toBe(
      'CREDENTIAL_ALREADY_IN_USE'
    );
    expect(mapSetPasswordError({ code: 'auth/email-already-in-use' })).toBe(
      'CREDENTIAL_ALREADY_IN_USE'
    );
  });

  it('maps weak-password, invalid-email, requires-recent-login and cancelled reauth', () => {
    expect(mapSetPasswordError({ code: 'auth/weak-password' })).toBe('WEAK_PASSWORD');
    expect(mapSetPasswordError({ code: 'auth/invalid-email' })).toBe('INVALID_EMAIL');
    expect(mapSetPasswordError({ code: 'auth/requires-recent-login' })).toBe(
      'REQUIRES_RECENT_LOGIN'
    );
    expect(mapSetPasswordError({ code: 'auth/popup-closed-by-user' })).toBe('REAUTH_CANCELLED');
  });

  it('maps network failures and falls back to UNKNOWN for anything else', () => {
    expect(mapSetPasswordError({ code: 'auth/network-request-failed' })).toBe('NETWORK_ERROR');
    expect(mapSetPasswordError({})).toBe('UNKNOWN');
    expect(mapSetPasswordError({ code: 'auth/unknown-code' })).toBe('UNKNOWN');
  });
});

describe('signup password rules reused for set-password (validateEmailAuthInput)', () => {
  it('the min-6 floor applies in sign-up mode and only there', () => {
    expect(validateEmailAuthInput('test@example.com', '12345', true)).toBe('auth/weak-password');
    expect(validateEmailAuthInput('test@example.com', '123456', true)).toBeNull();
    // Sign-in mode never blocks a short password client-side.
    expect(validateEmailAuthInput('test@example.com', '123', false)).toBeNull();
  });

  it('a bad email format is flagged the same way as signup', () => {
    expect(validateEmailAuthInput('not-an-email', '123456', true)).toBe('auth/invalid-email');
  });
});

describe('setAccountPassword wiring in AuthContext', () => {
  it('links with linkWithCredential on the current user — no new account path', () => {
    expect(AUTH_SRC).toContain('linkWithCredential } from \'firebase/auth\'');
    expect(AUTH_SRC).toContain('linkWithCredential(cu, credential)');
    expect(AUTH_SRC).not.toContain('createUserWithEmailAndPassword(cu');
  });

  it('guards already-linked accounts and the signup password floor before linking', () => {
    const fn = AUTH_SRC.slice(
      AUTH_SRC.indexOf('const setAccountPassword'),
      AUTH_SRC.indexOf('const logout')
    );
    expect(fn).toContain("if (providerIds.includes('password')) {");
    expect(fn).toContain("return { success: false, error: 'ALREADY_HAS_PASSWORD' };");
    expect(fn).toContain('if (!password || password.length < 6) {');
    expect(fn).toContain("return { success: false, error: 'WEAK_PASSWORD' };");
    expect(fn).toContain('if (!cu) return { success: false, error: \'NOT_LOGGED_IN\' };');
  });

  it('retries once after a Google-popup reauth on requires-recent-login', () => {
    const fn = AUTH_SRC.slice(
      AUTH_SRC.indexOf('const setAccountPassword'),
      AUTH_SRC.indexOf('const logout')
    );
    expect(fn).toContain('reauthenticateWithPopup(cu, new GoogleAuthProvider())');
    // Two link attempts: the first try and the post-reauth retry.
    expect(fn.match(/await attemptLink\(\);/g)).toHaveLength(2);
    expect(fn).toContain("return { success: false, error: 'REAUTH_CANCELLED' };");
  });

  it('refreshes the context user after a successful link and is exposed on the provider', () => {
    const fn = AUTH_SRC.slice(
      AUTH_SRC.indexOf('const setAccountPassword'),
      AUTH_SRC.indexOf('const logout')
    );
    expect(fn).toContain('setUser(auth.currentUser);');
    expect(fn).toContain('return { success: true };');
    expect(AUTH_SRC).toContain(
      'setAccountPassword: (password: string) => Promise<{ success: boolean; error?: string }>;'
    );
    expect(AUTH_SRC).toContain('resetPassword,\n        setAccountPassword,\n        continueAsGuest,');
  });

  it('the mapper (not a raw Firebase message) classifies link failures', () => {
    const fn = AUTH_SRC.slice(
      AUTH_SRC.indexOf('const setAccountPassword'),
      AUTH_SRC.indexOf('const logout')
    );
    expect(fn).toContain('mapSetPasswordError(err)');
    expect(fn).toContain('mapSetPasswordError(err2)');
    expect(MAPPER_SRC).toContain('auth/credential-already-in-use');
  });
});

describe('set-password card wiring in AccountModal', () => {
  it('the card shows only for signed-in non-guest users, inside the Security section', () => {
    expect(MODAL_SRC).toContain('{user && !isGuest && (');
    const cardAt = MODAL_SRC.indexOf('{user && !isGuest && (');
    const pinCardAt = MODAL_SRC.indexOf('PIN ကို PBKDF2-SHA256');
    const adminAt = MODAL_SRC.indexOf('{/* Admin Control Center Banner */}');
    expect(cardAt).toBeGreaterThan(pinCardAt);
    expect(cardAt).toBeLessThan(adminAt);
  });

  it('already-linked accounts see the already-set state with a reset-email path, never a second link', () => {
    expect(MODAL_SRC).toContain('isPasswordUser || passwordJustSet ? (');
    expect(MODAL_SRC).toContain('id="btn-account-send-reset-email"');
    expect(MODAL_SRC).toContain('await resetPassword(email);');
  });

  it('the form validates with signup rules and calls the context link function', () => {
    expect(MODAL_SRC).toContain('validateEmailAuthInput(email, newPassword, true)');
    expect(MODAL_SRC).toContain('await setAccountPassword(newPassword);');
    expect(MODAL_SRC).toContain('id="btn-account-set-password"');
    // Linking lives in the context only — the modal never touches Firebase auth directly.
    expect(MODAL_SRC).not.toContain('linkWithCredential');
  });

  it('all card state hooks sit above the early return (no React #310)', () => {
    const earlyReturnAt = MODAL_SRC.indexOf('if (!isOpen) return null;');
    for (const hook of [
      'const [newPassword, setNewPassword]',
      'const [confirmPassword, setConfirmPassword]',
      'const [setPasswordBusy, setSetPasswordBusy]',
      'const [setPasswordMsg, setSetPasswordMsg]',
      'const [passwordJustSet, setPasswordJustSet]',
    ]) {
      const at = MODAL_SRC.indexOf(hook);
      expect(at).toBeGreaterThan(-1);
      expect(at).toBeLessThan(earlyReturnAt);
    }
  });
});

describe('Version pins roll to v7.6.53 / build 367', () => {
  it('constants, version.json and the top history entry agree, with no Admin strings', () => {
    const VERSION_JSON = JSON.parse(
      readFileSync(new URL('../../../public/version.json', import.meta.url), 'utf8')
    );
    expect(CURRENT_APP_VERSION).toBe('v7.6.56');
    expect(CURRENT_BUILD_NUMBER).toBe(370);
    expect(VERSION_JSON.version).toBe('v7.6.56');
    expect(VERSION_JSON.buildNumber).toBe(370);
    const top = VERSION_HISTORY[0];
    expect(top.version).toBe('v7.6.56');
    expect(top.buildNumber).toBe(370);
    expect(top.changesMy.join(' ')).not.toContain('Admin');
    expect(top.changesEn.join(' ')).not.toContain('Admin');
    expect(top.changesMy.length).toBe(8);
    expect(top.changesEn.length).toBe(8);
    expect(VERSION_JSON.changesMy).toEqual(top.changesMy);
    expect(VERSION_JSON.changesEn).toEqual(top.changesEn);
  });
});

describe('Version bump to v7.6.53 (build 367)', () => {
  it('version constants and history entry match version.json', () => {
    const VERSION_JSON = JSON.parse(
      readFileSync(new URL('../../../public/version.json', import.meta.url), 'utf8')
    );
    expect(CURRENT_APP_VERSION).toBe('v7.6.56');
    expect(CURRENT_BUILD_NUMBER).toBe(370);
    expect(VERSION_JSON.version).toBe('v7.6.56');
    expect(VERSION_JSON.buildNumber).toBe(370);
    const entry = VERSION_HISTORY[0];
    expect(entry.version).toBe('v7.6.56');
    expect(entry.buildNumber).toBe(370);
    expect(entry.releaseDate).toBe('2026-11-27');
    expect(entry.tag).toBe('fix');
    expect(entry.titleMy).toBe('ဒေတာ ထပ်တူညီမှု နှင့် Menu Update ပြင်ဆင်မှုများ');
    expect(entry.titleEn).toBe('Sync honesty, Data Management polish and Menu Update wiring');
    expect(entry.changesMy).toEqual(VERSION_JSON.changesMy);
    expect(entry.changesEn).toEqual(VERSION_JSON.changesEn);
    expect(entry.changesMy).toHaveLength(8);
    expect(entry.changesEn).toHaveLength(8);
    expect(entry.changesMy[0]).toBe(
      'ဖျက်လိုက်တဲ့ မှတ်တမ်းတွေ တခြားဖုန်းမှာ ပြန်ပေါ်မလာတော့ပါဘူး — ဖျက်တာ Cloud ကို ရောက်တဲ့အထိ စောင့်ပြီး အတည်ပြုပါတယ်'
    );
    expect(entry.changesEn[0]).toBe(
      'Deleted records no longer reappear on other devices — deletes are confirmed only once they reach Cloud'
    );
  });
});
