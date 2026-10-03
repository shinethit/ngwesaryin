import { Wallet, WalletPermissions } from '../types';

export const DEFAULT_WALLET_PERMISSIONS: WalletPermissions = {
  canAddIncome: true,
  canEditIncome: true,
  canDeleteIncome: true,
  canAddExpense: true,
  canEditExpense: true,
  canDeleteExpense: true,
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
 * If user is the owner (or not in a shared context), full permissions are granted.
 * If user is a collaborator, looks up their customized permissions in `wallet.collaboratorPermissions`.
 */
export function getCollaboratorPermissions(
  wallet: Wallet | null | undefined,
  userEmail: string | null | undefined,
  currentUid?: string | null
): WalletPermissions {
  if (!wallet) return DEFAULT_WALLET_PERMISSIONS;

  // If the wallet belongs to the current user (owner), full permissions
  const isOwner =
    !wallet.isSharedFromOther ||
    (wallet.ownerUid && currentUid && wallet.ownerUid === currentUid);

  if (isOwner) {
    return DEFAULT_WALLET_PERMISSIONS;
  }

  if (!userEmail) return DEFAULT_WALLET_PERMISSIONS;

  const targetEmail = userEmail.trim().toLowerCase();
  const permsMap = wallet.collaboratorPermissions;

  if (permsMap && typeof permsMap === 'object') {
    // Check direct key match (case-insensitive)
    for (const key of Object.keys(permsMap)) {
      if (key.trim().toLowerCase() === targetEmail) {
        const p = permsMap[key];
        return {
          canAddIncome: p.canAddIncome ?? true,
          canEditIncome: p.canEditIncome ?? true,
          canDeleteIncome: p.canDeleteIncome ?? true,
          canAddExpense: p.canAddExpense ?? true,
          canEditExpense: p.canEditExpense ?? true,
          canDeleteExpense: p.canDeleteExpense ?? true,
        };
      }
    }
  }

  // Default permissions if not yet customized
  return DEFAULT_WALLET_PERMISSIONS;
}

/**
 * Check if an action on an income or expense transaction is permitted for the current user.
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

  return true;
}
