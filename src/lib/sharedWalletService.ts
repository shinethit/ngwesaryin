import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  Unsubscribe,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, cleanForFirestore, safeSetDoc, safeDeleteDoc, isQuotaExhausted } from './firebase';
import { Wallet, Transaction } from '../types';

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
  accountNumber?: string;
  sharedWith: string[];
  collaboratorPermissions?: Record<string, import('../types').WalletPermissions>;
  updatedAt: string;
}

/**
 * Helper to get the canonical shared document ID in Firestore.
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
    const rawList = wallet.sharedWith || [];
    const normalizedSet = new Set<string>();
    
    rawList.forEach((e) => {
      const trimmed = e.trim();
      if (trimmed && trimmed.includes('@') && trimmed.toLowerCase() !== currentUser.email?.toLowerCase()) {
        normalizedSet.add(trimmed.toLowerCase());
        normalizedSet.add(trimmed); // Keep original casing as well for case-insensitive token matching
      }
    });

    const normalizedSharedWith = Array.from(normalizedSet);

    // If no one is shared with, remove the shared record if it exists
    if (normalizedSharedWith.length === 0) {
      await safeDeleteDoc(doc(db, 'sharedWallets', scopedDocId)).catch(() => null);
      if (wallet.id !== scopedDocId) {
        await safeDeleteDoc(doc(db, 'sharedWallets', wallet.id)).catch(() => null);
      }
      return true;
    }

    const payload: Partial<SharedWalletPayload> = {
      id: wallet.originalId || wallet.id,
      ownerUid: currentUser.uid,
      ownerEmail: (currentUser.email || '').trim().toLowerCase(),
      ownerName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Owner',
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
    if (wallet.accountNumber !== undefined && wallet.accountNumber.trim()) {
      payload.accountNumber = wallet.accountNumber.trim();
    }

    // Save to the scoped document ID with sanitized payload
    const walletRef = doc(db, 'sharedWallets', scopedDocId);
    await safeSetDoc(walletRef, cleanForFirestore(payload), { merge: true });

    // Sync transactions belonging to this wallet so collaborator has them immediately
    if (transactionsForThisWallet !== undefined) {
      try {
        const existingTxSnap = await getDocs(collection(db, 'sharedWallets', scopedDocId, 'transactions')).catch(() => null);
        const currentTxIds = new Set((transactionsForThisWallet || []).map((t) => t.id));
        if (existingTxSnap && !existingTxSnap.empty) {
          for (const d of existingTxSnap.docs) {
            if (!currentTxIds.has(d.id)) {
              await safeDeleteDoc(d.ref).catch(() => null);
            }
          }
        }
      } catch (e) {
        console.warn('Could not prune shared transactions:', e);
      }

      if (transactionsForThisWallet.length > 0) {
        const batch = writeBatch(db);
        for (const tx of transactionsForThisWallet) {
          const txRef = doc(db, 'sharedWallets', scopedDocId, 'transactions', tx.id);
          batch.set(txRef, cleanForFirestore(tx), { merge: true });
        }
        await batch.commit().catch(() => null);
      }
    }

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
    
    // Explicit doc deletions
    await safeDeleteDoc(doc(db, 'users', userId, 'wallets', rawWalletId)).catch(() => null);
    if (rawWalletId !== walletId) {
      await safeDeleteDoc(doc(db, 'users', userId, 'wallets', walletId)).catch(() => null);
    }
    if (originalId) {
      await safeDeleteDoc(doc(db, 'users', userId, 'wallets', originalId)).catch(() => null);
    }

    // Also scan users/{userId}/wallets to purge any doc whose data().id or doc.id matches
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
 * Delete a shared wallet from cloud when owner deletes it
 */
export async function deleteSharedWalletDoc(
  walletId: string,
  ownerUid?: string,
  sharedDocId?: string,
  originalId?: string
): Promise<boolean> {
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

    for (const docId of candidateIds) {
      try {
        // First delete transactions in subcollection if accessible
        if (!isQuotaExhausted()) {
          const txColl = collection(db, 'sharedWallets', docId, 'transactions');
          const txDocs = await getDocs(txColl).catch(() => null);
          if (txDocs && !txDocs.empty) {
            const batch = writeBatch(db);
            txDocs.forEach((tDoc) => {
              batch.delete(tDoc.ref);
            });
            await batch.commit().catch(() => null);
          }
        }

        // Delete parent sharedWallet doc
        await safeDeleteDoc(doc(db, 'sharedWallets', docId)).catch(() => null);
      } catch (err) {
        // Continue cleaning other candidates
      }
    }

    // Query-based cleanup: find any sharedWallets where ownerUid == ownerUid and matches this wallet
    if (ownerUid) {
      try {
        const q = query(collection(db, 'sharedWallets'), where('ownerUid', '==', ownerUid));
        const snap = await getDocs(q).catch(() => null);
        if (snap && !snap.empty) {
          for (const sDoc of snap.docs) {
            const data = sDoc.data() as SharedWalletPayload;
            const matches =
              sDoc.id === walletId ||
              sDoc.id === sharedDocId ||
              sDoc.id === `${ownerUid}_${walletId}` ||
              data.id === walletId ||
              (originalId && data.id === originalId) ||
              (walletId.startsWith('shared_') && data.id === walletId.replace(/^shared_[^_]+_/, ''));

            if (matches) {
              if (!isQuotaExhausted()) {
                const txColl = collection(db, 'sharedWallets', sDoc.id, 'transactions');
                const txDocs = await getDocs(txColl).catch(() => null);
                if (txDocs && !txDocs.empty) {
                  const batch = writeBatch(db);
                  txDocs.forEach((tDoc) => batch.delete(tDoc.ref));
                  await batch.commit().catch(() => null);
                }
              }
              await safeDeleteDoc(sDoc.ref).catch(() => null);
            }
          }
        }
      } catch (e) {
        console.warn('Error during query-based shared wallet cleanup:', e);
      }
    }

    return true;
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

  // Real-time listener on the top-level sharedWallets collection filtered by array-contains to protect read quota
  const q = query(
    collection(db, 'sharedWallets'),
    where('sharedWith', 'array-contains', cleanEmail)
  );

  const unsubscribe = onSnapshot(
    q,
    (snap) => {
      const incomingWallets: Wallet[] = [];

      snap.docs.forEach((d) => {
        const data = d.data() as SharedWalletPayload;
        if (!data) return;

        // Skip wallets that belong to the current user
        const isMine =
          (data.ownerUid && data.ownerUid === currentUid) ||
          (data.ownerEmail && data.ownerEmail.trim().toLowerCase() === cleanEmail);

        if (isMine) return;

        // Check if this wallet is shared with the current user
        const sharedList: string[] = Array.isArray(data.sharedWith) ? data.sharedWith : [];
        const isSharedToMe = sharedList.some(
          (e) => typeof e === 'string' && e.trim().toLowerCase() === cleanEmail
        );

        if (isSharedToMe) {
          // Canonical local ID strictly derived from the top-level sharedWallets doc ID
          const cleanDocId = d.id.replace(/^shared_/, '');
          const uniqueLocalId = `shared_${cleanDocId}`;
          const rawOriginalId = data.originalId || data.id || cleanDocId;
          const cleanOriginalId = String(rawOriginalId).replace(/^shared_([^_]+_)?/, '');

          incomingWallets.push({
            id: uniqueLocalId,
            originalId: cleanOriginalId,
            sharedDocId: d.id,
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
            ownerEmail: data.ownerEmail || 'Partner',
            ownerName: data.ownerName || data.ownerEmail?.split('@')[0] || 'Partner',
            isSharedFromOther: true,
          });
        }
      });

      // Deduplicate incoming wallets by sharedDocId / uniqueLocalId
      const dedupedMap = new Map<string, Wallet>();
      incomingWallets.forEach((w) => {
        const key = w.sharedDocId || w.id;
        if (!dedupedMap.has(key)) {
          dedupedMap.set(key, w);
        }
      });

      onUpdate(Array.from(dedupedMap.values()));
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'sharedWallets');
      if (onError) onError(error);
    }
  );

  return unsubscribe;
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
    // 1. Write to canonical sharedWallets subcollection FIRST to ensure immediate propagation
    const txRef = doc(db, 'sharedWallets', docIdToUse, 'transactions', tx.id);
    await safeSetDoc(txRef, cleanForFirestore(tx), { merge: true });

    // 2. Also write to user's personal transactions collection so pullDataFromCloud finds it immediately
    if (currentUid) {
      const userTxRef = doc(db, 'users', currentUid, 'transactions', tx.id);
      await safeSetDoc(userTxRef, cleanForFirestore({ ...tx, userId: currentUid }), { merge: true }).catch(() => null);
    }

    // 3. Update parent shared wallet document balance (strictly matching security rules affectedKeys)
    const walletRef = doc(db, 'sharedWallets', docIdToUse);
    await safeSetDoc(
      walletRef,
      cleanForFirestore({
        balance: newWalletBalance,
        updatedAt: new Date().toISOString(),
      }),
      { merge: true }
    ).catch((err) => console.warn('Shared wallet parent balance update notice:', err));

    // 4. If ownerUid is embedded in docIdToUse (e.g. ownerUid_rawWalletId) and differs from currentUid, also update owner's personal collection
    if (docIdToUse.includes('_')) {
      const ownerUid = docIdToUse.split('_')[0];
      if (ownerUid && ownerUid !== currentUid) {
        const ownerTxRef = doc(db, 'users', ownerUid, 'transactions', tx.id);
        await safeSetDoc(ownerTxRef, cleanForFirestore({ ...tx, userId: ownerUid }), { merge: true }).catch(() => null);
        
        const rawWalletId = docIdToUse.replace(`${ownerUid}_`, '');
        const ownerWalletRef = doc(db, 'users', ownerUid, 'wallets', rawWalletId);
        await safeSetDoc(ownerWalletRef, cleanForFirestore({ balance: newWalletBalance, updatedAt: new Date().toISOString() }), { merge: true }).catch(() => null);
      }
    }

    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return false;
  }
}

/**
 * Delete a transaction inside a shared wallet and update the shared wallet balance across all related collections
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
    // 1. Delete from canonical sharedWallets subcollection
    const txRef = doc(db, 'sharedWallets', docIdToUse, 'transactions', txId);
    await safeDeleteDoc(txRef).catch(() => null);

    // Update shared wallet balance
    const walletRef = doc(db, 'sharedWallets', docIdToUse);
    await safeSetDoc(walletRef, cleanForFirestore({ balance: newWalletBalance, updatedAt: new Date().toISOString() }), { merge: true }).catch(() => null);

    // 2. Delete from current user's personal collection
    if (currentUid) {
      const userTxRef = doc(db, 'users', currentUid, 'transactions', txId);
      await safeDeleteDoc(userTxRef).catch(() => null);
    }

    // 3. Delete from owner's personal collection if docIdToUse is scoped by ownerUid
    if (docIdToUse.includes('_')) {
      const ownerUid = docIdToUse.split('_')[0];
      if (ownerUid && ownerUid !== currentUid) {
        const ownerTxRef = doc(db, 'users', ownerUid, 'transactions', txId);
        await safeDeleteDoc(ownerTxRef).catch(() => null);

        const rawWalletId = docIdToUse.replace(`${ownerUid}_`, '');
        const ownerWalletRef = doc(db, 'users', ownerUid, 'wallets', rawWalletId);
        await safeSetDoc(ownerWalletRef, cleanForFirestore({ balance: newWalletBalance, updatedAt: new Date().toISOString() }), { merge: true }).catch(() => null);
      }
    }

    return true;
  } catch (error) {
    console.error('Failed to delete shared wallet transaction:', error);
    handleFirestoreError(error, OperationType.DELETE, path);
    return false;
  }
}

/**
 * Leave a shared wallet (invitee removes themselves from sharedWith and permissions)
 */
export async function leaveSharedWallet(
  walletId: string,
  userEmail: string,
  sharedDocId?: string,
  ownerUid?: string
): Promise<boolean> {
  try {
    const cleanEmail = userEmail.trim().toLowerCase();
    const rawEmail = userEmail.trim();

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
    for (const docId of candidateIds) {
      try {
        const walletRef = doc(db, 'sharedWallets', docId);
        const snap = await getDoc(walletRef);
        if (snap.exists()) {
          const data = snap.data() as SharedWalletPayload;
          const currentSharedWith = data.sharedWith || [];
          const updatedSharedWith = currentSharedWith.filter(
            (e) => e.trim().toLowerCase() !== cleanEmail && e.trim() !== rawEmail
          );
          const updatedPerms = { ...(data.collaboratorPermissions || {}) };
          delete updatedPerms[cleanEmail];
          delete updatedPerms[rawEmail];

          // Collaborators must not deleteDoc (rules only allow owner to delete).
          // Simply update sharedWith to exclude this collaborator.
          await safeSetDoc(
            walletRef,
            cleanForFirestore({
              sharedWith: updatedSharedWith,
              collaboratorPermissions: updatedPerms,
              updatedAt: new Date().toISOString(),
            }),
            { merge: true }
          );
          found = true;
        }
      } catch (err) {
        console.warn('Error trying to leave docId:', docId, err);
      }
    }
    return found;
  } catch (error) {
    console.error('Failed to leave shared wallet:', error);
    return false;
  }
}
