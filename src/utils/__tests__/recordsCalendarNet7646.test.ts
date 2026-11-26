// [v7.6.46] Part A — Records calendar 'both' mode shows the net /
// balance line under in/out, and the tooltip lists the net. The
// toggle label covers all three values. 'net' mode, the stored
// preference key and the day-tap filter behaviour are unchanged.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const CAL_SRC = readFileSync(
  new URL('../../components/RecordsCalendar.tsx', import.meta.url),
  'utf8',
);

describe('RecordsCalendar net line (v7.6.46 Part A)', () => {
  it('the toggle label covers in, out and net', () => {
    expect(CAL_SRC).toContain('ဝင်+ထွက်+ကျန်');
    expect(CAL_SRC).toContain('In + Out + Net');
    expect(CAL_SRC).not.toContain('ဝင်+ထွက် နှစ်ခုလုံး');
  });

  it('both-mode cells render a net row in indigo under in/out', () => {
    expect(CAL_SRC).toContain('text-indigo-700');
    // Net row renders whenever the day has any in or out.
    expect(CAL_SRC).toContain('(totals.in > 0 || totals.out > 0) && (');
    expect(CAL_SRC).toContain('[v7.6.46] Net row');
  });

  it('the tooltip lists in, out and net', () => {
    expect(CAL_SRC).toContain('· ကျန်');
    expect(CAL_SRC).toContain('· Net');
  });

  it('both-mode cells grow to fit three lines, net mode is unchanged', () => {
    expect(CAL_SRC).toContain("min-h-[60px]");
    expect(CAL_SRC).toContain("min-h-[46px]");
    // Net-only mode keeps its own signed emerald/rose line.
    expect(CAL_SRC).toContain("mode === 'net'");
    expect(CAL_SRC).toContain('text-emerald-700');
  });

  it('the stored preference key and default are unchanged', () => {
    expect(CAL_SRC).toContain("'ngwe_records_calendar_mode'");
    expect(CAL_SRC).toContain("return 'both'");
    expect(CAL_SRC).toContain("setModePersist('both')");
    expect(CAL_SRC).toContain("setModePersist('net')");
  });

  it('tapping a day still filters the list (behaviour unchanged)', () => {
    expect(CAL_SRC).toContain('onSelectDay');
  });
});
