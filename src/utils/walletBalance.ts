import { Wallet, Transaction, Debt } from '../types';

/**
 * Checks whether a transaction is an internal transfer between wallets.
 */
export function isTransferTransaction(tx: Transaction | Partial<Transaction> | undefined | null): boolean {
  if (!tx) return false;
  // Explicit false override
  if (tx.isTransfer === false) return false;

  // Explicit true flag
  if (tx.isTransfer === true) return true;

  // Check category (cat_transfer or transfer)
  if (typeof tx.category === 'string' && (tx.category === 'cat_transfer' || tx.category === 'transfer')) return true;

  // Check transaction ID prefix
  if (typeof tx.id === 'string' && (tx.id.startsWith('tx_tf_') || tx.id.startsWith('tf_'))) return true;

  // Check explicit note transfer tags
  if (typeof tx.note === 'string') {
    const n = tx.note.toLowerCase();
    if (
      tx.note.includes('[ငွေလွှဲ]') ||
      tx.note.includes('[ငွေလွှဲဝင်]') ||
      tx.note.includes('[ငွေလွှဲထွက်]') ||
      n.includes('[transfer]') ||
      n.includes('[transfer in]') ||
      n.includes('[transfer out]')
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Checks if a given wallet matches a target wallet ID, handling:
 * - Exact matches (wallet.id === targetId)
 * - Original ID matches (wallet.originalId === targetId)
 * - Shared Firestore doc ID matches (wallet.sharedDocId === targetId)
 * - Prefixed shared IDs: e.g. "shared_<uid>_<id>" vs "<id>"
 * - Name matching fallback
 */
/**
 * Checks if a given wallet matches a target wallet ID or name.
 */
export function isWalletMatch(wallet: Wallet, targetWalletId: string | undefined | null): boolean {
  if (!wallet || !targetWalletId) return false;
  const target = targetWalletId.trim();
  if (!target) return false;

  if (wallet.id === target) return true;
  if (wallet.originalId && wallet.originalId === target) return true;
  if (wallet.sharedDocId && wallet.sharedDocId === target) return true;

  // Case-insensitive name comparisons
  const cleanTarget = target.toLowerCase();
  const wName = (wallet.name || '').trim().toLowerCase();
  const wNameEn = (wallet.nameEn || '').trim().toLowerCase();

  if (wName && wName === cleanTarget) return true;
  if (wNameEn && wNameEn === cleanTarget) return true;

  // Safe fuzzy name matching ONLY if cleanTarget is a human name string (NOT an ID or GUID)
  const isTargetAnId = cleanTarget.includes('_') || cleanTarget.startsWith('wallet') || cleanTarget.startsWith('tx') || /\d{4,}/.test(cleanTarget);
  if (!isTargetAnId) {
    if (wName && wName.length >= 3 && cleanTarget.length >= 3) {
      if (wName === cleanTarget || (cleanTarget.length > 5 && wName.includes(cleanTarget))) return true;
    }
    if (wNameEn && wNameEn.length >= 3 && cleanTarget.length >= 3) {
      if (wNameEn === cleanTarget || (cleanTarget.length > 5 && wNameEn.includes(cleanTarget))) return true;
    }
  }

  // If target starts with shared_
  if (target.startsWith('shared_')) {
    const rawTarget = target.replace(/^shared_[^_]+_/, '');
    if (
      wallet.id === rawTarget ||
      (wallet.originalId && wallet.originalId === rawTarget) ||
      (wallet.sharedDocId && wallet.sharedDocId === rawTarget)
    ) {
      return true;
    }
    const strippedOnce = target.replace(/^shared_/, '');
    if (wallet.id === strippedOnce || wallet.sharedDocId === strippedOnce) {
      return true;
    }
  }

  // If wallet.id starts with shared_
  if (wallet.id.startsWith('shared_')) {
    const rawWalletId = wallet.id.replace(/^shared_[^_]+_/, '');
    if (target === rawWalletId || (wallet.originalId && target === wallet.originalId)) {
      return true;
    }
    const strippedOnce = wallet.id.replace(/^shared_/, '');
    if (target === strippedOnce) {
      return true;
    }
  }

  // If wallet.sharedDocId contains target (e.g. "<uid>_<walletId>")
  if (wallet.sharedDocId && (wallet.sharedDocId.endsWith(`_${target}`) || wallet.sharedDocId === target)) {
    return true;
  }

  // If target contains wallet.id or wallet.originalId (e.g. "<uid>_<walletId>")
  if (wallet.id && (target.endsWith(`_${wallet.id}`) || target === `shared_${wallet.id}`)) {
    return true;
  }
  if (wallet.originalId && (target.endsWith(`_${wallet.originalId}`) || target === `shared_${wallet.originalId}`)) {
    return true;
  }

  return false;
}

/**
 * Builds a comprehensive lookup map that maps all possible alias IDs for each wallet
 * (w.id, w.originalId, w.sharedDocId, stripped IDs, names) to the Wallet instance.
 */
export function buildWalletMap(wallets: Wallet[]): Map<string, Wallet> {
  const map = new Map<string, Wallet>();
  wallets.forEach((w) => {
    map.set(w.id, w);
    if (w.name) {
      map.set(w.name, w);
      map.set(w.name.trim().toLowerCase(), w);
    }
    if (w.nameEn) {
      map.set(w.nameEn, w);
      map.set(w.nameEn.trim().toLowerCase(), w);
    }
    if (w.originalId) map.set(w.originalId, w);
    if (w.sharedDocId) {
      map.set(w.sharedDocId, w);
      map.set(`shared_${w.sharedDocId}`, w);
      if (w.sharedDocId.includes('_')) {
        const parts = w.sharedDocId.split('_');
        if (parts.length >= 2) {
          const docRawId = parts.slice(1).join('_');
          map.set(docRawId, w);
        }
      }
    }
    if (w.ownerUid && w.id) {
      map.set(`${w.ownerUid}_${w.id}`, w);
      map.set(`shared_${w.ownerUid}_${w.id}`, w);
    }
    if (w.id.startsWith('shared_')) {
      const stripped = w.id.replace(/^shared_[^_]+_/, '');
      map.set(stripped, w);
      map.set(w.id.replace(/^shared_/, ''), w);
    }
  });
  return map;
}

/**
 * Intelligently resolves the target wallet for a transaction based on:
 * 1. Direct wallet ID / alias match
 * 2. Transfer-in logic (destination wallet is the non-sender wallet)
 * 3. Transfer-out logic (source wallet is the non-recipient wallet)
 * 4. Default fallback wallet
 */
export function resolveTransactionWallet(
  txWalletId: string | undefined | null,
  wallets: Wallet[],
  walletMap?: Map<string, Wallet>,
  tx?: Partial<Transaction>
): Wallet | undefined {
  if (wallets.length === 0) return undefined;
  const map = walletMap || buildWalletMap(wallets);

  // 1. ALWAYS prioritize direct valid txWalletId matching FIRST
  if (txWalletId) {
    if (map.has(txWalletId)) return map.get(txWalletId);
    const directMatch = wallets.find((w) => isWalletMatch(w, txWalletId));
    if (directMatch) return directMatch;
  }

  const note = tx?.note || '';
  const isTransfer = tx ? isTransferTransaction(tx) : false;

  // 2. Fallback transfer note parsing only if txWalletId is missing or invalid
  if (isTransfer && (tx?.transferType === 'transfer_in' || tx?.type === 'income' || note.includes('[ငွေလွှဲဝင်]'))) {
    let senderWallet: Wallet | undefined = undefined;
    for (const w of wallets) {
      if ((w.name && note.includes(w.name)) || (w.nameEn && note.includes(w.nameEn))) {
        senderWallet = w;
        break;
      }
    }
    if (!senderWallet) {
      const senderMatch = note.match(/⬅\s*([^\s(]+)/);
      if (senderMatch) {
        senderWallet = wallets.find((w) => isWalletMatch(w, senderMatch[1]));
      }
    }
    const recipientWallet = wallets.find((w) => !senderWallet || w.id !== senderWallet.id) || wallets[1] || wallets[0];
    return recipientWallet;
  }

  if (isTransfer && (tx?.transferType === 'transfer_out' || tx?.type === 'expense' || note.includes('[ငွေလွှဲထွက်]'))) {
    let targetWallet: Wallet | undefined = undefined;
    for (const w of wallets) {
      if ((w.name && note.includes(w.name)) || (w.nameEn && note.includes(w.nameEn))) {
        targetWallet = w;
        break;
      }
    }
    if (!targetWallet) {
      const targetMatch = note.match(/➔\s*([^\s(]+)/);
      if (targetMatch) {
        targetWallet = wallets.find((w) => isWalletMatch(w, targetMatch[1]));
      }
    }
    const senderWallet = wallets.find((w) => !targetWallet || w.id !== targetWallet.id) || wallets[0];
    return senderWallet;
  }

  // 3. Fallback to default or first wallet
  return wallets.find((w) => w.isDefault) || wallets[0];
}

/**
 * Repairs any orphaned or mismatched wallet IDs on all transactions.
 */
export function repairOrphanedTransactions(
  transactions: Transaction[],
  wallets: Wallet[]
): { repaired: Transaction[]; hasChanges: boolean } {
  if (wallets.length === 0 || transactions.length === 0) {
    return { repaired: transactions, hasChanges: false };
  }

  let hasChanges = false;
  const walletMap = buildWalletMap(wallets);

  const repaired = transactions.map((t) => {
    let updatedTx = { ...t };
    const isTransfer = isTransferTransaction(t);

    if (isTransfer) {
      if (t.isTransfer !== true) {
        updatedTx.isTransfer = true;
        hasChanges = true;
      }
      if (!t.transferType) {
        if (t.type === 'income' || (t.note && t.note.includes('[ငွေလွှဲဝင်]'))) {
          updatedTx.transferType = 'transfer_in';
          hasChanges = true;
        } else if (t.type === 'expense' || (t.note && t.note.includes('[ငွေလွှဲထွက်]'))) {
          updatedTx.transferType = 'transfer_out';
          hasChanges = true;
        }
      }
    } else {
      if (t.isTransfer !== false) {
        updatedTx.isTransfer = false;
        hasChanges = true;
      }
      if (t.transferType !== undefined) {
        delete updatedTx.transferType;
        hasChanges = true;
      }
      if (t.transferToWalletId !== undefined) {
        delete updatedTx.transferToWalletId;
        hasChanges = true;
      }
    }

    // Only assign a fallback wallet if t.walletId is completely missing or blank
    if (!t.walletId || t.walletId.trim() === '') {
      const resolvedWallet = resolveTransactionWallet(t.walletId, wallets, walletMap, t);
      if (resolvedWallet) {
        updatedTx.walletId = resolvedWallet.id;
        hasChanges = true;
      }
    }

    return updatedTx;
  });

  return { repaired, hasChanges };
}

/**
 * Returns a Set containing all possible alias IDs for the provided wallets.
 */
export function getMatchingWalletIds(wallets: Wallet[]): Set<string> {
  const ids = new Set<string>();
  wallets.forEach((w) => {
    ids.add(w.id);
    if (w.originalId) ids.add(w.originalId);
    if (w.sharedDocId) {
      ids.add(w.sharedDocId);
      ids.add(`shared_${w.sharedDocId}`);
      if (w.sharedDocId.includes('_')) {
        const parts = w.sharedDocId.split('_');
        if (parts.length >= 2) {
          ids.add(parts.slice(1).join('_'));
        }
      }
    }
    if (w.ownerUid && w.id) {
      ids.add(`${w.ownerUid}_${w.id}`);
      ids.add(`shared_${w.ownerUid}_${w.id}`);
    }
    if (w.id.startsWith('shared_')) {
      ids.add(w.id.replace(/^shared_[^_]+_/, ''));
      ids.add(w.id.replace(/^shared_/, ''));
    }
  });
  return ids;
}

/**
 * Computes the real-time balance for a given wallet by factoring in:
 * 1. The wallet's initial starting balance (initialBalance, if defined, or base balance)
 * 2. Income transactions assigned to this wallet (+)
 * 3. Expense transactions assigned to this wallet (-)
 * 4. Transfer in / out movements
 * 5. Standalone unlinked debts/repayments (avoiding double-counting automated transaction records)
 */
export function calculateWalletLiveBalance(
  wallet: Wallet,
  transactions: Transaction[] = [],
  _debts: Debt[] = [],
  _allWallets?: Wallet[]
): number {
  // 1. Initial Opening Balance Base
  let openingBalance = 0;
  if (wallet.initialBalance !== undefined && !isNaN(Number(wallet.initialBalance))) {
    openingBalance = Number(wallet.initialBalance);
  } else if (wallet.id === 'cash') {
    openingBalance = 0;
  } else {
    // For legacy wallets without explicit initialBalance:
    // If transactions already exist for this wallet, assume openingBalance is 0 unless specified,
    // to prevent double-counting existing balance with transactions.
    const hasTxs = transactions && transactions.some((t) => isWalletMatch(wallet, t.walletId));
    openingBalance = hasTxs ? 0 : (Number(wallet.balance) || 0);
  }

  // 2. Transactions strictly matched to this specific wallet (သူ့ Wallet နဲ့သူ)
  const txTotal = (transactions || []).reduce((sum, t) => {
    const amt = Number(t.amount) || 0;
    const isTransfer = isTransferTransaction(t);

    if (isTransfer) {
      if (isWalletMatch(wallet, t.walletId)) {
        if (t.transferType === 'transfer_in' || t.type === 'income') return sum + amt;
        if (t.transferType === 'transfer_out' || t.type === 'expense') return sum - amt;
      } else if (t.transferToWalletId && isWalletMatch(wallet, t.transferToWalletId)) {
        if (t.transferType === 'transfer_out' || t.type === 'expense') return sum + amt;
        if (t.transferType === 'transfer_in' || t.type === 'income') return sum - amt;
      }
      return sum;
    }

    // Direct match: Only transactions assigned to this wallet affect its balance
    if (isWalletMatch(wallet, t.walletId)) {
      return sum + (t.type === 'income' ? amt : -amt);
    }

    return sum;
  }, 0);

  return openingBalance + txTotal;
}

/**
 * Returns a new list of wallets where each wallet's balance is dynamically synchronized with all transaction records.
 */
export function syncWalletsWithTransactions(
  wallets: Wallet[],
  transactions: Transaction[],
  debts: Debt[] = []
): Wallet[] {
  return wallets.map((w) => {
    const liveBalance = calculateWalletLiveBalance(w, transactions, debts, wallets);
    const initial =
      w.initialBalance !== undefined && !isNaN(Number(w.initialBalance))
        ? Number(w.initialBalance)
        : w.id === 'cash'
        ? 0
        : (transactions.some((t) => isWalletMatch(w, t.walletId)) ? 0 : (Number(w.balance) || 0));

    if (w.balance !== liveBalance || w.initialBalance !== initial) {
      return { ...w, initialBalance: initial, balance: liveBalance };
    }
    return w;
  });
}

