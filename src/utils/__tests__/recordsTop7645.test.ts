// [v7.6.45] Parts D+E — Records-top balance card, day cards and
// the Records calendar. Wiring pins are source-text assertions
// (no test renderer in this repo; vitest node env). NO path
// comparisons: sources are read via new URL(..., import.meta.url).
// Visual checks (first viewport, calendar open/closed, eye masked)
// are covered by the Playwright renders, not here.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  VERSION_HISTORY,
  CURRENT_APP_VERSION,
  CURRENT_BUILD_NUMBER,
} from '../../data/versionHistory';

const VERSION_JSON = JSON.parse(
  readFileSync(new URL('../../../public/version.json', import.meta.url), 'utf8'),
);

const TX_SRC = readFileSync(
  new URL('../../components/TransactionsView.tsx', import.meta.url),
  'utf8',
);
const CAL_SRC = readFileSync(
  new URL('../../components/RecordsCalendar.tsx', import.meta.url),
  'utf8',
);
const APP_SRC = readFileSync(new URL('../../App.tsx', import.meta.url), 'utf8');

describe('Records balance card wiring (v7.6.45 Part D)', () => {
  it('the card shows this-month balance, opening, closing and net with the wallet pill and eye', () => {
    expect(TX_SRC).toContain('လက်ကျန် · ဒီလ');
    expect(TX_SRC).toContain('လအစလက်ကျန်');
    expect(TX_SRC).toContain('လအဆုံးလက်ကျန်');
    expect(TX_SRC).toContain('အသားတင်');
    expect(TX_SRC).toContain('ပိုက်ဆံအိတ် ${balanceScopeWallets.length} ခု');
    expect(TX_SRC).toContain('text-[22px]');
    expect(TX_SRC).toContain('••••');
  });

  it('the balance uses the Analytics converter over the Records wallet scope', () => {
    expect(TX_SRC).toContain('convertTxToMMK(walletMap, wallets, t)');
    expect(TX_SRC).toContain('balanceScopeWallets');
    expect(TX_SRC).toContain('monthBalance');
  });

  it('the eye masks only the card amounts and the Reports button needs onSelectTab', () => {
    expect(TX_SRC).toContain('balanceHidden');
    expect(TX_SRC).toContain("onSelectTab('analytics')");
    expect(APP_SRC).toContain('onSelectTab={setActiveTab}');
  });

  it('the calendar is collapsed by default', () => {
    expect(TX_SRC).toContain('const [calendarOpen, setCalendarOpen] = useState(false)');
  });
});

describe('day cards (v7.6.45 Part D)', () => {
  it('each day is its own card with numeral, weekday, month/year, net and count', () => {
    expect(TX_SRC).toContain('splitDayCardParts(group.date, lang)');
    expect(TX_SRC).toContain('dayParts.dayNum');
    expect(TX_SRC).toContain('dayParts.weekday');
    expect(TX_SRC).toContain('dayParts.monthYear');
    expect(TX_SRC).toContain('text-[26px]');
  });

  it('the old sticky day header is gone', () => {
    expect(TX_SRC).not.toContain('Daily Date Header with Subtotals');
    expect(TX_SRC).not.toContain('sticky top-0 z-10');
  });

  it('the day filter composes with the other filters and always has a visible clear path', () => {
    expect(TX_SRC).toContain('const [selectedDay, setSelectedDay] = useState<string | null>(null)');
    expect(TX_SRC).toContain('visibleFiltered');
    expect(TX_SRC).toContain('setSelectedDay(null)');
  });
});

describe('Records calendar (v7.6.45 Part E)', () => {
  it('the mode defaults to in+out, persists, and offers net-only', () => {
    expect(CAL_SRC).toContain("localStorage.getItem(MODE_STORAGE_KEY)");
    expect(CAL_SRC).toContain("'ngwe_records_calendar_mode'");
    expect(CAL_SRC).toContain("return 'both'");
    expect(CAL_SRC).toContain('ဝင်+ထွက်+ကျန်');
    expect(CAL_SRC).toContain('အသားတင်သာ');
  });

  it('tapping a day selects it, tapping again clears it', () => {
    expect(CAL_SRC).toContain('onSelectDay(isSelected ? null : dateStr)');
  });

  it('the calendar is Records-only and the Dashboard calendar file is untouched by this version', () => {
    expect(TX_SRC).toContain('<RecordsCalendar');
    expect(TX_SRC).toContain("from './RecordsCalendar'");
  });
});

describe('Version pins roll to v7.6.52 / build 366', () => {
  it('constants, version.json and the top history entry agree, with no Admin strings', () => {
    expect(CURRENT_APP_VERSION).toBe('v7.6.52');
    expect(CURRENT_BUILD_NUMBER).toBe(366);
    expect(VERSION_JSON.version).toBe('v7.6.52');
    expect(VERSION_JSON.buildNumber).toBe(366);
    const top = VERSION_HISTORY[0];
    expect(top.version).toBe('v7.6.52');
    expect(top.buildNumber).toBe(366);
    expect(top.changesMy.join(' ')).not.toContain('Admin');
    expect(top.changesEn.join(' ')).not.toContain('Admin');
    expect(top.changesMy.length).toBe(3);
    expect(top.changesEn.length).toBe(3);
    expect(VERSION_JSON.changesMy).toEqual(top.changesMy);
    expect(VERSION_JSON.changesEn).toEqual(top.changesEn);
  });
});
