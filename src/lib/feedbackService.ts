import {
  collection,
  doc,
  onSnapshot,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, safeSetDoc, safeUpdateDoc, safeDeleteDoc } from './firebase';
import { Feedback, FeedbackCategory, PlanType } from '../types';
import { safeGetItem, safeSetItem } from '../utils/storage';

const FEEDBACKS_STORAGE_KEY = 'ngwe_feedbacks_cache';

/**
 * Real-time listener for public feedbacks & comments
 */
export function subscribeFeedbacks(
  onUpdate: (feedbacks: Feedback[]) => void
): () => void {
  const path = 'feedbacks';
  try {
    const q = query(collection(db, path), orderBy('createdAt', 'desc'), limit(100));

    return onSnapshot(
      q,
      (snapshot) => {
        const list: Feedback[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Feedback, 'id'>),
        }));

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
 * Submit a new Review / Feedback
 */
export async function submitFeedback(data: {
  userId?: string;
  userName: string;
  userEmail?: string;
  userPlan?: PlanType;
  rating: number;
  category: FeedbackCategory;
  comment: string;
}): Promise<Feedback> {
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
  await safeSetDoc(docRef, feedback);

  // Update Local Cache
  try {
    const cached = safeGetItem(FEEDBACKS_STORAGE_KEY);
    const existing: Feedback[] = cached ? JSON.parse(cached) : [];
    const updated = [feedback, ...existing.filter((f) => f.id !== newId)];
    safeSetItem(FEEDBACKS_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Ignore cache error
  }

  return feedback;
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
