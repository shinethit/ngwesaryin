// [v7.5.81] Shop reports — shared contract between the Report button/modal
// (ShopCard / ShopsView) and the Admin Panel Shop Reports section.
// Collection: `shop_reports`. One pending report per user per shop (dedupe).

export type ShopReportReason = 'closed' | 'wrong_address' | 'wrong_phone' | 'other';
export type ShopReportStatus = 'pending' | 'resolved' | 'dismissed';

export interface ShopReport {
  id?: string;
  shopId: string;
  shopName: string;
  reason: ShopReportReason;
  /** Optional short note from the reporter ('' when empty). */
  note: string;
  reportedByUid: string;
  /** Reporter email (shown to the admin as a prefix). */
  reportedBy: string;
  // [v7.5.81] Client ms timestamp (Date.now()) at submit time — NOT
  // serverTimestamp(): safeSetDoc runs cleanForFirestore, which rebuilds
  // FieldValue sentinels (serverTimestamp / deleteField) into plain
  // {_methodName: ...} maps (see AGENTS.md v7.5.64 lesson), so a server
  // timestamp would be stored corrupted. The app-wide convention is
  // numeric Date.now() for createdAt/updatedAt (ShopsView, adminAuditLog).
  reportedAt: number;
  status: ShopReportStatus;
}

export const SHOP_REPORT_REASONS: {
  code: ShopReportReason;
  labelMy: string;
  labelEn: string;
}[] = [
  { code: 'closed', labelMy: 'ဆိုင်ပိတ်သွားပြီ', labelEn: 'Shop closed' },
  { code: 'wrong_address', labelMy: 'လိပ်စာမှားနေတယ်', labelEn: 'Wrong address' },
  { code: 'wrong_phone', labelMy: 'ဖုန်းနံပါတ်မှားနေတယ်', labelEn: 'Wrong phone' },
  { code: 'other', labelMy: 'အခြား', labelEn: 'Other' },
];

export function shopReportReasonLabel(
  reason: ShopReportReason,
  lang: 'my' | 'en',
): string {
  const found = SHOP_REPORT_REASONS.find((r) => r.code === reason);
  if (!found) return reason;
  return lang === 'my' ? found.labelMy : found.labelEn;
}

// ---------------------------------------------------------------------------
// [v7.5.81] Submit + dedupe. The Firestore store is injected so the logic
// is unit-testable without live Firestore; the default store is built
// lazily (dynamic import) so importing this module never pulls in
// firebase.ts — tests pass a stub store and never touch the network.
// ---------------------------------------------------------------------------

export const SHOP_REPORTS_COLLECTION = 'shop_reports';

export type SubmitShopReportResult = 'submitted' | 'already_reported' | 'failed';

export function isValidShopReportReason(reason: unknown): reason is ShopReportReason {
  return SHOP_REPORT_REASONS.some((r) => r.code === reason);
}

/** Pure doc builder — the exact shape written to `shop_reports`. */
export function buildShopReportDoc(input: {
  shopId: string;
  shopName: string;
  reason: ShopReportReason;
  note: string;
  reportedByUid: string;
  reportedBy: string;
  reportedAt: number;
}): Omit<ShopReport, 'id'> {
  return {
    shopId: input.shopId,
    shopName: input.shopName.trim(),
    reason: input.reason,
    note: input.note.trim(),
    reportedByUid: input.reportedByUid,
    reportedBy: input.reportedBy,
    reportedAt: input.reportedAt,
    status: 'pending',
  };
}

export interface ShopReportStore {
  getCurrentUser: () => { uid: string; email?: string | null } | null;
  /** True when this user already has a PENDING report for this shop. */
  hasPendingReport: (shopId: string, uid: string) => Promise<boolean>;
  /** Writes the doc (auto-id). Returns false when the write failed. */
  createReport: (data: Omit<ShopReport, 'id'>) => Promise<boolean>;
}

async function defaultShopReportStore(): Promise<ShopReportStore> {
  const [{ db, auth, safeSetDoc }, firestore] = await Promise.all([
    import('../lib/firebase'),
    import('firebase/firestore'),
  ]);
  const { collection, doc, getDocs, query, where } = firestore;
  return {
    getCurrentUser: () => {
      const u = auth.currentUser;
      return u ? { uid: u.uid, email: u.email } : null;
    },
    hasPendingReport: async (shopId, uid) => {
      // Dedupe FIRST, index-free AND rules-permitted: ONE equality
      // filter on reportedByUid ONLY, served by the auto-created
      // single-field index. The read rule allows a query only when it
      // constrains reportedByUid == request.auth.uid (or the reader
      // is an admin) — a shopId-only query does NOT constrain
      // reportedByUid, so Firestore would DENY it for a non-admin
      // user, and a 2-field (shopId + reportedByUid) query would need
      // a composite index (FAILED_PRECONDITION on first live use).
      // shopId AND status are filtered client-side instead. A user
      // has only a handful of reports, so the client-side filter
      // reads almost nothing extra.
      const snap = await getDocs(
        query(collection(db, SHOP_REPORTS_COLLECTION), where('reportedByUid', '==', uid)),
      );
      return snap.docs.some((d) => {
        const data = d.data() as Partial<ShopReport>;
        return data.shopId === shopId && data.status === 'pending';
      });
    },
    createReport: async (data) => {
      // Auto-id via doc(collection(...)) + safeSetDoc — the same pattern
      // as adminAuditLog; safeSetDoc's boolean return is the truth, so a
      // failed write never looks like success. No safeAddDoc exists.
      return safeSetDoc(doc(collection(db, SHOP_REPORTS_COLLECTION)), data);
    },
  };
}

/**
 * Submit a shop report. Dedupe runs FIRST: a user with a pending report
 * for this shop gets 'already_reported' and no duplicate doc is created.
 * Any failure (no user, bad reason, failed dedupe query, failed write)
 * returns 'failed' — never a false success.
 */
export async function submitShopReport(
  input: {
    shopId: string;
    shopName: string;
    reason: ShopReportReason;
    note?: string;
  },
  store?: ShopReportStore,
): Promise<SubmitShopReportResult> {
  try {
    const s = store ?? (await defaultShopReportStore());
    const user = s.getCurrentUser();
    if (!user) return 'failed';
    if (!input.shopId?.trim() || !input.shopName?.trim()) return 'failed';
    if (!isValidShopReportReason(input.reason)) return 'failed';
    if (await s.hasPendingReport(input.shopId, user.uid)) return 'already_reported';
    const ok = await s.createReport(
      buildShopReportDoc({
        shopId: input.shopId,
        shopName: input.shopName,
        reason: input.reason,
        note: input.note ?? '',
        reportedByUid: user.uid,
        reportedBy: user.email || '',
        reportedAt: Date.now(),
      }),
    );
    return ok ? 'submitted' : 'failed';
  } catch (err) {
    console.warn('[shopReports] submit failed:', err);
    return 'failed';
  }
}
