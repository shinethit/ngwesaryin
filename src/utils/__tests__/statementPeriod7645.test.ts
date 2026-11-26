// [v7.6.45] Part F — statement-period presets: Day / Week /
// Quarter / Year bounds. Week starts on Sunday (the calendar
// grid's convention); Quarter is the calendar quarter. Bounds are
// pure date math over local dates, so the tests pin exact dates.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { statementPeriodBounds } from '../statementPeriod';
import {
  VERSION_HISTORY,
  CURRENT_APP_VERSION,
  CURRENT_BUILD_NUMBER,
} from '../../data/versionHistory';

const VERSION_JSON = JSON.parse(
  readFileSync(new URL('../../../public/version.json', import.meta.url), 'utf8'),
);

const ANALYTICS_SRC = readFileSync(
  new URL('../../components/AnalyticsView.tsx', import.meta.url),
  'utf8',
);

// Local-midnight construction: getLocalDateString formats with the
// local getters, so the bounds never depend on the VM timezone.
const D = (y: number, m: number, d: number) => new Date(y, m - 1, d);
const CUSTOM = { start: '2026-01-05', end: '2026-02-06' };

describe('statementPeriodBounds (v7.6.45 Part F)', () => {
  it('day is today only', () => {
    expect(statementPeriodBounds('day', D(2026, 11, 25), CUSTOM)).toEqual({
      start: '2026-11-25',
      end: '2026-11-25',
    });
  });

  it('week runs Sunday to Saturday around today', () => {
    // 2026-11-25 is a Wednesday.
    expect(statementPeriodBounds('week', D(2026, 11, 25), CUSTOM)).toEqual({
      start: '2026-11-22',
      end: '2026-11-28',
    });
  });

  it('week starting on a Sunday starts that same day', () => {
    expect(statementPeriodBounds('week', D(2026, 11, 22), CUSTOM)).toEqual({
      start: '2026-11-22',
      end: '2026-11-28',
    });
  });

  it('week ending on a Saturday ends that same day', () => {
    expect(statementPeriodBounds('week', D(2026, 11, 28), CUSTOM)).toEqual({
      start: '2026-11-22',
      end: '2026-11-28',
    });
  });

  it('quarter is the calendar quarter', () => {
    expect(statementPeriodBounds('quarter', D(2026, 11, 25), CUSTOM)).toEqual({
      start: '2026-10-01',
      end: '2026-12-31',
    });
    expect(statementPeriodBounds('quarter', D(2026, 1, 15), CUSTOM)).toEqual({
      start: '2026-01-01',
      end: '2026-03-31',
    });
    expect(statementPeriodBounds('quarter', D(2026, 4, 1), CUSTOM)).toEqual({
      start: '2026-04-01',
      end: '2026-06-30',
    });
  });

  it('year is the calendar year', () => {
    expect(statementPeriodBounds('year', D(2026, 11, 25), CUSTOM)).toEqual({
      start: '2026-01-01',
      end: '2026-12-31',
    });
    expect(statementPeriodBounds('year', D(2026, 12, 31), CUSTOM)).toEqual({
      start: '2026-01-01',
      end: '2026-12-31',
    });
  });

  it('the older presets are unchanged', () => {
    expect(statementPeriodBounds('thisMonth', D(2026, 11, 25), CUSTOM)).toEqual({
      start: '2026-11-01',
      end: '2026-11-30',
    });
    expect(statementPeriodBounds('lastMonth', D(2026, 11, 25), CUSTOM)).toEqual({
      start: '2026-10-01',
      end: '2026-10-31',
    });
    expect(statementPeriodBounds('all', D(2026, 11, 25), CUSTOM)).toEqual({
      start: null,
      end: null,
    });
    expect(statementPeriodBounds('custom', D(2026, 11, 25), CUSTOM)).toEqual({
      start: '2026-01-05',
      end: '2026-02-06',
    });
  });

  it('AnalyticsView wires the bounds helper and the four new preset labels', () => {
    expect(ANALYTICS_SRC).toContain('statementPeriodBounds(statementPeriod');
    expect(ANALYTICS_SRC).toContain("'day'");
    expect(ANALYTICS_SRC).toContain("'quarter'");
    expect(ANALYTICS_SRC).toContain('ဒီနေ့');
    expect(ANALYTICS_SRC).toContain('ဒီအပတ်');
    expect(ANALYTICS_SRC).toContain('ဒီသုံးလပတ်');
    expect(ANALYTICS_SRC).toContain('ဒီနှစ်');
  });
});

describe('Version pins roll to v7.6.52 / build 366', () => {
  it('constants, version.json and the top history entry agree, with no Admin strings', () => {
    expect(CURRENT_APP_VERSION).toBe('v7.6.58');
    expect(CURRENT_BUILD_NUMBER).toBe(372);
    expect(VERSION_JSON.version).toBe('v7.6.58');
    expect(VERSION_JSON.buildNumber).toBe(372);
    const top = VERSION_HISTORY[0];
    expect(top.version).toBe('v7.6.58');
    expect(top.buildNumber).toBe(372);
    expect(top.changesMy.join(' ')).not.toContain('Admin');
    expect(top.changesEn.join(' ')).not.toContain('Admin');
    expect(top.changesMy.length).toBe(3);
    expect(top.changesEn.length).toBe(3);
    expect(VERSION_JSON.changesMy).toEqual(top.changesMy);
    expect(VERSION_JSON.changesEn).toEqual(top.changesEn);
  });
});
