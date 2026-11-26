// [v7.6.57] Wiring pins: the entry-form helpers must actually be
// wired — the amount input, the chips and the keypad share ONE
// apply path, and both stepper buttons call the one-day shift.
// Source-text pins only; behavior is proven by unit tests +
// the Playwright harness.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const MODAL_SRC = readFileSync(
  new URL('../../components/TransactionModal.tsx', import.meta.url),
  'utf8',
);

describe('entry-form helpers wiring (v7.6.57)', () => {
  it('the typed amount input goes through applyAmountText', () => {
    expect(MODAL_SRC).toContain('onChange={(e) => applyAmountText(e.target.value)}');
  });

  it('quick-amount chips are exactly 500,000 / 1,000,000 / 1,500,000 and SET the amount', () => {
    expect(MODAL_SRC).toContain('QUICK_AMOUNTS_7657 = [500000, 1000000, 1500000]');
    expect(MODAL_SRC).toContain('onClick={() => applyAmountText(String(v))}');
  });

  it('keypad keys go through keypadPress + applyAmountText', () => {
    expect(MODAL_SRC).toContain('applyAmountText(keypadPress(amount, k))');
    expect(MODAL_SRC).toContain("KEYPAD_KEYS_7657: KeypadKey[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'back']");
  });

  it('the keypad toggle and Clear button exist', () => {
    expect(MODAL_SRC).toContain('setKeypadOpen(!keypadOpen)');
    expect(MODAL_SRC).toContain("onClick={() => applyAmountText('')}");
  });

  it('the keypad resets closed on a fresh open', () => {
    expect(MODAL_SRC).toContain('setKeypadOpen(false)');
  });

  it('both stepper buttons shift by exactly one day through shiftLocalDate', () => {
    expect(MODAL_SRC).toContain('onClick={() => handleDateShift(-1)}');
    expect(MODAL_SRC).toContain('onClick={() => handleDateShift(1)}');
    expect(MODAL_SRC).toContain('setDate(shiftLocalDate(date, days))');
  });

  it('no other amount/date save logic was touched: save still parses the same amount state', () => {
    expect(MODAL_SRC).toContain('parseMyanmarNumber(amount)');
  });
});
