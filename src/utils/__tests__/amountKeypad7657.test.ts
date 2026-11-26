// [v7.6.57] Amount keypad reducer: digits append, one decimal point,
// backspace removes the last char, clear empties. Parsing is always
// parseMyanmarNumber, so keypad-built text parses identically to the
// same typed text.
import { describe, it, expect } from 'vitest';
import { keypadPress } from '../amountKeypad';
import { parseMyanmarNumber } from '../myanmarDigits';

describe('keypadPress (v7.6.57)', () => {
  it('appends digits', () => {
    expect(keypadPress('', '5')).toBe('5');
    expect(keypadPress('5', '0')).toBe('50');
    expect(keypadPress('50', '0')).toBe('500');
    expect(keypadPress('12', '3')).toBe('123');
  });

  it('allows exactly one decimal point', () => {
    expect(keypadPress('', '.')).toBe('0.');
    expect(keypadPress('12', '.')).toBe('12.');
    expect(keypadPress('12.', '.')).toBe('12.');
    expect(keypadPress('12.5', '.')).toBe('12.5');
    expect(keypadPress('0.', '5')).toBe('0.5');
  });

  it('backspace removes the last character, even to empty', () => {
    expect(keypadPress('123', 'back')).toBe('12');
    expect(keypadPress('1', 'back')).toBe('');
    expect(keypadPress('', 'back')).toBe('');
    expect(keypadPress('12.', 'back')).toBe('12');
  });

  it('clear empties any value', () => {
    expect(keypadPress('12345', 'clear')).toBe('');
    expect(keypadPress('', 'clear')).toBe('');
  });

  it('keypad-built text parses identically to the same typed text', () => {
    let built = '';
    for (const k of ['5', '0', '0', '0', '0', '0'] as const) built = keypadPress(built, k);
    expect(built).toBe('500000');
    expect(parseMyanmarNumber(built)).toBe(parseMyanmarNumber('500000'));
    let decimal = '';
    for (const k of ['1', '2', '.', '5'] as const) decimal = keypadPress(decimal, k);
    expect(parseMyanmarNumber(decimal)).toBe(12.5);
    expect(parseMyanmarNumber(decimal)).toBe(parseMyanmarNumber('12.5'));
  });

  it('digits appended after Myanmar digits still parse', () => {
    // The user may type Myanmar digits, then use the keypad.
    const mixed = keypadPress('၅၀၀', '0');
    expect(parseMyanmarNumber(mixed)).toBe(5000);
  });

  it('a chip value built by key presses equals the chip amount', () => {
    let built = '';
    for (const k of ['1', '5', '0', '0', '0', '0', '0'] as const) built = keypadPress(built, k);
    expect(parseMyanmarNumber(built)).toBe(1500000);
  });
});
