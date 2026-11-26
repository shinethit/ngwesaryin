import {
  collection,
  doc,
  onSnapshot,
  query,
  orderBy,
  limit,
  where,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, safeSetDoc, safeUpdateDoc, safeDeleteDoc } from './firebase';
import { Feedback, FeedbackCategory, PlanType } from '../types';
import { safeGetItem, safeSetItem } from '../utils/storage';

const FEEDBACKS_STORAGE_KEY = 'ngwe_feedbacks_cache';

/**
 * Real-time listener for public feedbacks & comments.
 *
 * [v7.6.56] The query MUST be constrained to a branch the
 * firestore.rules list rule can prove, or Firestore denies the
 * whole list: 'all' reads only public feedbacks
 * (where isPublic == true), 'mine' reads only the caller's own
 * (where userId == uid), admins read unconstrained. Sorting is
 * client-side for the constrained queries — an equality filter
 * plus orderBy on another field needs a composite index that may
 * not exist, and a missing index fails the whole list.
 */
export function subscribeFeedbacks(
  onUpdate: (feedbacks: Feedback[]) => void,
  opts?: { scope?: 'all' | 'mine'; userId?: string; isAdmin?: boolean }
): () => void {
  const path = 'feedbacks';
  try {
    const scope = opts?.scope ?? 'all';
    const constrained = !opts?.isAdmin && !(scope === 'mine' && !opts?.userId);
    const q =
      opts?.isAdmin
        ? query(collection(db, path), orderBy('createdAt', 'desc'), limit(100))
        : scope === 'mine' && opts?.userId
          ? query(collection(db, path), where('userId', '==', opts.userId), limit(100))
          : query(collection(db, path), where('isPublic', '==', true), limit(100));

    return onSnapshot(
      q,
      (snapshot) => {
        const list: Feedback[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Feedback, 'id'>),
        }));
        // Newest first — the constrained queries carry no orderBy
        // (see above); the admin query already arrives ordered and
        // sorting it again is a no-op.
        if (constrained) {
          list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        }

        // Cache to local storage
        safeSetItem(FEEDBACKS_STORAGE_KEY, JSON.stringify(list));
        onUpdate(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, path);
        // Fallback to cache
        fallbackToLocalCache(onUpdate);
      }
    );
  } catch (e) {
    console.warn('Error connecting to Firestore feedbacks listener, using cache:', e);
    fallbackToLocalCache(onUpdate);
    return () => {};
  }
}

function fallbackToLocalCache(onUpdate: (feedbacks: Feedback[]) => void) {
  try {
    const cached = safeGetItem(FEEDBACKS_STORAGE_KEY);
    if (cached) {
      onUpdate(JSON.parse(cached));
    } else {
      onUpdate([]);
    }
  } catch {
    onUpdate([]);
  }
}

/**
 * Submit a new Review / Feedback. Returns true only when the write
 * actually landed: [v7.6.56] the old code ignored safeSetDoc's
 * return value, so a denied write (e.g. a guest, whom the rules
 * refuse) still fired the confetti and cached the feedback as if
 * it had been sent. The caller shows the failure and keeps the
 * text for retry.
 */
export async function submitFeedback(data: {
  userId?: string;
  userName: string;
  userEmail?: string;
  userPlan?: PlanType;
  rating: number;
  category: FeedbackCategory;
  comment: string;
}): Promise<boolean> {
  const newId = `fb_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const feedback: Feedback = {
    id: newId,
    userId: data.userId || undefined,
    userName: data.userName.trim() || 'Anonymous User',
    userEmail: data.userEmail?.trim() || undefined,
    userPlan: data.userPlan || 'free',
    rating: data.rating,
    category: data.category,
    comment: data.comment.trim(),
    status: 'pending',
    isPublic: true,
    createdAt: Date.now(),
  };

  // Save to Firestore
  const docRef = doc(db, 'feedbacks', newId);
  const ok = await safeSetDoc(docRef, feedback);
  if (!ok) return false;

  // Update Local Cache
  try {
    const cached = safeGetItem(FEEDBACKS_STORAGE_KEY);
    const existing: Feedback[] = cached ? JSON.parse(cached) : [];
    const updated = [feedback, ...existing.filter((f) => f.id !== newId)];
    safeSetItem(FEEDBACKS_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Ignore cache error
  }

  return true;
}

/**
 * Admin Reply to a Feedback
 */
export async function replyToFeedback(
  feedbackId: string,
  adminReply: string,
  status: 'reviewed' | 'resolved' = 'reviewed'
): Promise<void> {
  const updates = {
    adminReply: adminReply.trim(),
    adminRepliedAt: new Date().toISOString(),
    status,
  };

  const docRef = doc(db, 'feedbacks', feedbackId);
  await safeUpdateDoc(docRef, updates);
}

/**
 * Delete a Feedback (Admin or Creator)
 */
export async function deleteFeedback(feedbackId: string): Promise<void> {
  const docRef = doc(db, 'feedbacks', feedbackId);
  await safeDeleteDoc(docRef);
}
