// [v7.6.46] Part F — Smart Calendar cell tint by day net, with the
// premium navy/gold band for nets over 100,000 MMK. Selected keeps
// its indigo ring; today keeps its numeral badge (recoloured on
// navy). Net sign decides; net == 0 and no-data days stay white.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  getSmartDayCellTone,
  PREMIUM_NET_THRESHOLD_MMK,
} from '../../components/SmartCalendarCard';

const CARD_SRC = readFileSync(
  new URL('../../components/SmartCalendarCard.tsx', import.meta.url),
  'utf8',
);

describe('getSmartDayCellTone (v7.6.46 Part F)', () => {
  it('the premium threshold is 100,000 MMK', () => {
    expect(PREMIUM_NET_THRESHOLD_MMK).toBe(100000);
  });

  it('net over 100,000 is navy; exactly 100,000 stays green', () => {
    expect(getSmartDayCellTone(100001, true)).toBe('navy');
    expect(getSmartDayCellTone(200000, true)).toBe('navy');
    expect(getSmartDayCellTone(100000, true)).toBe('green');
    expect(getSmartDayCellTone(50000, true)).toBe('green');
  });

  it('negative nets are red, zero is plain', () => {
    expect(getSmartDayCellTone(-1, true)).toBe('red');
    expect(getSmartDayCellTone(-150000, true)).toBe('red');
    expect(getSmartDayCellTone(0, true)).toBe('plain');
  });

  it('no data is plain whatever the net value passed', () => {
    expect(getSmartDayCellTone(0, false)).toBe('plain');
    expect(getSmartDayCellTone(200000, false)).toBe('plain');
    expect(getSmartDayCellTone(-5000, false)).toBe('plain');
  });
});

describe('SmartCalendar cell composition (v7.6.46 Part F)', () => {
  it('navy cells use the navy background with gold-toned text', () => {
    expect(CARD_SRC).toContain("bg-[#1E3A5F]");
    expect(CARD_SRC).toContain('text-amber-300');
    expect(CARD_SRC).toContain('text-amber-200');
  });

  it('green and red tints are light 50-level backgrounds', () => {
    expect(CARD_SRC).toContain('bg-emerald-50');
    expect(CARD_SRC).toContain('bg-rose-50');
  });

  it('selected keeps its indigo wash and ring over every tint', () => {
    expect(CARD_SRC).toContain("bg-indigo-50/30");
    expect(CARD_SRC).toContain('ring-2 ring-indigo-600 z-10');
    // Navy applies only when not selected.
    expect(CARD_SRC).toContain("cellTone === 'navy' && !isSelected");
  });

  it('today keeps its numeral badge, recoloured gold on navy', () => {
    expect(CARD_SRC).toContain("bg-amber-300 text-slate-900");
    expect(CARD_SRC).toContain("bg-indigo-600 text-white");
  });

  it('the old faint amber today wash is replaced by the net tint', () => {
    expect(CARD_SRC).not.toContain('bg-amber-50/30');
  });

  it('the empty-day placeholder stays readable on navy', () => {
    expect(CARD_SRC).toContain('text-amber-200/60');
  });
});
