/**
 * [v7.5.64 B-12] Admin audit trail — one doc per admin action in the
 * `adminAuditLog` collection. Append-only by Firestore rules: admins
 * may create + read, nobody may update or delete.
 *
 * Best-effort by design: a failed log write never throws and never
 * blocks the admin action it records. The admin does the action;
 * the log is a record, not a gate.
 */
import { collection, doc, onSnapshot, orderBy, query, limit } from 'firebase/firestore';
import { db, safeSetDoc } from './firebase';

export interface AdminAuditLogEntry {
  id: string;
  actorUid: string;
  actorEmail: string;
  action: string;
  targetUid?: string;
  targetEmail?: string;
  detail?: string;
  result: 'success' | 'failed' | 'blocked';
  createdAt: number;
}

export type AdminAuditAction =
  | 'grant_premium'
  | 'revoke_code'
  | 'delete_code'
  | 'delete_account'
  | 'purge_user'
  | 'purge_category'
  | 'generate_codes'
  | 'delete_broadcast'
  | 'save_contact_info';

export async function logAdminAction(
  actor: { uid?: string; email?: string | null } | null,
  action: AdminAuditAction,
  opts?: {
    targetUid?: string;
    targetEmail?: string;
    detail?: string;
    result?: 'success' | 'failed' | 'blocked';
  }
): Promise<void> {
  try {
    const ref = doc(collection(db, 'adminAuditLog'));
    await safeSetDoc(ref, {
      actorUid: actor?.uid || '',
      actorEmail: actor?.email || '',
      action,
      targetUid: opts?.targetUid || '',
      targetEmail: opts?.targetEmail || '',
      detail: opts?.detail || '',
      result: opts?.result || 'success',
      createdAt: Date.now(),
    });
  } catch (err) {
    // Best-effort only — the admin action must never fail because the log did.
    console.warn('[adminAuditLog] log write failed (ignored):', err);
  }
}

/**
 * Live listener for the Admin Panel audit view: latest 50 entries,
 * newest first. On error the caller gets onError instead of an empty
 * list that would look like "no admin actions ever happened".
 */
export function subscribeAdminAuditLog(
  onUpdate: (entries: AdminAuditLogEntry[]) => void,
  onError?: (err: unknown) => void
): () => void {
  try {
    const q = query(collection(db, 'adminAuditLog'), orderBy('createdAt', 'desc'), limit(50));
    return onSnapshot(
      q,
      (snapshot) => {
        onUpdate(
          snapshot.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<AdminAuditLogEntry, 'id'>),
          }))
        );
      },
      (err) => {
        console.warn('Error subscribing to admin audit log:', err);
        if (onError) onError(err);
      }
    );
  } catch (err) {
    if (onError) onError(err);
    return () => {};
  }
}
