import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  Unsubscribe,
  writeBatch,
  updateDoc,
  FieldPath,
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType, cleanForFirestore, safeSetDoc, safeDeleteDoc, safeUpdateDoc, isQuotaExhausted } from './firebase';
import { Wallet, Transaction, Debt } from '../types';
import { writeSharedWalletRef, deleteSharedWalletRef, deleteRefsForWallet, subscribeMyRefs } from './sharedWalletRefs';

export interface SharedWalletPayload {
  id: string;
  originalId?: string;
  ownerUid: string;
  ownerEmail: string;
  ownerName: string;
  name: string;
  nameEn: string;
  type: string;
  balance: number;
  initialBalance?: number;
  includeInTotals?: boolean;
  color: string;
  icon: string;
  currency?: string;
  exchangeRate?: number;
  // [v7.5.56] accountNumber is NEVER written to the shared doc (and no
  // other sensitive field): the shared payload carries only what every
  // member needs to see. The field was removed from this payload type.
  sharedWith: string[];
  collaboratorPermissions?: Record<string, import('../types').WalletPermissions>;
  // [v7.5.56] memberUids: lowercased member email → member uid. Lets
  // the owner resolve a member's email to a uid for ownership transfer.
  // Members write only their own entry (see rules); the owner may
  // write the map as part of a transfer.
  memberUids?: Record<string, string>;
  updatedAt: string;
}

/**
 * Helper to get the canonical shared document ID in Firestore.
 * [v7.5.56] sharedDocId is authoritative — after an ownership
 * transfer the doc id is STILL {originalOwnerUid}_{walletId}, so a
 * wallet whose ownerUid is now the new owner must NOT be re-derived
 * from ownerUid/currentUid (that would point at a doc that does not
 * exist). The incoming-share listener always stamps sharedDocId on
 * the Wallet it emits, including for the new owner.
 */
export function getSharedWalletDocId(wallet: Wallet, currentUid?: string): string {
  if (wallet.sharedDocId) return wallet.sharedDocId;
  if (wallet.isSharedFromOther) {
    if (wallet.id.startsWith('shared_')) {
      return wallet.id.replace(/^shared_/, '');
    }
    return wallet.id;
  }
  const owner = wallet.ownerUid || currentUid || '';
  if (owner && !wallet.id.startsWith(`${owner}_`)) {
    return `${owner}_${wallet.id}`;
  }
  return wallet.id;
}

/**
 * [v7.5.56] Best-effort: record a member's OWN uid in the shared doc's
 * memberUids map (lowercased email → uid) so the owner can resolve the
 * member's email to a uid for ownership transfer. Uses the
 * updateDoc(docRef, FieldPath, value) overload so an email containing
 * dots stays ONE map key instead of becoming a nested path. Only the
 * caller's own entry is ever written (the rules forbid touching any
 * other entry). Never throws; returns false on any failure — the map
 * is best-effort and a later accept/subscribe run retries it.
 */
async function writeOwnMemberUid(
  sharedDocId: string,
  emailLower: string,
  uid: string
): Promise<boolean> {
  try {
    if (!sharedDocId || !emailLower || !emailLower.includes('@') || !uid) return false;
    if (isQuotaExhausted()) return false;
    const ref = doc(db, 'sharedWallets', sharedDocId);
    const done = updateDoc(ref, new FieldPath('memberUids', emailLower), uid).then(
      () => 'ok' as const,
      () => 'fail' as const
    );
    // 8s safety net — best-effort only, never block the caller.
    const timeout = new Promise<'timeout'>((resolve) =>
      setTimeout(() => resolve('timeout'), 8000)
    );
    return (await Promise.race([done, timeout])) === 'ok';
  } catch (e) {
    console.warn('[v7.5.56] memberUids write notice for', sharedDocId, e);
    return false;
  }
}

/**
 * [v7.5.56] Recompute a shared wallet's stored balance from its
 * transactions: balance = initialBalance + sum(income) − sum(expense).
 * 'transfer' transactions count as expense (same classification as the
 * Firestore rules). Writes `balance` only when it differs. Returns
 * true on success, false on any failure — and NEVER throws for a
 * missing doc (returns false instead). Callers treat the result as
 * best-effort: a member's recompute is denied by rules (balance is
 * owner-only), so only the owner can actually persist it.
 */
export async function recomputeSharedWalletBalance(sharedDocId: string): Promise<boolean> {
  try {
    if (!sharedDocId) return false;
    const walletRef = doc(db, 'sharedWallets', sharedDocId);
    const snap = await getDoc(walletRef);
    if (!snap.exists()) return false;
    const data = snap.data() as SharedWalletPayload;
    const initial = typeof data.initialBalance === 'number' ? data.initialBalance : 0;
    const txSnap = await getDocs(collection(db, 'sharedWallets', sharedDocId, 'transactions'));
    let income = 0;
    let expense = 0;
    txSnap.forEach((d) => {
      const tx = d.data() as any;
      const amount = typeof tx?.amount === 'number' ? tx.amount : 0;
      if (tx?.type === 'income') income += amount;
      else if (tx?.type === 'expense' || tx?.type === 'transfer') expense += amount;
    });
    const computed = initial + income - expense;
    const current = typeof data.balance === 'number' ? data.balance : 0;
    if (computed === current) return true;
    return await safeSetDoc(
      walletRef,
      cleanForFirestore({ balance: computed, updatedAt: new Date().toISOString() }),
      { merge: true }
    );
  } catch (error) {
    console.warn('[v7.5.56] recomputeSharedWalletBalance failed for', sharedDocId, error);
    return false;
  }
}

/**
 * Publish or update a shared wallet record in the cloud.
 * If sharedWith is empty, removes the shared document.
 */
export async function syncSharedWalletToCloud(
  wallet: Wallet,
  currentUser: { uid: string; email?: string | null; displayName?: string | null },
  transactionsForThisWallet?: Transaction[]
): Promise<boolean> {
  const scopedDocId = getSharedWalletDocId(wallet, currentUser.uid);
  const path = `sharedWallets/${scopedDocId}`;

  try {
    // [v7.5.56] Normalise emails to lowercase BEFORE comparing or
    // storing: sharedWith holds lowercase only — never both cases of
    // the same email (finding 33).
    const selfLower = (currentUser.email || '').trim().toLowerCase();
    const normalizedSharedWith = Array.from(new Set(
      (wallet.sharedWith || [])
        .map((e) => (typeof e === 'string' ? e.trim().toLowerCase() : ''))
        .filter((e) => e.includes('@') && e !== selfLower)
    ));

    if (normalizedSharedWith.length === 0) {
      // [v6.18.0] Before removing, purge refs we previously wrote.
      try {
        const prevRecipients = Array.isArray(wallet.sharedWith) ? wallet.sharedWith : [];
        await deleteRefsForWallet(scopedDocId, prevRecipients);
        if (wallet.id !== scopedDocId) {
          await deleteRefsForWallet(wallet.id, prevRecipients);
        }
      } catch (e) {
        console.warn('[v6.18.0] unshare ref cleanup notice:', e);
      }
      // [v7.5.56] Check the delete results — a failed unshare must
      // not report success.
      const unsharedOk = await safeDeleteDoc(doc(db, 'sharedWallets', scopedDocId));
      let altOk = true;
      if (wallet.id !== scopedDocId) {
        altOk = await safeDeleteDoc(doc(db, 'sharedWallets', wallet.id));
      }
      return unsharedOk && altOk;
    }

    // [v7.5.56] Preserve the existing owner — NEVER overwrite
    // ownerUid/ownerEmail/ownerName with the current user. Only the
    // wallet's creator (no shared doc exists yet) sets the owner
    // fields. A collaborator re-syncing must not become the owner, and
    // must not rewrite the owner's identity. POST-TRANSFER: the old
    // owner's later sync reads this same doc, sees the NEW owner's
    // fields, and preserves them — it can never stamp ownership back.
    // (Belt and braces: after a transfer the old owner is no longer
    // owner/member, so the rules deny their payload write outright and
    // sync returns false; the preservation read is the second layer.)
    let effectiveOwnerUid = currentUser.uid;
    let effectiveOwnerEmail = (currentUser.email || '').trim().toLowerCase();
    let effectiveOwnerName = currentUser.displayName || currentUser.email?.split('@')[0] || 'Owner';
    try {
      const existingSnap = await getDoc(doc(db, 'sharedWallets', scopedDocId));
      if (existingSnap.exists()) {
        const existing = existingSnap.data() as SharedWalletPayload;
        if (existing.ownerUid) {
          effectiveOwnerUid = existing.ownerUid;
          effectiveOwnerEmail = (existing.ownerEmail || '').trim().toLowerCase();
          effectiveOwnerName = existing.ownerName || existing.ownerEmail || 'Owner';
        }
      }
    } catch (e) {
      console.warn('[v7.5.56] owner-preservation read failed; keeping caller as owner:', e);
    }

    const payload: Partial<SharedWalletPayload> = {
      id: wallet.originalId || wallet.id,
      ownerUid: effectiveOwnerUid,
      ownerEmail: effectiveOwnerEmail,
      ownerName: effectiveOwnerName,
      name: wallet.name,
      nameEn: wallet.nameEn || wallet.name,
      type: 'mobile',
      balance: Number(wallet.balance) || 0,
      includeInTotals: wallet.includeInTotals !== false,
      color: wallet.color || '#6366F1',
      icon: wallet.icon || 'Wallet',
      currency: wallet.currency || 'MMK',
      exchangeRate: wallet.exchangeRate || 1,
      sharedWith: normalizedSharedWith,
      collaboratorPermissions: wallet.collaboratorPermissions || {},
      updatedAt: new Date().toISOString(),
    };

    if (wallet.initialBalance !== undefined && !isNaN(Number(wallet.initialBalance))) {
      payload.initialBalance = Number(wallet.initialBalance);
    }
    // [v7.5.56] accountNumber is deliberately NOT copied into the
    // shared payload — members must never see the owner's account number.

    const walletRef = doc(db, 'sharedWallets', scopedDocId);
    const walletWritten = await safeSetDoc(walletRef, cleanForFirestore(payload), { merge: true });
    if (!walletWritten) {
      console.error('[v7.5.56] syncSharedWalletToCloud: shared doc write failed for', scopedDocId);
      return false;
    }

    // [v6.18.0] Mirror this share into per-recipient ref docs so each
    // recipient can discover the wallet without a collection query.
    // [v7.5.56] Refs carry the PRESERVED owner (not the caller) and
    // status 'pending' for new refs (writeSharedWalletRef keeps an
    // existing 'accepted' status untouched).
    try {
      const refPayload = {
        docId: scopedDocId,
        ownerUid: effectiveOwnerUid,
        ownerEmail: effectiveOwnerEmail,
        walletName: wallet.name || '',
        addedAt: Date.now(),
        status: 'pending' as const,
      };
      for (const recipient of normalizedSharedWith) {
        await writeSharedWalletRef(recipient, refPayload);
      }
    } catch (refErr) {
      console.warn('[v6.18.0] shared wallet ref fan-out partial failure:', refErr);
    }

    if (transactionsForThisWallet !== undefined) {
      // [v7.5.56] NEVER delete shared transactions by absence from the
      // caller's local list: the caller's list may be partial (another
      // device/member added transactions since). Deletions happen only
      // via explicit deletion markers / deleteSharedWalletTransaction.
      // Only upsert the transactions the caller actually has.
      if (transactionsForThisWallet.length > 0) {
        const batch = writeBatch(db);
        for (const tx of transactionsForThisWallet) {
          const txRef = doc(db, 'sharedWallets', scopedDocId, 'transactions', tx.id);
          batch.set(txRef, cleanForFirestore(tx), { merge: true });
        }
        // [v6.23.4] CRITICAL write — must NOT silently fail.
        await batch.commit();
      }
    }

    // [v7.5.56] Recompute the shared balance from the stored
    // transactions after every sync (best-effort: a member's recompute
    // is denied by rules — balance is owner-only — so a non-owner's
    // sync can never stamp a stale local balance back onto the doc;
    // the owner reconciles on their next sync). This also covers the
    // post-transfer case: the old owner's later sync cannot overwrite
    // the new owner's balance, because the recompute either derives it
    // from the stored transactions (owner) or fails closed (non-owner).
    await recomputeSharedWalletBalance(scopedDocId).catch(() => false);

    return true;
  } catch (error) {
    console.error('Failed to sync shared wallet to cloud:', error);
    handleFirestoreError(error, OperationType.WRITE, path);
    return false;
  }
}

/**
 * Delete a user's personal wallet doc from cloud
 */
export async function deleteUserWalletFromCloud(
  userId: string,
  walletId: string,
  originalId?: string
): Promise<boolean> {
  try {
    const rawWalletId = walletId.startsWith('shared_') ? walletId.replace(/^shared_[^_]+_/, '') : walletId;

    await safeDeleteDoc(doc(db, 'users', userId, 'wallets', rawWalletId)).catch(() => null);
    if (rawWalletId !== walletId) {
      await safeDeleteDoc(doc(db, 'users', userId, 'wallets', walletId)).catch(() => null);
    }
    if (originalId) {
      await safeDeleteDoc(doc(db, 'users', userId, 'wallets', originalId)).catch(() => null);
    }

    const wColl = collection(db, 'users', userId, 'wallets');
    const wDocs = await getDocs(wColl).catch(() => null);
    if (wDocs && !wDocs.empty) {
      for (const d of wDocs.docs) {
        const dData = d.data();
        if (
          d.id === walletId ||
          d.id === rawWalletId ||
          (originalId && d.id === originalId) ||
          dData.id === walletId ||
          dData.id === rawWalletId ||
          (originalId && dData.id === originalId)
        ) {
          await safeDeleteDoc(d.ref).catch(() => null);
        }
      }
    }
    return true;
  } catch (error) {
    console.error('Failed to delete user wallet doc from cloud:', error);
    return false;
  }
}

/**
 * Delete a shared wallet from cloud when owner deletes it.
 * [v7.5.56] `recipients` is the wallet's sharedWith list captured by
 * the CALLER before it filters the wallet out of local state — this
 * function cannot discover recipients itself (sharedWallets list is
 * denied by rules). Every recipient's ref for the doc is deleted.
 * Returns false if any delete fails (never swallows a failure and
 * reports success). Transaction deletes are chunked at the Firestore
 * 500-write batch limit. The dead second-pass list query
 * (where('ownerUid','==',...) — always denied by rules) is removed.
 */
export async function deleteSharedWalletDoc(
  walletId: string,
  ownerUid?: string,
  sharedDocId?: string,
  originalId?: string,
  recipients?: string[]
): Promise<boolean> {
  let allOk = true;

  // Delete a doc's transactions subcollection in ≤500-doc batches.
  const deleteTxSubcollection = async (docId: string): Promise<boolean> => {
    try {
      if (isQuotaExhausted()) return false;
      const txColl = collection(db, 'sharedWallets', docId, 'transactions');
      const txDocs = await getDocs(txColl);
      if (txDocs.empty) return true;
      const docs = txDocs.docs;
      for (let i = 0; i < docs.length; i += 500) {
        const batch = writeBatch(db);
        for (const tDoc of docs.slice(i, i + 500)) batch.delete(tDoc.ref);
        await batch.commit();
      }
      return true;
    } catch (err) {
      console.warn('[v7.5.56] shared tx subcollection delete failed for', docId, err);
      return false;
    }
  };

  try {
    const candidateIds = new Set<string>();
    if (sharedDocId) candidateIds.add(sharedDocId);
    if (ownerUid) {
      candidateIds.add(`${ownerUid}_${walletId}`);
      if (originalId) candidateIds.add(`${ownerUid}_${originalId}`);
    }
    candidateIds.add(walletId);
    if (originalId) candidateIds.add(originalId);

    if (walletId.startsWith('shared_')) {
      const stripped = walletId.replace(/^shared_[^_]+_/, '');
      candidateIds.add(stripped);
      if (ownerUid) candidateIds.add(`${ownerUid}_${stripped}`);
    }

    const recipientList = Array.isArray(recipients)
      ? recipients.map((e) => (typeof e === 'string' ? e.trim().toLowerCase() : '')).filter((e) => e.includes('@'))
      : [];

    for (const docId of candidateIds) {
      if (!(await deleteTxSubcollection(docId))) allOk = false;
      // [v7.5.56] safeDeleteDoc returns a boolean — check it.
      if (!(await safeDeleteDoc(doc(db, 'sharedWallets', docId)))) allOk = false;
      // Delete ALL recipient refs for this doc.
      for (const recipient of recipientList) {
        if (!(await deleteSharedWalletRef(recipient, docId))) allOk = false;
      }
    }

    return allOk;
  } catch (error) {
    console.error('Failed to delete shared wallet doc:', error);
    handleFirestoreError(error, OperationType.DELETE, `sharedWallets/${walletId}`);
    return false;
  }
}

/**
 * Real-time listener for incoming shared wallets where current user's email is in sharedWith
 */
export function subscribeIncomingSharedWallets(
  userEmail: string,
  currentUid: string,
  onUpdate: (wallets: Wallet[]) => void,
  onError?: (err: any) => void
): Unsubscribe {
  const cleanEmail = (userEmail || '').trim().toLowerCase();
  if (!cleanEmail) {
    onUpdate([]);
    return () => {};
  }

  // [v7.5.56] The old where('sharedWith','array-contains') list query
  // is GONE (it was dead code — constructed but never executed — and
  // sharedWallets list is denied by rules). Refs are the only source.
  void onError;

  // [v6.18.0] Buffers merged from both sources (refs + legacy query).
  // [v7.5.56] Legacy query removed in v7.0.8 — refs are the only
  // source now; legacyWallets stays as an empty buffer for the merge.
  let refWallets: Wallet[] = [];
  let legacyWallets: Wallet[] = [];
  const emit = () => {
    const map = new Map<string, Wallet>();
    for (const w of legacyWallets) {
      const k = w.sharedDocId || w.id;
      if (!map.has(k)) map.set(k, w);
    }
    for (const w of refWallets) {
      const k = w.sharedDocId || w.id;
      if (!map.has(k)) map.set(k, w);
    }
    onUpdate(Array.from(map.values()));
  };

  // [v6.20.0] Live ref subscription — replaces the v6.18 one-shot fetch.
  // New shares now appear without requiring an app reopen.
  const __refDocCache = new Map<string, Wallet>();
  const unsubRefs = subscribeMyRefs(
    cleanEmail,
    async (myRefs) => {
      const { getDoc } = await import('firebase/firestore');
      const { db: _db } = await import('./firebase');
      const activeDocIds = new Set(myRefs.map((r) => r.docId));
      const next: Wallet[] = [];

      // Keep wallets that were just added to a ref but haven't fetched yet
      for (const [id, w] of __refDocCache.entries()) {
        if (!activeDocIds.has(id)) __refDocCache.delete(id);
      }

      for (const r of myRefs) {
        try {
          const snap = await getDoc(doc(_db, 'sharedWallets', r.docId));
          if (!snap.exists()) {
            __refDocCache.delete(r.docId);
            continue;
          }
          const data = snap.data() as SharedWalletPayload;
          if (!data) continue;
          const sharedList: string[] = Array.isArray(data.sharedWith) ? data.sharedWith : [];
          const isMine = (data.ownerUid && data.ownerUid === currentUid)
            || (data.ownerEmail && data.ownerEmail.trim().toLowerCase() === cleanEmail);
          const isSharedToMe = sharedList.some((e) => typeof e === 'string' && e.trim().toLowerCase() === cleanEmail);
          // [v7.5.56] Post-transfer coherence: do NOT skip a doc the
          // viewer now OWNS. The old `if (isMine) continue` dropped
          // exactly the wallet a new owner must discover — their ref
          // still points at the doc, but ownerUid is now theirs, so
          // the listener excluded it and the wallet vanished for them.
          // Owned docs are emitted as OWNED wallets (isSharedFromOther
          // false, local id = the original wallet id) so App's merge
          // keeps them in the owned list; shared docs keep the
          // `shared_` local id as before.
          if (!isMine && !isSharedToMe) continue;

          const cleanDocId = snap.id.replace(/^shared_/, '');
          const rawOriginalId = (data as any).originalId || (data as any).id || cleanDocId;
          const cleanOriginalId = String(rawOriginalId).replace(/^shared_([^_]+_)?/, '');
          const uniqueLocalId = isMine ? cleanOriginalId : `shared_${cleanDocId}`;

          // [v7.5.56] Best-effort memberUids: when this wallet is
          // shared TO me, record my own uid (email → uid) so the
          // owner can resolve my email for ownership transfer. Only
          // written when the entry is missing or wrong; fire-and-
          // forget so the listener never blocks on it. (Not done for
          // owned docs — the owner is not a member needing resolution.)
          if (!isMine && isSharedToMe) {
            const existingUid = (data.memberUids || {})[cleanEmail];
            if (existingUid !== currentUid) {
              void writeOwnMemberUid(snap.id, cleanEmail, currentUid);
            }
          }

          const wallet: Wallet = {
            id: uniqueLocalId,
            originalId: cleanOriginalId,
            sharedDocId: snap.id,
            name: data.name || 'Shared Wallet',
            nameEn: data.nameEn || data.name || 'Shared Wallet',
            balance: Number(data.balance) || 0,
            initialBalance: data.initialBalance !== undefined ? Number(data.initialBalance) : undefined,
            includeInTotals: data.includeInTotals !== false,
            color: data.color || '#6366F1',
            icon: data.icon || 'Wallet',
            currency: data.currency || 'MMK',
            exchangeRate: data.exchangeRate || 1,
            sharedWith: sharedList,
            collaboratorPermissions: data.collaboratorPermissions || {},
            ownerUid: data.ownerUid || '',
            // [v7.5.56] Never fall back to the literal 'Partner' — use
            // the ownerEmail prefix (or the ownerEmail itself) so the
            // wallet is always attributed to a real address.
            ownerEmail: data.ownerEmail || '',
            ownerName: data.ownerName || (data.ownerEmail ? data.ownerEmail.split('@')[0] : data.ownerEmail || ''),
            isSharedFromOther: !isMine,
          };
          __refDocCache.set(snap.id, wallet);
        } catch (err) {
          console.warn('[v6.20.0] ref fetch notice for', r.docId, err);
        }
      }

      refWallets = Array.from(__refDocCache.values());
      emit();
    },
    (err) => {
      console.warn('[v6.20.0] ref subscription error:', err);
    }
  );



  // [v7.0.8] Removed legacy collection-wide query.
  // v6.20.0 disabled sharedWallets.list rule for privacy; refs path
  // (subscribeMyRefs above) is authoritative and already covers all
  // shares (backfilled on boot since v6.19.0). The old onSnapshot was
  // hitting permission-denied on every app start, producing console
  // noise with no functional benefit.
  void legacyWallets;
  const unsubscribe = () => {};

  return () => {
    try { unsubscribe(); } catch {}
    try { (unsubRefs as any)(); } catch {}
  };
}

export function resolveDocId(
  walletId: string,
  sharedDocId?: string,
  ownerUid?: string,
  currentUid?: string
): string {
  if (sharedDocId) return sharedDocId;
  if (walletId.startsWith('shared_')) {
    return walletId.replace(/^shared_/, '');
  }
  const owner = ownerUid || currentUid || '';
  if (owner && !walletId.includes('_')) {
    return `${owner}_${walletId}`;
  }
  return walletId;
}

/**
 * Real-time listener for transactions inside a shared wallet
 */
export function subscribeSharedWalletTransactions(
  walletId: string,
  onUpdate: (txs: Transaction[], deletedTxIds: string[]) => void,
  onError?: (err: any) => void,
  sharedDocId?: string,
  currentUid?: string
): Unsubscribe {
  const docIdToUse = resolveDocId(walletId, sharedDocId, undefined, currentUid);
  const path = `sharedWallets/${docIdToUse}/transactions`;
  const q = collection(db, 'sharedWallets', docIdToUse, 'transactions');

  return onSnapshot(
    q,
    (snapshot) => {
      const txs: Transaction[] = [];
      const deletedTxIds: string[] = [];

      snapshot.docChanges().forEach((change) => {
        if (change.type === 'removed') {
          deletedTxIds.push(change.doc.id);
        }
      });

      snapshot.forEach((d) => {
        const data = { id: d.id, ...d.data() } as Transaction;
        if (data && data.id) {
          txs.push(data);
        }
      });

      onUpdate(txs, deletedTxIds);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
      if (onError) onError(error);
    }
  );
}

/**
 * [v7.5.56] Subscribe to the debts mirror of a shared wallet
 * (sharedWallets/{docId}/debts) — the member-visible copy of debts on
 * that wallet (decision 17). Mirrors subscribeSharedWalletTransactions.
 */
export function subscribeSharedWalletDebts(
  walletId: string,
  onUpdate: (debts: Debt[], deletedDebtIds: string[]) => void,
  onError?: (err: any) => void,
  sharedDocId?: string,
  currentUid?: string
): Unsubscribe {
  const docIdToUse = resolveDocId(walletId, sharedDocId, undefined, currentUid);
  const path = `sharedWallets/${docIdToUse}/debts`;
  const q = collection(db, 'sharedWallets', docIdToUse, 'debts');

  return onSnapshot(
    q,
    (snapshot) => {
      const debts: Debt[] = [];
      const deletedDebtIds: string[] = [];

      snapshot.docChanges().forEach((change) => {
        if (change.type === 'removed') {
          deletedDebtIds.push(change.doc.id);
        }
      });

      snapshot.forEach((d) => {
        const data = { id: d.id, ...d.data() } as Debt;
        if (data && data.id) {
          debts.push(data);
        }
      });

      onUpdate(debts, deletedDebtIds);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
      if (onError) onError(error);
    }
  );
}

/**
 * Save or update a transaction inside a shared wallet and update the shared wallet balance across all related collections
 */
export async function saveSharedWalletTransaction(
  walletId: string,
  tx: Transaction,
  newWalletBalance: number,
  sharedDocId?: string,
  currentUid?: string
): Promise<boolean> {
  const docIdToUse = resolveDocId(walletId, sharedDocId, undefined, currentUid);
  const path = `sharedWallets/${docIdToUse}/transactions/${tx.id}`;
  try {
    // ── CANONICAL WRITE (must succeed) ──────────────────────
    // [v7.2.1] Override tx.walletId with docIdToUse so Firestore rules
    // (which require request.resource.data.walletId == path walletId) pass.
    // Path uses the shared doc ID (owner-prefixed); local walletId omits prefix.
    // [v7.5.56] Do NOT overwrite createdBy/createdByName on edit: the
    // original creator is preserved (another worker stamps them on add).
    let txForShared: Transaction = { ...tx, walletId: docIdToUse };
    try {
      const existingTxSnap = await getDoc(doc(db, 'sharedWallets', docIdToUse, 'transactions', tx.id));
      if (existingTxSnap.exists()) {
        const prev = existingTxSnap.data() as any;
        if (prev?.createdBy !== undefined) txForShared = { ...txForShared, createdBy: prev.createdBy };
        if (prev?.createdByName !== undefined) txForShared = { ...txForShared, createdByName: prev.createdByName };
      }
    } catch {
      // Best-effort preservation only; the write below still decides.
    }
    const txRef = doc(db, 'sharedWallets', docIdToUse, 'transactions', tx.id);
    // [v7.5.56] safeSetDoc returns a boolean — check it, don't assume.
    if (!(await safeSetDoc(txRef, cleanForFirestore(txForShared), { merge: true }))) {
      console.error('[v7.5.56] saveSharedWalletTransaction: canonical write failed for', tx.id);
      return false;
    }

    const ownerUidFromDocId = docIdToUse.includes('_') ? docIdToUse.split('_')[0] : undefined;
    const isOwner = !ownerUidFromDocId || ownerUidFromDocId === currentUid;

    // ── MIRRORS (owner-only) ────────────────────────────────
    // [v6.23.5] Do NOT write to owner's personal collections from a
    // collaborator session — v6.22 rules (canWriteOwnerOnly) forbid it,
    // and the owner reconciles via live shared-tx listener + next sync.
    // Also skip shared-wallet balance mirror for non-owners (rules only
    // permit updatedAt heartbeat for members).
    // [v7.5.56] The shared balance is NOT set from the caller's local
    // newWalletBalance any more — recomputeSharedWalletBalance()
    // derives it from the stored transactions instead.
    if (isOwner && currentUid) {
      const userTxRef = doc(db, 'users', currentUid, 'transactions', tx.id);
      try {
        // [v7.5.56] Check the mirror result (safeSetDoc returns boolean).
        const mirrored = await safeSetDoc(userTxRef, cleanForFirestore({ ...tx, userId: currentUid }), { merge: true });
        if (!mirrored) console.warn('[v7.5.56] owner personal tx mirror failed (queued):', tx.id);
      } catch (mirrorErr) {
        // safeSetDoc internally enqueues to syncQueue on failure.
        console.warn('[v6.23.5] owner personal tx mirror failed (queued):', mirrorErr);
      }

      // [v7.5.56] Recompute the shared balance after the write
      // (best-effort; a member's recompute is denied by rules).
      await recomputeSharedWalletBalance(docIdToUse).catch(() => false);
    } else {
      // Member write: still recompute best-effort (returns false for
      // members under rules; the owner reconciles on next sync).
      await recomputeSharedWalletBalance(docIdToUse).catch(() => false);
    }

    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return false;
  }
}

/**
 * Delete a transaction inside a shared wallet and update the shared wallet balance across all related collections.
 *
 * FIX (v5.3.35): On iOS Safari WebKit the Firestore SDK's deleteDoc() can
 * silently hang without throwing. We issue a direct HTTPS REST DELETE
 * first (idempotent — 404 is treated as success), and fall back to the
 * SDK only if the REST call fails.
 */
export async function deleteSharedWalletTransaction(
  walletId: string,
  txId: string,
  newWalletBalance: number,
  sharedDocId?: string,
  currentUid?: string
): Promise<boolean> {
  const docIdToUse = resolveDocId(walletId, sharedDocId, undefined, currentUid);
  const path = `sharedWallets/${docIdToUse}/transactions/${txId}`;
  try {
    // ── CANONICAL DELETE (must succeed, else return false) ──────
    // [v6.23.5] REST-first, SDK fallback with strict error check.
    let canonicalDeleted = false;
    try {
      const { deleteSharedTransactionDirectHttp } = await import('./directFirestoreHttp');
      const restRes = await deleteSharedTransactionDirectHttp(docIdToUse, txId);
      if (restRes.success) canonicalDeleted = true;
    } catch (restErr) {
      console.warn('[v6.23.5] REST canonical delete threw, trying SDK:', restErr);
    }
    if (!canonicalDeleted) {
      try {
        const txRef = doc(db, 'sharedWallets', docIdToUse, 'transactions', txId);
        // [v6.23.6] safeDeleteDoc returns Promise<boolean> — it does NOT
        // throw on failure. Capture the return value; do not assume success.
        const deleted = await safeDeleteDoc(txRef);
        if (!deleted) {
          console.error('[v6.23.6] canonical shared tx delete returned false (REST + SDK both failed)');
          return false;
        }
        canonicalDeleted = true;
      } catch (sdkErr) {
        console.error('[v6.23.6] canonical shared tx delete threw:', sdkErr);
        return false;
      }
    }

    // ── MIRRORS (owner-only) ────────────────────────────────────
    const ownerUid = docIdToUse.includes('_') ? docIdToUse.split('_')[0] : undefined;
    const isOwner = !ownerUid || ownerUid === currentUid;

    if (isOwner && currentUid) {
      try {
        const { deleteTransactionDirectHttp } = await import('./directFirestoreHttp');
        const restRes = await deleteTransactionDirectHttp(txId, currentUid);
        if (!restRes.success) {
          const userTxRef = doc(db, 'users', currentUid, 'transactions', txId);
          // [v6.23.6] Mirror only — safeDeleteDoc returns boolean.
          // If false, safeDeleteDoc enqueues to syncQueue internally.
          const deleted = await safeDeleteDoc(userTxRef);
          if (!deleted) {
            console.warn('[v6.23.6] user personal mirror delete deferred to queue');
          }
        }
      } catch (e) {
        console.warn('[v6.23.6] user personal delete mirror notice:', e);
      }
    }

    // [v7.5.56] Recompute the shared balance after the delete
    // (best-effort; a member's recompute is denied by rules — the
    // owner reconciles on next sync). The caller's local
    // newWalletBalance is no longer written directly.
    void newWalletBalance;
    await recomputeSharedWalletBalance(docIdToUse).catch(() => false);

    return true;
  } catch (error) {
    console.error('Failed to delete shared wallet transaction:', error);
    handleFirestoreError(error, OperationType.DELETE, path);
    return false;
  }
}

/**
 * Leave a shared wallet (invitee removes themselves from sharedWith and permissions)
 * [v7.5.56] Returns an HONEST boolean: false when the removal write
 * fails (the old code returned true whenever the doc merely existed).
 * Uses safeUpdateDoc (not merge setDoc) so the collaboratorPermissions
 * map is actually replaced — a merge set would deep-merge the map and
 * the leaver's permission entry would survive. The write touches only
 * sharedWith / collaboratorPermissions / updatedAt, which is exactly
 * what the v7.5.56 self-leave rule permits. Also deletes the leaver's
 * ref. The root `collaborators` array is NOT touched — it grants
 * nothing under the new rules (the owner-side prune is another
 * worker's job).
 */
export async function leaveSharedWallet(
  walletId: string,
  userEmail: string,
  sharedDocId?: string,
  ownerUid?: string
): Promise<boolean> {
  try {
    const cleanEmail = userEmail.trim().toLowerCase();

    const candidateIds = new Set<string>();
    if (sharedDocId) candidateIds.add(sharedDocId);
    if (ownerUid) candidateIds.add(`${ownerUid}_${walletId}`);
    candidateIds.add(walletId);
    if (walletId.startsWith('shared_')) {
      const stripped = walletId.replace(/^shared_[^_]+_/, '');
      candidateIds.add(stripped);
      if (ownerUid) candidateIds.add(`${ownerUid}_${stripped}`);
    }

    let found = false;
    let removed = false;
    for (const docId of candidateIds) {
      try {
        const walletRef = doc(db, 'sharedWallets', docId);
        const snap = await getDoc(walletRef);
        if (snap.exists()) {
          found = true;
          const data = snap.data() as SharedWalletPayload;
          const currentSharedWith = data.sharedWith || [];
          const isMember = currentSharedWith.some(
            (e) => typeof e === 'string' && e.trim().toLowerCase() === cleanEmail
          );
          if (!isMember) continue;
          const updatedSharedWith = currentSharedWith.filter(
            (e) => typeof e !== 'string' || e.trim().toLowerCase() !== cleanEmail
          );
          const updatedPerms: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(data.collaboratorPermissions || {})) {
            if (k.trim().toLowerCase() !== cleanEmail) updatedPerms[k] = v;
          }

          // [v7.5.56] Check the result — a failed write must not
          // report success (rules now allow this self-removal write).
          const ok = await safeUpdateDoc(
            walletRef,
            cleanForFirestore({
              sharedWith: updatedSharedWith,
              collaboratorPermissions: updatedPerms,
              updatedAt: new Date().toISOString(),
            })
          );
          if (!ok) {
            console.error('[v7.5.56] leaveSharedWallet: removal write failed for', docId);
            return false;
          }
          removed = true;
          // [v6.18.0] Remove my own ref pointer for this wallet.
          try {
            await deleteSharedWalletRef(cleanEmail, docId);
          } catch (e) {
            console.warn('[v6.18.0] leave ref cleanup notice:', e);
          }
        }
      } catch (err) {
        console.warn('Error trying to leave docId:', docId, err);
        return false;
      }
    }
    return found && removed;
  } catch (error) {
    console.error('Failed to leave shared wallet:', error);
    return false;
  }
}

/**
 * [v6.19.0] Backfill refs for every existing share.
 * Idempotent — safe to call repeatedly. Returns number of refs written.
 * Called once per session from App.tsx after wallets load.
 * [v7.5.56] Never resurrect a wallet someone left: before writing a
 * ref for a recipient, read the shared doc from the cloud and only
 * write the ref if that recipient is CURRENTLY in the doc's
 * sharedWith list. If the get fails or the doc is missing, the wallet
 * is skipped entirely — a stale local sharedWith list must not
 * re-create a ref for someone who already left.
 */
export async function backfillMyRefs(
  wallets: Wallet[],
  currentUid: string,
  currentEmail: string
): Promise<number> {
  if (!currentUid || !currentEmail) return 0;
  const emailLower = currentEmail.trim().toLowerCase();
  let count = 0;
  for (const w of wallets) {
    if (!w || w.isSharedFromOther) continue;
    if (!w.sharedWith || w.sharedWith.length === 0) continue;
    const docId = getSharedWalletDocId(w, currentUid);
    // Verify against the cloud doc — the authoritative membership list.
    let cloudSharedWith: string[];
    try {
      const snap = await getDoc(doc(db, 'sharedWallets', docId));
      if (!snap.exists()) continue;
      const data = snap.data() as SharedWalletPayload;
      if (!Array.isArray(data.sharedWith)) continue;
      cloudSharedWith = data.sharedWith
        .map((e) => (typeof e === 'string' ? e.trim().toLowerCase() : ''))
        .filter((e) => e.includes('@'));
    } catch (e) {
      // Get failed — do NOT backfill from stale local data.
      console.warn('[v7.5.56] backfill skipped (shared doc read failed) for', docId, e);
      continue;
    }
    const recipients = cloudSharedWith.filter((e) => e !== emailLower);
    if (recipients.length === 0) continue;
    for (const r of recipients) {
      try {
        const okWrite = await writeSharedWalletRef(r, {
          docId,
          ownerUid: currentUid,
          ownerEmail: emailLower,
          walletName: w.name || '',
          addedAt: Date.now(),
          status: 'pending',
        });
        if (okWrite) count++;
      } catch (e) {
        console.warn('[v6.19.0] backfill notice for', r, docId, e);
      }
    }
  }
  return count;
}

/**
 * [v7.5.56] Accept a shared-wallet invite: flip my own ref for this
 * shared doc to status 'accepted'. The rules allow the invitee to
 * update ONLY the status of their own ref. Returns false when there
 * is no signed-in user/email or the write fails.
 */
export async function acceptSharedWalletInvite(sharedDocId: string): Promise<boolean> {
  try {
    const email = (auth.currentUser?.email || '').trim().toLowerCase();
    const uid = auth.currentUser?.uid || '';
    if (!email || !sharedDocId) return false;
    const refOk = await safeSetDoc(
      doc(db, 'sharedWalletRefs', email, 'wallets', sharedDocId),
      cleanForFirestore({ status: 'accepted' }),
      { merge: true }
    );
    if (!refOk) return false;
    // [v7.5.56] Best-effort: record my own uid in memberUids so the
    // owner can later resolve my email → uid for ownership transfer.
    // Failure here must not fail the accept.
    if (uid) await writeOwnMemberUid(sharedDocId, email, uid);
    return true;
  } catch (error) {
    console.warn('[v7.5.56] acceptSharedWalletInvite failed for', sharedDocId, error);
    return false;
  }
}

/**
 * [v7.5.56] Decline a shared-wallet invite: delete my own ref for
 * this shared doc, then best-effort leave the wallet itself (remove
 * my email from sharedWith) so the owner no longer lists me. The
 * leave is best-effort — a failed leave does not flip the decline
 * result, but a failed ref delete does (the invite would still show).
 */
export async function declineSharedWalletInvite(sharedDocId: string): Promise<boolean> {
  try {
    const email = (auth.currentUser?.email || '').trim().toLowerCase();
    if (!email || !sharedDocId) return false;
    const refDeleted = await safeDeleteDoc(doc(db, 'sharedWalletRefs', email, 'wallets', sharedDocId));
    if (!refDeleted) return false;
    try {
      await leaveSharedWallet(sharedDocId, email, sharedDocId);
    } catch (e) {
      console.warn('[v7.5.56] decline leave best-effort failed for', sharedDocId, e);
    }
    return true;
  } catch (error) {
    console.warn('[v7.5.56] declineSharedWalletInvite failed for', sharedDocId, error);
    return false;
  }
}