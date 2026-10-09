import { Wallet, WalletPermissions } from '../types';

/**
 * [v6.23.3] Owner permissions — full access.
 * Used ONLY when the current user is the wallet owner.
 */
export const OWNER_PERMISSIONS: WalletPermissions = {
  canAddIncome: true,
  canEditIncome: true,
  canDeleteIncome: true,
  canAddExpense: true,
  canEditExpense: true,
  canDeleteExpense: true,
};

/**
 * [v6.23.3] Deny-by-default — matches Firestore rules.
 * Used for: unmatched collaborator, missing email, null wallet,
 * or any fallback where we cannot verify the user's permission.
 *
 * Kept the name DEFAULT_WALLET_PERMISSIONS for backwards compat,
 * but its value is now all-false (was all-true before v6.23.3).
 */
export const DEFAULT_WALLET_PERMISSIONS: WalletPermissions = {
  canAddIncome: false,
  canEditIncome: false,
  canDeleteIncome: false,
  canAddExpense: false,
  canEditExpense: false,
  canDeleteExpense: false,
};

export const READ_ONLY_PERMISSIONS: WalletPermissions = {
  canAddIncome: false,
  canEditIncome: false,
  canDeleteIncome: false,
  canAddExpense: false,
  canEditExpense: false,
  canDeleteExpense: false,
};

export const ADD_ONLY_PERMISSIONS: WalletPermissions = {
  canAddIncome: true,
  canEditIncome: false,
  canDeleteIncome: false,
  canAddExpense: true,
  canEditExpense: false,
  canDeleteExpense: false,
};

/**
 * Resolves permissions for a given user email on a specific wallet.
 *
 * [v6.23.3] All fallbacks now DENY to match Firestore rules:
 *   - Owner → OWNER_PERMISSIONS (full)
 *   - Collaborator with explicit entry → entry, missing sub-key = false
 *   - Collaborator without entry → DEFAULT_WALLET_PERMISSIONS (deny)
 *   - Null wallet / no email → DEFAULT_WALLET_PERMISSIONS (deny)
 */
export function getCollaboratorPermissions(
  wallet: Wallet | null | undefined,
  userEmail: string | null | undefined,
  currentUid?: string | null
): WalletPermissions {
  // [v6.23.3] No wallet context → deny (was: full)
  if (!wallet) return DEFAULT_WALLET_PERMISSIONS;

  // Owner short-circuit — only place that gets full perms
  const isOwner =
    !wallet.isSharedFromOther ||
    (wallet.ownerUid && currentUid && wallet.ownerUid === currentUid);

  if (isOwner) {
    return OWNER_PERMISSIONS;
  }

  // [v6.23.3] No email on a shared wallet → deny (was: full)
  if (!userEmail) return DEFAULT_WALLET_PERMISSIONS;

  const targetEmail = userEmail.trim().toLowerCase();
  const permsMap = wallet.collaboratorPermissions;

  if (permsMap && typeof permsMap === 'object') {
    for (const key of Object.keys(permsMap)) {
      if (key.trim().toLowerCase() === targetEmail) {
        const p = permsMap[key];
        // [v6.23.3] Missing sub-key → false (matches rules .get(..., false))
        return {
          canAddIncome: p.canAddIncome === true,
          canEditIncome: p.canEditIncome === true,
          canDeleteIncome: p.canDeleteIncome === true,
          canAddExpense: p.canAddExpense === true,
          canEditExpense: p.canEditExpense === true,
          canDeleteExpense: p.canDeleteExpense === true,
        };
      }
    }
  }

  // [v6.23.3] Unmatched collaborator → deny (was: full)
  return DEFAULT_WALLET_PERMISSIONS;
}

/**
 * Check if an action on an income or expense transaction is permitted
 * for the current user. Matches Firestore rules exactly.
 */
export function canPerformTransactionAction(
  action: 'add' | 'edit' | 'delete',
  txType: 'income' | 'expense',
  wallet: Wallet | null | undefined,
  userEmail: string | null | undefined,
  currentUid?: string | null
): boolean {
  const perms = getCollaboratorPermissions(wallet, userEmail, currentUid);

  if (action === 'add') {
    return txType === 'income' ? perms.canAddIncome : perms.canAddExpense;
  }
  if (action === 'edit') {
    return txType === 'income' ? perms.canEditIncome : perms.canEditExpense;
  }
  if (action === 'delete') {
    return txType === 'income' ? perms.canDeleteIncome : perms.canDeleteExpense;
  }

  return false;  // [v6.23.3] was: true (unknown action → deny)
}
