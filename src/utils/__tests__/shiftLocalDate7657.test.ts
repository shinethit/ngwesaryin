// [v7.6.57] Date stepper helper: whole-day shifts on YYYY-MM-DD local
// dates, with month/year/leap boundaries handled by local calendar
// arithmetic (no UTC conversion, so no MMT offset shift).
import { describe, it, expect } from 'vitest';
import { shiftLocalDate } from '../dateUtils';
import { getLocalDateString } from '../dateUtils';

describe('shiftLocalDate (v7.6.57)', () => {
  it('moves one day forward and back', () => {
    expect(shiftLocalDate('2026-11-26', 1)).toBe('2026-11-27');
    expect(shiftLocalDate('2026-11-26', -1)).toBe('2026-11-25');
    expect(shiftLocalDate('2026-11-26', 0)).toBe('2026-11-26');
  });

  it('crosses month boundaries both ways', () => {
    expect(shiftLocalDate('2026-11-30', 1)).toBe('2026-12-01');
    expect(shiftLocalDate('2026-12-01', -1)).toBe('2026-11-30');
    expect(shiftLocalDate('2026-01-31', 1)).toBe('2026-02-01');
    expect(shiftLocalDate('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('crosses year boundaries both ways', () => {
    expect(shiftLocalDate('2026-12-31', 1)).toBe('2027-01-01');
    expect(shiftLocalDate('2027-01-01', -1)).toBe('2026-12-31');
  });

  it('handles leap years', () => {
    expect(shiftLocalDate('2024-02-28', 1)).toBe('2024-02-29');
    expect(shiftLocalDate('2024-02-29', 1)).toBe('2024-03-01');
    expect(shiftLocalDate('2025-02-28', 1)).toBe('2025-03-01');
  });

  it('multi-day shifts stay on the local calendar', () => {
    expect(shiftLocalDate('2026-11-26', 7)).toBe('2026-12-03');
    expect(shiftLocalDate('2026-11-26', -30)).toBe('2026-10-27');
  });

  it('empty or invalid input falls back to today, like the form default', () => {
    const today = getLocalDateString();
    expect(shiftLocalDate('', 0)).toBe(today);
    expect(shiftLocalDate('not-a-date', 1)).toBe(shiftLocalDate(today, 1));
  });
});
