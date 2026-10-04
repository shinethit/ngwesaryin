import { auth, isQuotaExhausted } from './firebase';
import { Transaction } from '../types';
import firebaseConfig from '@/firebase-applet-config.json';

const PROJECT_ID = firebaseConfig.projectId || 'ngwesaryin';
const DATABASE_ID = firebaseConfig.firestoreDatabaseId || '(default)';

/**
 * Converts a JS object/Transaction into Firestore REST API fields format
 */
function toFirestoreRestValue(val: any): any {
  if (val === null || val === undefined) {
    return { nullValue: null };
  }
  if (typeof val === 'boolean') {
    return { booleanValue: val };
  }
  if (typeof val === 'number') {
    if (isNaN(val) || !isFinite(val)) {
      return { nullValue: null };
    }
    if (Number.isInteger(val)) {
      return { integerValue: String(val) };
    }
    return { doubleValue: val };
  }
  if (typeof val === 'string') {
    return { stringValue: val };
  }
  if (val instanceof Date) {
    return { timestampValue: val.toISOString() };
  }
  if (Array.isArray(val)) {
    return {
      arrayValue: {
        values: val.filter((item) => item !== undefined).map(toFirestoreRestValue),
      },
    };
  }
  if (typeof val === 'object') {
    const fields: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      if (v !== undefined) {
        fields[k] = toFirestoreRestValue(v);
      }
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

/**
 * Converts a Firestore REST API field back into a plain JS value
 */
function fromFirestoreRestValue(val: any): any {
  if (!val || typeof val !== 'object') return val;
  if ('nullValue' in val) return null;
  if ('booleanValue' in val) return val.booleanValue;
  if ('integerValue' in val) return Number(val.integerValue);
  if ('doubleValue' in val) return Number(val.doubleValue);
  if ('stringValue' in val) return val.stringValue;
  if ('timestampValue' in val) return val.timestampValue;
  if ('arrayValue' in val) {
    return (val.arrayValue?.values || []).map(fromFirestoreRestValue);
  }
  if ('mapValue' in val) {
    const obj: Record<string, any> = {};
    const fields = val.mapValue?.fields || {};
    for (const [k, v] of Object.entries(fields)) {
      obj[k] = fromFirestoreRestValue(v);
    }
    return obj;
  }
  return val;
}

/**
 * Encodes a Firestore field path segment for use in REST updateMask URLs.
 */
function encodeFieldPath(key: string): string {
  if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
    return encodeURIComponent(key);
  }
  return encodeURIComponent(`\`${key}\``);
}

/**
 * Directly writes all transactions to Firestore over HTTPS REST API.
 * 100% immune to iOS Safari WebKit IndexedDB lockups or SDK long polling pauses.
 */
export async function pushTransactionsDirectHttp(
  transactions: Transaction[],
  uid: string
): Promise<{
  success: boolean;
  pushedCount: number;
  succeededIds: string[];
  quotaExceeded: boolean;
  error?: string;
}> {
  if (!auth.currentUser || !uid) {
    return { success: false, pushedCount: 0, succeededIds: [], quotaExceeded: false, error: 'User not signed in' };
  }

  if (isQuotaExhausted()) {
    return { success: false, pushedCount: 0, succeededIds: [], quotaExceeded: true, error: 'Quota exhausted' };
  }

  const validTransactions = transactions.filter((t) => t && t.id);
  if (validTransactions.length === 0) {
    return { success: true, pushedCount: 0, succeededIds: [], quotaExceeded: false };
  }

  try {
    let idToken = '';
    try {
      idToken = await auth.currentUser.getIdToken(false);
    } catch {
      idToken = await auth.currentUser.getIdToken(true);
    }

    const baseUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents/users/${uid}/transactions`;
    const succeededIds: string[] = [];
    let quotaExceeded = false;
    let lastFailureReason = '';

    const BATCH_SIZE = 5;
    for (let i = 0; i < validTransactions.length; i += BATCH_SIZE) {
      if (quotaExceeded) break;

      const slice = validTransactions.slice(i, i + BATCH_SIZE);
      await Promise.all(
        slice.map(async (tx) => {
          if (quotaExceeded) return;
          const fields: Record<string, any> = {};
          const txWithUser = { ...tx, userId: uid };
          const updateMasks: string[] = [];

          for (const [k, v] of Object.entries(txWithUser)) {
            if (v !== undefined) {
              fields[k] = toFirestoreRestValue(v);
              updateMasks.push(`updateMask.fieldPaths=${encodeFieldPath(k)}`);
            }
          }

          const docUrl = `${baseUrl}/${encodeURIComponent(tx.id)}?${updateMasks.join('&')}`;

          const controller = new AbortController();
          const timeoutTimer = setTimeout(() => controller.abort(), 12000);

          try {
            const response = await fetch(docUrl, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${idToken}`,
              },
              body: JSON.stringify({ fields }),
              signal: controller.signal,
            });
            clearTimeout(timeoutTimer);

            if (response.ok) {
              succeededIds.push(tx.id);
            } else {
              const errText = await response.text().catch(() => '');
              let reason = '';
              if (response.status === 429 || errText.includes('Quota') || errText.includes('RESOURCE_EXHAUSTED')) {
                quotaExceeded = true;
                reason = `Google Cloud Firestore Write Quota Exceeded (HTTP 429)`;
                try {
                  localStorage.setItem('ngwe_quota_write_exhausted', String(Date.now()));
                  const { forceWritesExhausted } = await import('./quotaTracker');
                  forceWritesExhausted();
                } catch {}
              } else if (response.status === 403) {
                reason = `Permission Denied (HTTP 403)`;
              } else {
                reason = `REST HTTP ${response.status}: ${errText.slice(0, 160)}`;
              }
              lastFailureReason = reason;
            }
          } catch (fetchErr: any) {
            clearTimeout(timeoutTimer);
            lastFailureReason = fetchErr?.message || String(fetchErr);
          }
        })
      );
    }

    const pushedCount = succeededIds.length;
    const success = pushedCount === validTransactions.length && !quotaExceeded;

    return { success, pushedCount, succeededIds, quotaExceeded, error: lastFailureReason || undefined };
  } catch (err: any) {
    return { success: false, pushedCount: 0, succeededIds: [], quotaExceeded: false, error: err?.message || String(err) };
  }
}

/**
 * Directly pulls all transactions from Firestore over HTTPS REST API.
 * Bypasses local client cache completely.
 */
export async function pullTransactionsDirectHttp(
  uid: string
): Promise<{ success: boolean; transactions: Transaction[]; error?: string }> {
  if (!auth.currentUser || !uid) {
    return { success: false, transactions: [], error: 'User not signed in' };
  }

  try {
    const idToken = await auth.currentUser.getIdToken(false);
    const allDocs: any[] = [];
    let nextPageToken: string | undefined = undefined;

    do {
      let url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents/users/${uid}/transactions?pageSize=300`;
      if (nextPageToken) {
        url += `&pageToken=${encodeURIComponent(nextPageToken)}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (!response.ok) {
        return { success: false, transactions: [], error: `HTTP ${response.status}` };
      }

      const json = await response.json();
      if (json.documents && Array.isArray(json.documents)) {
        allDocs.push(...json.documents);
      }
      nextPageToken = json.nextPageToken;
    } while (nextPageToken);

    const transactions: Transaction[] = allDocs.map((docSnap: any) => {
      const rawFields = docSnap.fields || {};
      const t: Record<string, any> = {};
      for (const [k, v] of Object.entries(rawFields)) {
        t[k] = fromFirestoreRestValue(v);
      }
      const nameParts = (docSnap.name || '').split('/');
      const id = nameParts[nameParts.length - 1] || t.id;
      return { ...t, id } as Transaction;
    });

    return { success: true, transactions };
  } catch (err: any) {
    return { success: false, transactions: [], error: err?.message || String(err) };
  }
}

/**
 * Directly DELETE a transaction from Firestore via HTTPS REST API.
 * Bypasses Firestore SDK entirely — immune to iOS Safari WebKit
 * deleteDoc() silent hangs. 404 is treated as idempotent success.
 */
export async function deleteTransactionDirectHttp(
  txId: string,
  uid: string
): Promise<{ success: boolean; error?: string }> {
  if (!auth.currentUser || !uid || !txId) {
    return { success: false, error: 'Invalid params' };
  }

  try {
    let idToken = '';
    try {
      idToken = await auth.currentUser.getIdToken(false);
    } catch {
      idToken = await auth.currentUser.getIdToken(true);
    }

    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents/users/${uid}/transactions/${encodeURIComponent(txId)}`;

    const controller = new AbortController();
    const timeoutTimer = setTimeout(() => controller.abort(), 12000);

    const response = await fetch(url, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${idToken}` },
      signal: controller.signal,
    });
    clearTimeout(timeoutTimer);

    if (response.ok || response.status === 404) {
      return { success: true };
    }

    const errText = await response.text().catch(() => '');
    return { success: false, error: `HTTP ${response.status}: ${errText.slice(0, 200)}` };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * Directly DELETE a transaction from a shared wallet's subcollection via REST.
 * 404 is treated as idempotent success.
 */
export async function deleteSharedTransactionDirectHttp(
  sharedDocId: string,
  txId: string
): Promise<{ success: boolean; error?: string }> {
  if (!auth.currentUser || !sharedDocId || !txId) {
    return { success: false, error: 'Invalid params' };
  }

  try {
    let idToken = '';
    try {
      idToken = await auth.currentUser.getIdToken(false);
    } catch {
      idToken = await auth.currentUser.getIdToken(true);
    }

    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents/sharedWallets/${encodeURIComponent(sharedDocId)}/transactions/${encodeURIComponent(txId)}`;

    const controller = new AbortController();
    const timeoutTimer = setTimeout(() => controller.abort(), 12000);

    const response = await fetch(url, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${idToken}` },
      signal: controller.signal,
    });
    clearTimeout(timeoutTimer);

    if (response.ok || response.status === 404) {
      return { success: true };
    }

    const errText = await response.text().catch(() => '');
    return { success: false, error: `HTTP ${response.status}: ${errText.slice(0, 200)}` };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}