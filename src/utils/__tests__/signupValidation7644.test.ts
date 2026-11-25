// [v7.6.44] Signup short-password validation in Burmese: the email
// form validates client-side BEFORE submit (noValidate suppresses
// the browser's native English bubble), reusing the mapper's
// invalid-email / weak-password texts, and the shown error clears
// when any field changes so a stale error never lingers. Pure-helper
// coverage + wiring pins (the repo pattern: components have no test
// renderer; the visible behaviour is verified by renders). Source
// reads use `new URL` — NO path comparisons.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  getAuthErrorDetails,
  validateEmailAuthInput,
} from '../authErrorMapper';

const SRC = (rel: string) => readFileSync(new URL(rel, import.meta.url), 'utf8');

describe('validateEmailAuthInput (v7.6.44)', () => {
  it('a well-formed email + 6-char password passes in both modes', () => {
    expect(validateEmailAuthInput('aung@gmail.com', 'secret', true)).toBeNull();
    expect(validateEmailAuthInput('aung@gmail.com', 'secret', false)).toBeNull();
  });

  it('a malformed email returns the invalid-email code in both modes', () => {
    expect(validateEmailAuthInput('not-an-email', 'secret12', true)).toBe('auth/invalid-email');
    expect(validateEmailAuthInput('not-an-email', 'secret12', false)).toBe('auth/invalid-email');
    expect(validateEmailAuthInput('aung@', 'secret12', true)).toBe('auth/invalid-email');
    expect(validateEmailAuthInput('aung@gmail', 'secret12', true)).toBe('auth/invalid-email');
  });

  it('email format is checked before password length', () => {
    expect(validateEmailAuthInput('bad', 'abc', true)).toBe('auth/invalid-email');
  });

  it('a 5-char password returns the weak-password code in SIGN-UP mode only', () => {
    expect(validateEmailAuthInput('aung@gmail.com', 'abcde', true)).toBe('auth/weak-password');
    expect(validateEmailAuthInput('aung@gmail.com', 'abcde', false)).toBeNull();
  });

  it('a 6-char password passes in sign-up mode', () => {
    expect(validateEmailAuthInput('aung@gmail.com', 'abcdef', true)).toBeNull();
  });

  it('empty values return null — the caller shows its own fill-in message', () => {
    expect(validateEmailAuthInput('', '', true)).toBeNull();
    expect(validateEmailAuthInput('aung@gmail.com', '', true)).toBeNull();
    expect(validateEmailAuthInput('', 'abcdef', true)).toBeNull();
  });

  it('the returned codes map to Burmese mapper texts with a next action', () => {
    const invalid = getAuthErrorDetails({ code: 'auth/invalid-email' }, 'my');
    expect(invalid.title).toContain('Email');
    expect(invalid.message).toContain('yourname@gmail.com');
    const weak = getAuthErrorDetails({ code: 'auth/weak-password' }, 'my');
    expect(weak.message).toContain('၆ လုံး');
  });
});

describe('LoginScreen email-form wiring (v7.6.44)', () => {
  const LOGIN = SRC('../../components/LoginScreen.tsx');

  it('the email form carries noValidate so no native English bubble appears', () => {
    expect(LOGIN).toContain('<form onSubmit={handleEmailAuth} noValidate');
  });

  it('handleEmailAuth pre-validates through the helper before submit', () => {
    expect(LOGIN).toContain('validateEmailAuthInput(email, password, isSignUp)');
    expect(LOGIN).toContain('formatAuthError({ code: clientError })');
  });

  it('required/type/minLength attributes stay for a11y', () => {
    expect(LOGIN).toContain('type="email"');
    expect(LOGIN).toContain('minLength={6}');
  });

  it('every field clears the shown error on change (no stale error)', () => {
    // displayName, email and password onChange handlers each clear.
    const clears = LOGIN.match(/setErrorMsg\(null\);/g) || [];
    expect(clears.length).toBeGreaterThanOrEqual(3);
    expect(LOGIN).toContain('setDisplayName(e.target.value);\n                        setErrorMsg(null);');
    expect(LOGIN).toContain('setEmail(e.target.value);\n                      setErrorMsg(null);');
    expect(LOGIN).toContain('setPassword(e.target.value);\n                      setErrorMsg(null);');
  });
});
