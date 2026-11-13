// [v7.5.81] Unit tests for shop reports — reason validation, the report
// doc shape, and submit + dedupe with a STUBBED store. No live Firestore:
// submitShopReport takes the store as an optional second argument, and
// the default (real Firestore) store is built lazily, so importing this
// module never touches firebase.
import { describe, it, expect, vi } from 'vitest';

import {
  SHOP_REPORT_REASONS,
  buildShopReportDoc,
  isValidShopReportReason,
  shopReportReasonLabel,
  submitShopReport,
  type ShopReport,
  type ShopReportStore,
} from '../shopReports';

// [v7.5.81] The REAL (default) store is exercised below with MOCKED
// Firestore — no network. The dedupe query must be a SINGLE equality
// filter on reportedByUid (rules-permitted, auto single-field index),
// with shopId + status filtered client-side — never a shopId-only
// query (the read rule cannot prove it for a non-admin, so Firestore
// DENIES it) and never a 2-field query (needs a composite index).
vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_db: unknown, name: string) => ({ __coll: name })),
  doc: vi.fn((...args: unknown[]) => ({ __doc: args })),
  getDocs: vi.fn(async () => ({ docs: [] as { data: () => unknown }[] })),
  query: vi.fn((coll: Record<string, unknown>, ...constraints: unknown[]) => ({
    ...coll,
    constraints,
  })),
  where: vi.fn((field: string, op: string, value: unknown) => ({ field, op, value })),
}));
vi.mock('../../lib/firebase', () => ({
  db: {},
  auth: { currentUser: { uid: 'uid-1', email: 'user@example.com' } },
  safeSetDoc: vi.fn(async () => true),
}));

import { getDocs, query, where } from 'firebase/firestore';
import { safeSetDoc } from '../../lib/firebase';

function stubStore(overrides: Partial<ShopReportStore> = {}): ShopReportStore & {
  createReport: ReturnType<typeof vi.fn>;
  hasPendingReport: ReturnType<typeof vi.fn>;
} {
  return {
    getCurrentUser: () => ({ uid: 'uid-1', email: 'user@example.com' }),
    hasPendingReport: vi.fn(async () => false),
    createReport: vi.fn(async () => true),
    ...overrides,
  } as any;
}

describe('isValidShopReportReason', () => {
  it('accepts exactly the four contract codes', () => {
    for (const r of SHOP_REPORT_REASONS) {
      expect(isValidShopReportReason(r.code)).toBe(true);
    }
  });

  it('rejects anything else', () => {
    expect(isValidShopReportReason('bogus')).toBe(false);
    expect(isValidShopReportReason('')).toBe(false);
    expect(isValidShopReportReason(undefined)).toBe(false);
    expect(isValidShopReportReason(null)).toBe(false);
  });
});

describe('shopReportReasonLabel', () => {
  it('returns the MY / EN label for every code', () => {
    expect(shopReportReasonLabel('closed', 'my')).toBe('ဆိုင်ပိတ်သွားပြီ');
    expect(shopReportReasonLabel('closed', 'en')).toBe('Shop closed');
    expect(shopReportReasonLabel('wrong_address', 'my')).toBe('လိပ်စာမှားနေတယ်');
    expect(shopReportReasonLabel('wrong_address', 'en')).toBe('Wrong address');
    expect(shopReportReasonLabel('wrong_phone', 'my')).toBe('ဖုန်းနံပါတ်မှားနေတယ်');
    expect(shopReportReasonLabel('wrong_phone', 'en')).toBe('Wrong phone');
    expect(shopReportReasonLabel('other', 'my')).toBe('အခြား');
    expect(shopReportReasonLabel('other', 'en')).toBe('Other');
  });

  it('falls back to the code itself for an unknown reason', () => {
    expect(shopReportReasonLabel('bogus' as any, 'my')).toBe('bogus');
  });
});

describe('buildShopReportDoc', () => {
  it('builds the exact shop_reports doc shape', () => {
    const doc = buildShopReportDoc({
      shopId: 'shop-1',
      shopName: 'Denko Shop',
      reason: 'wrong_phone',
      note: '  number changed  ',
      reportedByUid: 'uid-1',
      reportedBy: 'user@example.com',
      reportedAt: 1790000000000,
    });
    expect(doc).toEqual({
      shopId: 'shop-1',
      shopName: 'Denko Shop',
      reason: 'wrong_phone',
      note: 'number changed',
      reportedByUid: 'uid-1',
      reportedBy: 'user@example.com',
      reportedAt: 1790000000000,
      status: 'pending',
    } satisfies Omit<ShopReport, 'id'>);
  });

  it("note is '' when empty or whitespace-only; shop name is trimmed", () => {
    const doc = buildShopReportDoc({
      shopId: 'shop-1',
      shopName: '  Denko Shop ',
      reason: 'other',
      note: '   ',
      reportedByUid: 'uid-1',
      reportedBy: '',
      reportedAt: 1,
    });
    expect(doc.note).toBe('');
    expect(doc.shopName).toBe('Denko Shop');
    expect(doc.status).toBe('pending');
  });
});

describe('submitShopReport (stubbed store)', () => {
  it('submits and writes the doc when there is no pending report', async () => {
    const store = stubStore();
    const result = await submitShopReport(
      { shopId: 'shop-1', shopName: 'Denko Shop', reason: 'closed', note: 'shut in Oct' },
      store,
    );
    expect(result).toBe('submitted');
    expect(store.hasPendingReport).toHaveBeenCalledWith('shop-1', 'uid-1');
    expect(store.createReport).toHaveBeenCalledTimes(1);
    const written = store.createReport.mock.calls[0][0] as Omit<ShopReport, 'id'>;
    expect(written.shopId).toBe('shop-1');
    expect(written.shopName).toBe('Denko Shop');
    expect(written.reason).toBe('closed');
    expect(written.note).toBe('shut in Oct');
    expect(written.reportedByUid).toBe('uid-1');
    expect(written.reportedBy).toBe('user@example.com');
    expect(written.status).toBe('pending');
    expect(typeof written.reportedAt).toBe('number');
  });

  it('returns already_reported and writes NOTHING when a pending report exists', async () => {
    const store = stubStore({ hasPendingReport: vi.fn(async () => true) });
    const result = await submitShopReport(
      { shopId: 'shop-1', shopName: 'Denko Shop', reason: 'closed' },
      store,
    );
    expect(result).toBe('already_reported');
    expect(store.createReport).not.toHaveBeenCalled();
  });

  it('returns failed (no write) when nobody is signed in', async () => {
    const store = stubStore({ getCurrentUser: () => null });
    const result = await submitShopReport(
      { shopId: 'shop-1', shopName: 'Denko Shop', reason: 'closed' },
      store,
    );
    expect(result).toBe('failed');
    expect(store.createReport).not.toHaveBeenCalled();
  });

  it('returns failed (no write) for an invalid reason', async () => {
    const store = stubStore();
    const result = await submitShopReport(
      { shopId: 'shop-1', shopName: 'Denko Shop', reason: 'bogus' as any },
      store,
    );
    expect(result).toBe('failed');
    expect(store.createReport).not.toHaveBeenCalled();
  });

  it('returns failed (no write) for an empty shop id / name', async () => {
    const store = stubStore();
    expect(
      await submitShopReport({ shopId: '   ', shopName: 'Denko', reason: 'other' }, store),
    ).toBe('failed');
    expect(
      await submitShopReport({ shopId: 'shop-1', shopName: '   ', reason: 'other' }, store),
    ).toBe('failed');
    expect(store.createReport).not.toHaveBeenCalled();
  });

  it('returns failed — never a false success — when the write reports false', async () => {
    const store = stubStore({ createReport: vi.fn(async () => false) });
    const result = await submitShopReport(
      { shopId: 'shop-1', shopName: 'Denko Shop', reason: 'other' },
      store,
    );
    expect(result).toBe('failed');
  });

  it('returns failed when the dedupe query throws (no false success, no write)', async () => {
    const store = stubStore({ hasPendingReport: vi.fn(async () => { throw new Error('denied'); }) });
    const result = await submitShopReport(
      { shopId: 'shop-1', shopName: 'Denko Shop', reason: 'other' },
      store,
    );
    expect(result).toBe('failed');
    expect(store.createReport).not.toHaveBeenCalled();
  });

  it('returns failed when the write throws', async () => {
    const store = stubStore({ createReport: vi.fn(async () => { throw new Error('offline'); }) });
    const result = await submitShopReport(
      { shopId: 'shop-1', shopName: 'Denko Shop', reason: 'other' },
      store,
    );
    expect(result).toBe('failed');
  });
});

describe('submitShopReport — default store dedupe query (mocked Firestore)', () => {
  const fakeDocs = (rows: Partial<ShopReport>[]) => ({
    docs: rows.map((r) => ({ data: () => r })),
  });

  it('queries reportedByUid ONLY and dedupes on a matching pending report', async () => {
    vi.mocked(getDocs).mockResolvedValueOnce(
      fakeDocs([{ shopId: 'shop-1', reportedByUid: 'uid-1', status: 'pending' }]) as never,
    );
    const result = await submitShopReport(
      { shopId: 'shop-1', shopName: 'Denko Shop', reason: 'closed' },
    );
    expect(result).toBe('already_reported');
    // Exactly ONE where() — on reportedByUid, never on shopId.
    expect(where).toHaveBeenCalledTimes(1);
    expect(where).toHaveBeenCalledWith('reportedByUid', '==', 'uid-1');
    expect(query).toHaveBeenCalledTimes(1);
    expect(vi.mocked(safeSetDoc)).not.toHaveBeenCalled();
  });

  it('ignores other shops and non-pending reports (client-side filter)', async () => {
    vi.mocked(getDocs).mockResolvedValueOnce(
      fakeDocs([
        { shopId: 'shop-2', reportedByUid: 'uid-1', status: 'pending' },
        { shopId: 'shop-1', reportedByUid: 'uid-1', status: 'resolved' },
        { shopId: 'shop-1', reportedByUid: 'uid-1', status: 'dismissed' },
      ]) as never,
    );
    const result = await submitShopReport(
      { shopId: 'shop-1', shopName: 'Denko Shop', reason: 'wrong_phone' },
    );
    expect(result).toBe('submitted');
    expect(where).toHaveBeenCalledWith('reportedByUid', '==', 'uid-1');
    expect(vi.mocked(safeSetDoc)).toHaveBeenCalledTimes(1);
  });
});
