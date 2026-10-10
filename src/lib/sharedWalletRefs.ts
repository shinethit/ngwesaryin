/**
 * [v6.18.0] sharedWalletRefs — scoped pointer collection for shared wallets.
 *
 * Problem: sharedWallets is a top-level collection. Firestore rules
 * cannot restrict list() by where() clause, so any signed-in user can
 * query the whole collection. This is a Firestore limitation, not an
 * app bug.
 *
 * Solution: mirror share invitations into a per-recipient path —
 *   sharedWalletRefs/{recipientEmailLowercase}/wallets/{docId}
 *
 * A ref is a tiny pointer: { docId, ownerUid, ownerEmail, walletName,
 * addedAt }. The recipient reads their own refs (rules: read only when
 * request.auth.token.email == recipientEmail), then fetches the actual
 * sharedWallets/{docId} doc, whose get rule enforces membership.
 *
 * The ref does NOT contain balance or transaction data.
 *
 * Legacy fallback: subscribeIncomingSharedWallets() still issues the
 * old where('sharedWith','array-contains') query in parallel so that
 * wallets shared before v6.18.0 continue to appear. Once refs are
 * populated everywhere, that query can be removed and
 * sharedWallets list disabled (planned v6.19.0).
 */

import { doc, setDoc, collection, onSnapshot, Unsubscribe, getDocs } from 'firebase/firestore';
import { db, cleanForFirestore, safeSetDoc, safeDeleteDoc } from './firebase';

export interface SharedWalletRef {
  docId: string;
  ownerUid: string;
  ownerEmail: string;
  walletName: string;
  addedAt: number;
}

function normalizeEmail(email: string): string {
  return (email || '').trim().toLowerCase();
}

/**
 * Write a pointer ref so the recipient can discover the shared wallet.
 * Idempotent — safe to call repeatedly (setDoc merge).
 */
export async function writeSharedWalletRef(
  recipientEmail: string,
  ref: SharedWalletRef
): Promise<boolean> {
  const email = normalizeEmail(recipientEmail);
  if (!email || !email.includes('@')) return false;
  if (!ref.docId || !ref.ownerUid) return false;

  try {
    const refRef = doc(db, 'sharedWalletRefs', email, 'wallets', ref.docId);
    await safeSetDoc(refRef, cleanForFirestore({
      docId: ref.docId,
      ownerUid: ref.ownerUid,
      ownerEmail: ref.ownerEmail || '',
      walletName: ref.walletName || '',
      addedAt: ref.addedAt || Date.now(),
    }), { merge: true });
    return true;
  } catch (err) {
    console.warn('[sharedWalletRefs] write failed for', email, ref.docId, err);
    return false;
  }
}

/**
 * Delete a single ref (used when owner stops sharing with someone).
 */
export async function deleteSharedWalletRef(
  recipientEmail: string,
  docId: string
): Promise<boolean> {
  const email = normalizeEmail(recipientEmail);
  if (!email || !docId) return false;
  try {
    await safeDeleteDoc(doc(db, 'sharedWalletRefs', email, 'wallets', docId));
    return true;
  } catch (err) {
    console.warn('[sharedWalletRefs] delete failed', err);
    return false;
  }
}

/**
 * Delete ALL refs for a given wallet docId across the given recipients.
 */
export async function deleteRefsForWallet(
  docId: string,
  recipients: string[]
): Promise<void> {
  for (const email of recipients) {
    await deleteSharedWalletRef(email, docId);
  }
}

/**
 * Fetch this user's shared wallet refs once (non-live).
 */
export async function fetchMyRefs(myEmail: string): Promise<SharedWalletRef[]> {
  const email = normalizeEmail(myEmail);
  if (!email) return [];
  try {
    const snap = await getDocs(collection(db, 'sharedWalletRefs', email, 'wallets'));
    const out: SharedWalletRef[] = [];
    snap.forEach((d) => {
      const data = d.data() as any;
      if (data && typeof data.docId === 'string') {
        out.push({
          docId: data.docId,
          ownerUid: data.ownerUid || '',
          ownerEmail: data.ownerEmail || '',
          walletName: data.walletName || '',
          addedAt: Number(data.addedAt) || 0,
        });
      }
    });
    return out;
  } catch (err) {
    console.warn('[sharedWalletRefs] fetch failed', err);
    return [];
  }
}

/**
 * Live subscription to this user's shared wallet refs.
 */
export function subscribeMyRefs(
  myEmail: string,
  onUpdate: (refs: SharedWalletRef[]) => void,
  onError?: (err: any) => void
): Unsubscribe {
  const email = normalizeEmail(myEmail);
  if (!email) {
    onUpdate([]);
    return () => {};
  }
  const ref = collection(db, 'sharedWalletRefs', email, 'wallets');
  return onSnapshot(
    ref,
    (snap) => {
      const out: SharedWalletRef[] = [];
      snap.forEach((d) => {
        const data = d.data() as any;
        if (data && typeof data.docId === 'string') {
          out.push({
            docId: data.docId,
            ownerUid: data.ownerUid || '',
            ownerEmail: data.ownerEmail || '',
            walletName: data.walletName || '',
            addedAt: Number(data.addedAt) || 0,
          });
        }
      });
      onUpdate(out);
    },
    (err) => {
      if (onError) onError(err);
    }
  );
}
