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
 * [v7.5.56] "Full" preset default — all-true.
 * Used ONLY as the preset applied when the owner shares a wallet with a
 * new collaborator (ShareWalletModal / useWalletHandlers): a new invitee
 * starts with full access. This is NOT a fallback: every fallback in
 * getCollaboratorPermissions() below returns READ_ONLY_PERMISSIONS
 * (all-false) so an unmatched collaborator, a missing email, or a null
 * wallet can never silently gain full access.
 */
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
 *
 * [v7.5.56] All fallbacks now DENY to match Firestore rules, and they
 * return READ_ONLY_PERMISSIONS (all-false) — NOT DEFAULT_WALLET_PERMISSIONS,
 * which is the all-true "Full" preset for new invitees only:
 *   - Owner → OWNER_PERMISSIONS (full)
 *   - Collaborator with explicit entry → entry, missing sub-key = false
 *   - Collaborator without entry → READ_ONLY_PERMISSIONS (deny)
 *   - Null wallet / no email → READ_ONLY_PERMISSIONS (deny)
 */
export function getCollaboratorPermissions(
  wallet: Wallet | null | undefined,
  userEmail: string | null | undefined,
  currentUid?: string | null
): WalletPermissions {
  // [v7.5.56] No wallet context → deny via READ_ONLY (never DEFAULT,
  // which is the all-true "Full" preset for new invitees).
  if (!wallet) return READ_ONLY_PERMISSIONS;

  // Owner short-circuit — only place that gets full perms
  const isOwner =
    !wallet.isSharedFromOther ||
    (wallet.ownerUid && currentUid && wallet.ownerUid === currentUid);

  if (isOwner) {
    return OWNER_PERMISSIONS;
  }

  // [v7.5.56] No email on a shared wallet → deny via READ_ONLY.
  if (!userEmail) return READ_ONLY_PERMISSIONS;

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

  // [v7.5.56] Unmatched collaborator → deny via READ_ONLY (never DEFAULT).
  return READ_ONLY_PERMISSIONS;
}