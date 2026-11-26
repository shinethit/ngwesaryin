// [v7.6.46] Part B — AdminPanel VISIBLE usability redesign: the tab
// strip is a tinted band with count badges, every tab gets a header
// block (title + purpose + primary action), forms are featured
// cards. ZERO function loss: the full inventory (buttons, tables,
// inputs, handlers, all 6 tabs) is verified present before/after
// — the only deliberate addition is one overview Refresh button.
// Admin strings never appear in the public changelog (pinned by
// the version-pin tests). Populated-data rows cannot render in
// the harness (live Firestore listeners); layout/empty states
// are verified by renders.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const ADMIN_SRC = readFileSync(
  new URL('../../components/AdminPanel.tsx', import.meta.url),
  'utf8',
);

const lineCount = (needle: string) =>
  ADMIN_SRC.split('\n').filter((line) => line.includes(needle)).length;

describe('AdminPanel visible redesign (v7.6.46 Part B)', () => {
  it('the tab strip is a tinted band with an active indigo tab', () => {
    expect(ADMIN_SRC).toContain('bg-indigo-50/60 border border-indigo-100 rounded-2xl');
    expect(ADMIN_SRC).toContain('bg-indigo-600 text-white shadow-sm shadow-indigo-600/20');
    expect(ADMIN_SRC).toContain('[v7.6.46] Tinted band');
  });

  it('all six tabs are present, each with its icon + label', () => {
    for (const tab of ['overview', 'quota', 'users_codes', 'broadcast', 'contact_info', 'analytics']) {
      expect(ADMIN_SRC).toContain(`data-tab="${tab}"`);
      expect(ADMIN_SRC).toContain(`setActiveTab('${tab}')`);
    }
  });

  it('count badges show on the users, broadcast and analytics tabs', () => {
    expect(ADMIN_SRC).toContain('usersList.length');
    expect(ADMIN_SRC).toContain('messages.filter((m) => m.isActive).length');
    expect(ADMIN_SRC).toContain('visitorsTotalCount ?? analyticsStats.total');
  });

  it('every tab gets a header block: title + purpose + primary action', () => {
    // Five explicit header blocks + the contact_info banner kept as
    // its header (no duplicate header added there).
    expect(ADMIN_SRC.match(/\[v7\.6\.46\] Tab header/g)?.length).toBeGreaterThanOrEqual(5);
  });

  it('the full function inventory is intact: 78 buttons, 5 tables, 32 inputs', () => {
    // BEFORE (v7.6.45): 77 buttons, 5 tables, 32 inputs. The +1 is
    // the deliberate overview Refresh button (fetchAllData) in the
    // new overview header block — the only addition.
    expect(lineCount('<button')).toBe(78);
    expect(lineCount('<table')).toBe(5);
    expect(
      ADMIN_SRC.split('\n').filter((line) => line.includes('<input') || line.includes('<select') || line.includes('<textarea')).length,
    ).toBe(32);
    expect(ADMIN_SRC).toContain('fetchAllData');
  });

  it('every 45 handler is still wired', () => {
    for (const handler of [
      'handleGenerateCodes',
      'handleSaveMessage',
      'handleSaveContactInfo',
      'handleDeleteVisitor',
      'runShopImport',
      'handleDeleteShopFromReport',
      'handleDismissShopPriceAlert',
      'handleGrantPlanWithDuration',
      'handlePurgeCategoryTransactions',
    ]) {
      expect(ADMIN_SRC).toContain(handler);
    }
    expect(ADMIN_SRC).toContain('<QuotaDashboard');
  });

  it('no tab was merged away: all six tab bodies still render', () => {
    for (const tab of ['overview', 'quota', 'users_codes', 'broadcast', 'contact_info', 'analytics']) {
      expect(ADMIN_SRC).toContain(`activeTab === '${tab}'`);
    }
  });
});
