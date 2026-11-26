// [v7.6.55] Smart Calendar follows the Hero wallet scope: its own
// wallet picker (UI row + local multi-select state) is removed, and
// matchesWalletFilter is the `wallets` prop (the Dashboard scope, A5)
// with no local override. Records keeps its own independent filter
// (user decision 2026-11-23) — untouched. Source-text assertions
// follow the established pattern (no test renderer in this repo;
// vitest node env). NO path comparisons: sources are read via
// new URL(..., import.meta.url).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const CARD_SRC = readFileSync(
  new URL('../../components/SmartCalendarCard.tsx', import.meta.url),
  'utf8',
);
const DASH_SRC = readFileSync(
  new URL('../../components/Dashboard.tsx', import.meta.url),
  'utf8',
);

describe('Smart Calendar wallet scope follows the Hero (v7.6.55)', () => {
  it('has no local wallet picker state or UI', () => {
    expect(CARD_SRC).not.toContain('selectedWalletIds');
    expect(CARD_SRC).not.toContain('walletFilterOpen');
    expect(CARD_SRC).not.toContain('toggleWallet');
    expect(CARD_SRC).not.toContain('ပိုက်ဆံအိတ် ရွေးရန်:');
    expect(CARD_SRC).not.toContain('Wallet Filter:');
    expect(CARD_SRC).not.toContain('Dashboard အတိုင်း');
    expect(CARD_SRC).not.toContain('as on Dashboard');
  });

  it('matchesWalletFilter is the wallets prop, with the empty-scope default', () => {
    expect(CARD_SRC).toContain('const matchesWalletFilter');
    expect(CARD_SRC).toContain('if (wallets.length === 0) return true;');
    expect(CARD_SRC).toContain(
      'return wallets.some((w) => isWalletMatch(w, walletId));',
    );
  });

  it('the Dashboard call site passes the Hero-selected scope', () => {
    expect(DASH_SRC).toContain('wallets={scopedWallets}');
    expect(DASH_SRC).toContain('<SmartCalendarCard');
  });

  it('month navigator and summary text stay', () => {
    expect(CARD_SRC).toContain('Smart Calendar');
    expect(CARD_SRC).toContain('ChevronLeft');
    expect(CARD_SRC).toContain('ChevronRight');
  });
});
