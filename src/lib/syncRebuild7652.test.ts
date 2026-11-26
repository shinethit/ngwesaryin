/**
 * v7.6.52 — sync-mechanism rebuild: two-client harness.
 *
 * The Firestore SDK and the REST transport are faked against one
 * in-memory server map, so these tests prove the pipeline (queue +
 * transport + tombstones + safe* wrappers) converges, survives a
 * restart, dead-letters visibly, and never resurrects a deleted
 * record — without any network or emulator. What they do NOT prove
 * (real devices, real iOS WebKit, signed-in Firestore, rules
 * emulator) is listed honestly in the version report.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';

// ---------------------------------------------------------------- fake server
const h = vi.hoisted(() => {
  const server = new Map<string, any>();
  const behavior = {
    sdkSetDoc: 'ok' as 'ok' | 'hang' | 'throw-permission' | 'throw-network' | 'throw-auth',
    sdkDeleteDoc: 'ok' as 'ok' | 'hang' | 'throw-permission' | 'throw-network' | 'throw-auth',
    restPatch: 'ok' as 'ok' | '403' | '429' | 'network-error',
    restDelete: 'ok' as 'ok' | '403' | '404' | 'network-error',
    // [v7.6.56] When true, getIdToken throws auth/network-request-failed
    // (the user's 12:08 log: the token endpoint itself was blocked).
    tokenFail: false,
  };
  const calls = { sdkSetDoc: 0, sdkDeleteDoc: 0, restPatch: 0, restDelete: 0 };
  const fakeUser = {
    uid: 'user_1',
    email: 'test@example.com',
    getIdToken: async () => {
      if (h.behavior.tokenFail) {
        const e: any = new Error('auth/network-request-failed');
        e.code = 'auth/network-request-failed';
        throw e;
      }
      return 'fake-token';
    },
  };
  const fakeAuth = { currentUser: fakeUser as any };
  return { server, behavior, calls, fakeUser, fakeAuth };
});

function resetBehavior() {
  h.behavior.sdkSetDoc = 'ok';
  h.behavior.sdkDeleteDoc = 'ok';
  h.behavior.restPatch = 'ok';
  h.behavior.restDelete = 'ok';
  h.behavior.tokenFail = false;
  h.calls.sdkSetDoc = 0;
  h.calls.sdkDeleteDoc = 0;
  h.calls.restPatch = 0;
  h.calls.restDelete = 0;
}

function pathOf(...args: any[]): string {
  const parts: string[] = [];
  for (const a of args) {
    if (typeof a === 'string') parts.push(a);
    else if (a && typeof a.path === 'string') parts.push(a.path);
  }
  return parts.join('/');
}

function docSnap(path: string) {
  return {
    id: path.split('/').pop(),
    exists: () => h.server.has(path),
    data: () => h.server.get(path),
    metadata: { hasPendingWrites: false },
  };
}

function collectionSnap(colPath: string, fromCache: boolean) {
  const docs = Array.from(h.server.entries())
    .filter(([p]) => p.startsWith(colPath + '/') && !p.slice(colPath.length + 1).includes('/'))
    .map(([p]) => docSnap(p));
  return {
    docs,
    empty: docs.length === 0,
    size: docs.length,
    metadata: { fromCache },
    forEach: (cb: (d: any) => void) => docs.forEach(cb),
  };
}

function permError(): any {
  const e: any = new Error('Missing or insufficient permissions.');
  e.code = 'permission-denied';
  return e;
}

function authError(): any {
  const e: any = new Error('auth/network-request-failed');
  e.code = 'auth/network-request-failed';
  return e;
}

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({})),
  getApps: vi.fn(() => []),
  getApp: vi.fn(() => ({})),
}));

vi.mock('firebase/auth', () => ({
  getAuth: () => h.fakeAuth,
  GoogleAuthProvider: class {
    setCustomParameters() {}
    addScope() {}
  },
  onAuthStateChanged: vi.fn(() => () => {}),
  signInWithPopup: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  updateProfile: vi.fn(),
  signOut: vi.fn(),
  deleteUser: vi.fn(),
  reauthenticateWithCredential: vi.fn(),
  reauthenticateWithPopup: vi.fn(),
  EmailAuthProvider: class {},
  sendPasswordResetEmail: vi.fn(),
  getRedirectResult: vi.fn(),
}));

vi.mock('firebase/firestore', () => {
  const setDoc = vi.fn(async (ref: any, data: any) => {
    h.calls.sdkSetDoc++;
    const mode = h.behavior.sdkSetDoc;
    if (mode === 'hang') return new Promise(() => {});
    if (mode === 'throw-permission') throw permError();
    if (mode === 'throw-network') throw new Error('Network timed out');
    if (mode === 'throw-auth') throw authError();
    h.server.set(ref.path, { ...(h.server.get(ref.path) || {}), ...data });
  });
  const deleteDoc = vi.fn(async (ref: any) => {
    h.calls.sdkDeleteDoc++;
    const mode = h.behavior.sdkDeleteDoc;
    if (mode === 'hang') return new Promise(() => {});
    if (mode === 'throw-permission') throw permError();
    if (mode === 'throw-network') throw new Error('Network timed out');
    if (mode === 'throw-auth') throw authError();
    h.server.delete(ref.path);
  });
  const updateDoc = vi.fn(async (ref: any, data: any) => {
    h.server.set(ref.path, { ...(h.server.get(ref.path) || {}), ...data });
  });
  const writeBatch = vi.fn(() => {
    const ops: Array<() => void> = [];
    return {
      set: (ref: any, data: any) => {
        ops.push(() => h.server.set(ref.path, { ...(h.server.get(ref.path) || {}), ...data }));
      },
      delete: (ref: any) => {
        ops.push(() => h.server.delete(ref.path));
      },
      update: (ref: any, data: any) => {
        ops.push(() => h.server.set(ref.path, { ...(h.server.get(ref.path) || {}), ...data }));
      },
      commit: async () => {
        ops.forEach((op) => op());
      },
    };
  });
  return {
    initializeFirestore: vi.fn(() => ({})),
    getFirestore: vi.fn(() => ({})),
    persistentLocalCache: vi.fn(() => ({})),
    persistentMultipleTabManager: vi.fn(() => ({})),
    persistentSingleTabManager: vi.fn(() => ({})),
    enableNetwork: vi.fn(async () => {}),
    disableNetwork: vi.fn(async () => {}),
    collection: vi.fn((...args: any[]) => ({ path: pathOf(...args), id: pathOf(...args).split('/').pop() })),
    doc: vi.fn((...args: any[]) => {
      const path = pathOf(...args);
      return { path, id: path.split('/').pop() };
    }),
    setDoc,
    deleteDoc,
    updateDoc,
    getDoc: vi.fn(async (ref: any) => docSnap(ref.path)),
    getDocs: vi.fn(async (ref: any) => collectionSnap(ref.path, true)),
    getDocFromServer: vi.fn(async (ref: any) => docSnap(ref.path)),
    getDocsFromServer: vi.fn(async (ref: any) => collectionSnap(ref.path, false)),
    onSnapshot: vi.fn(() => () => {}),
    query: vi.fn((ref: any) => ref),
    where: vi.fn((...a: any[]) => a[0]),
    orderBy: vi.fn((...a: any[]) => a[0]),
    limit: vi.fn((...a: any[]) => a[0]),
    writeBatch,
    runTransaction: vi.fn(async (_db: any, fn: any) => fn({})),
    serverTimestamp: () => ({ _methodName: 'serverTimestamp' }),
    deleteField: () => ({ _methodName: 'deleteField' }),
    waitForPendingWrites: vi.fn(async () => {}),
    collectionGroup: vi.fn((...args: any[]) => ({ path: pathOf(...args) })),
    documentId: vi.fn(() => '__name__'),
    increment: (n: number) => ({ _methodName: 'increment', n }),
    arrayUnion: (...v: any[]) => ({ _methodName: 'arrayUnion', v }),
    arrayRemove: (...v: any[]) => ({ _methodName: 'arrayRemove', v }),
  };
});

vi.mock('@/firebase-applet-config.json', () => ({
  default: {
    apiKey: 'test-key',
    authDomain: 'test.firebaseapp.com',
    projectId: 'test-project',
    storageBucket: 'test.appspot.com',
    messagingSenderId: '1',
    appId: '1:1:web:test',
  },
}));

// ------------------------------------------------------------ REST transport
function fromRestValue(v: any): any {
  if (v == null || typeof v !== 'object') return v;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('nullValue' in v) return null;
  if ('timestampValue' in v) return v.timestampValue;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(fromRestValue);
  if ('mapValue' in v) {
    return Object.fromEntries(
      Object.entries(v.mapValue.fields || {}).map(([k, val]) => [k, fromRestValue(val)])
    );
  }
  return v;
}

function resp(status: number, bodyText: string) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => ({}),
    text: async () => bodyText,
  };
}

async function fakeFetch(url: string, opts: any = {}) {
  const method = String(opts.method || 'GET').toUpperCase();
  const idx = url.indexOf('/documents/');
  const restPath = decodeURIComponent(url.slice(idx + '/documents/'.length).split('?')[0]);
  if (method === 'PATCH') {
    h.calls.restPatch++;
    if (h.behavior.restPatch === 'network-error') throw new Error('Network timed out');
    if (h.behavior.restPatch === '403') return resp(403, 'PERMISSION_DENIED');
    if (h.behavior.restPatch === '429') return resp(429, 'RESOURCE_EXHAUSTED');
    const body = JSON.parse(opts.body || '{}');
    const data: any = {};
    for (const [k, v] of Object.entries(body.fields || {})) data[k] = fromRestValue(v);
    h.server.set(restPath, { ...(h.server.get(restPath) || {}), ...data });
    return resp(200, '{}');
  }
  if (method === 'DELETE') {
    h.calls.restDelete++;
    if (h.behavior.restDelete === 'network-error') throw new Error('Network timed out');
    if (h.behavior.restDelete === '403') return resp(403, 'PERMISSION_DENIED');
    if (h.behavior.restDelete === '404') return resp(404, 'Not found');
    h.server.delete(restPath);
    return resp(200, '{}');
  }
  return resp(200, '{}');
}

// ------------------------------------------------------------- browser stubs
class FakeCustomEvent {
  type: string;
  detail: any;
  constructor(type: string, init?: any) {
    this.type = type;
    this.detail = init?.detail;
  }
}

function installBrowserStubs(store: Map<string, string>) {
  const storage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => {
      store.set(k, String(v));
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => store.clear(),
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    get length() {
      return store.size;
    },
  };
  vi.stubGlobal('localStorage', storage);
  vi.stubGlobal('navigator', { onLine: true });
  vi.stubGlobal('window', {
    dispatchEvent: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    CustomEvent: FakeCustomEvent,
    // safeGetItem/safeSetItem read window.localStorage, not the
    // global — the stub must be the SAME object, or every ngwe_*
    // write is silently dropped.
    localStorage: storage,
    navigator: { onLine: true, standalone: false },
    matchMedia: () => ({
      matches: false,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
    }),
  });
  vi.stubGlobal('document', {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    visibilityState: 'visible',
  });
  vi.stubGlobal('navigator', { onLine: true });
  vi.stubGlobal('fetch', fakeFetch);
  return storage;
}

let queueInstances: any[] = [];

async function fresh(keepStorageStore?: Map<string, string>, keepServer = false) {
  // Flush any stray 50ms trigger timers from the previous instance.
  await new Promise((r) => setTimeout(r, 60));
  for (const q of queueInstances) {
    try {
      if (q.timer) clearInterval(q.timer);
    } catch {}
  }
  queueInstances = [];
  vi.resetModules();
  const store = keepStorageStore ?? new Map<string, string>();
  // User-scoped storage: ngwe_* keys are dropped until a scope is
  // set. Pre-seed the last-scope marker so the storage module
  // restores the scope at import time, then set it explicitly too.
  if (!keepStorageStore) store.set('__ngwe_last_scope', UID);
  installBrowserStubs(store);
  if (!keepServer) h.server.clear();
  resetBehavior();
  const storageMod = await import('../utils/storage');
  storageMod.setStorageScope(UID);
  const firebase = await import('./firebase');
  const queueMod = await import('./syncQueue');
  const transport = await import('./syncTransport');
  const markers = await import('../utils/deletedMarkers');
  const http = await import('./directFirestoreHttp');
  queueInstances.push(queueMod.syncQueue);
  return {
    firebase,
    queue: queueMod.syncQueue as typeof queueMod.syncQueue,
    SyncQueueManager: queueMod.SyncQueueManager,
    transport,
    markers,
    http,
    store,
  };
}

const UID = 'user_1';
const tx = (id: string, extra: any = {}) => ({
  id,
  userId: UID,
  type: 'expense',
  amount: 1000,
  category: 'cat_food',
  walletId: 'wallet_1',
  date: '2026-11-26',
  createdAt: '2026-11-26',
  note: `tx ${id}`,
  ...extra,
});
const serverTxPath = (id: string) => `users/${UID}/transactions/${id}`;
const serverTombPath = (id: string) => `users/${UID}/tombstones/${id}`;

beforeEach(() => {
  vi.useRealTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('delete-wins dedup', () => {
  it('upsert then delete leaves only the delete task; the doc is gone after sync', async () => {
    const m = await fresh();
    h.server.set(serverTxPath('tx1'), tx('tx1'));
    m.queue.enqueue('transactions', 'tx1', 'upsert', UID, tx('tx1'));
    m.queue.enqueueTxDelete('tx1', UID);
    const tasks = m.queue.getQueue().filter((t: any) => t.entityType === 'transactions' && t.entityId === 'tx1');
    expect(tasks).toHaveLength(1);
    expect(tasks[0].operation).toBe('delete');
    const res = await m.queue.processQueue();
    expect(res.awaitingConfirmation).toBe(0);
    expect(h.server.has(serverTxPath('tx1'))).toBe(false);
    expect(m.queue.getQueue()).toHaveLength(0);
  });

  it('delete then upsert drops the upsert; the doc is never written', async () => {
    const m = await fresh();
    m.queue.enqueueTxDelete('tx2', UID);
    m.queue.enqueue('transactions', 'tx2', 'upsert', UID, tx('tx2'));
    const tasks = m.queue.getQueue().filter((t: any) => t.entityType === 'transactions' && t.entityId === 'tx2');
    expect(tasks).toHaveLength(1);
    expect(tasks[0].operation).toBe('delete');
    await m.queue.processQueue();
    expect(h.server.has(serverTxPath('tx2'))).toBe(false);
  });

  it('enqueueBatch with both orders in one batch keeps only the delete', async () => {
    const m = await fresh();
    m.queue.enqueueBatch([
      { entityType: 'transactions', entityId: 'tx3', operation: 'upsert', targetUid: UID, data: tx('tx3') },
      { entityType: 'transactions', entityId: 'tx3', operation: 'delete', targetUid: UID },
    ]);
    const tasks = m.queue.getQueue().filter((t: any) => t.entityId === 'tx3');
    expect(tasks).toHaveLength(1);
    expect(tasks[0].operation).toBe('delete');
    // And the reverse order in a second batch for a second id.
    m.queue.enqueueBatch([
      { entityType: 'transactions', entityId: 'tx4', operation: 'delete', targetUid: UID },
      { entityType: 'transactions', entityId: 'tx4', operation: 'upsert', targetUid: UID, data: tx('tx4') },
    ]);
    const tasks4 = m.queue.getQueue().filter((t: any) => t.entityId === 'tx4');
    expect(tasks4).toHaveLength(1);
    expect(tasks4[0].operation).toBe('delete');
  });

  it('a tombstone blocks a later upsert for the same id', async () => {
    const m = await fresh();
    m.queue.enqueueTxDelete('tx5', UID);
    await m.queue.processQueue();
    expect(h.server.has(serverTombPath('tx5'))).toBe(true);
    // A stale device re-pushes the same id: refused.
    m.queue.enqueue('transactions', 'tx5', 'upsert', UID, tx('tx5'));
    expect(m.queue.getQueue().filter((t: any) => t.entityId === 'tx5')).toHaveLength(0);
    await m.queue.processQueue();
    expect(h.server.has(serverTxPath('tx5'))).toBe(false);
  });
});

describe('delete REST fallback', () => {
  it('SDK deleteDoc hanging + REST ok confirms via REST without waiting for the SDK', async () => {
    const m = await fresh();
    h.server.set(serverTxPath('tx1'), tx('tx1'));
    h.behavior.sdkDeleteDoc = 'hang';
    const res = await m.transport.executeSyncTask({
      id: 't1', entityType: 'transactions', entityId: 'tx1', operation: 'delete',
      targetUid: UID, timestamp: Date.now(), retryCount: 0, status: 'pending',
    } as any);
    // If the executor awaited the hanging SDK call first, this test
    // would time out — returning at all proves REST-first.
    expect(res.outcome).toBe('confirmed');
    expect(res.viaRest).toBe(true);
    expect(h.server.has(serverTxPath('tx1'))).toBe(false);
  });

  it('SDK deleteDoc hanging + REST failing returns failed (never hangs) via the timeout', async () => {
    const m = await fresh();
    vi.useFakeTimers();
    try {
      h.behavior.sdkDeleteDoc = 'hang';
      h.behavior.restDelete = 'network-error';
      const p = m.transport.executeSyncTask({
        id: 't1', entityType: 'transactions', entityId: 'tx1', operation: 'delete',
        targetUid: UID, timestamp: Date.now(), retryCount: 0, status: 'pending',
      } as any);
      const res = await vi.advanceTimersByTimeAsync(13000).then(() => p);
      expect(res.outcome).toBe('failed');
    } finally {
      vi.useRealTimers();
    }
  });

  it('offline delete: SDK-local accept keeps the task; reconnect confirms it and the doc stays gone', async () => {
    const m = await fresh();
    h.server.set(serverTxPath('tx1'), tx('tx1'));
    // Offline: REST unreachable, SDK resolves locally.
    h.behavior.restDelete = 'network-error';
    m.queue.enqueueTxDelete('tx1', UID);
    const res1 = await m.queue.processQueue();
    expect(res1.awaitingConfirmation).toBe(1);
    expect(m.queue.getQueue().some((t: any) => t.entityId === 'tx1' && t.operation === 'delete')).toBe(true);
    // [v7.6.56] A 'local' outcome counts the attempt, so the
    // backoff gate spaces re-attempts: an immediate second run
    // must make NO new transport attempt (the retry storm fix).
    const callsAfterFirst = h.calls.sdkDeleteDoc + h.calls.restDelete;
    await m.queue.processQueue();
    expect(h.calls.sdkDeleteDoc + h.calls.restDelete).toBe(callsAfterFirst);
    // Reconnect after the backoff (retryCount 1 → 1000ms): REST
    // works again and the delete confirms.
    await new Promise((r) => setTimeout(r, 1100));
    h.behavior.restDelete = 'ok';
    const res2 = await m.queue.processQueue();
    expect(res2.succeeded).toBeGreaterThan(0);
    expect(h.server.has(serverTxPath('tx1'))).toBe(false);
    expect(m.queue.getQueue().some((t: any) => t.entityId === 'tx1')).toBe(false);
  });

  it('REST DELETE 404 (already gone) counts as confirmed', async () => {
    const m = await fresh();
    h.behavior.restDelete = '404';
    const res = await m.transport.executeSyncTask({
      id: 't1', entityType: 'transactions', entityId: 'tx-gone', operation: 'delete',
      targetUid: UID, timestamp: Date.now(), retryCount: 0, status: 'pending',
    } as any);
    expect(res.outcome).toBe('confirmed');
  });

  it('upsert SDK failure falls back to REST and confirms', async () => {
    const m = await fresh();
    h.behavior.sdkSetDoc = 'throw-network';
    const res = await m.transport.executeSyncTask({
      id: 't1', entityType: 'transactions', entityId: 'tx1', operation: 'upsert',
      data: tx('tx1'), targetUid: UID, timestamp: Date.now(), retryCount: 0, status: 'pending',
    } as any);
    expect(res.outcome).toBe('confirmed');
    expect(res.viaRest).toBe(true);
    expect(h.server.get(serverTxPath('tx1'))?.id).toBe('tx1');
  });
});

describe('restart survival + convergence (offline-first proof)', () => {
  it('queued work survives kill + reopen while offline, then converges with no loss, no duplicates, no resurrection', async () => {
    // Client A, offline: create + delete.
    const a = await fresh();
    h.behavior.restPatch = 'network-error';
    h.behavior.restDelete = 'network-error';
    h.behavior.sdkSetDoc = 'throw-network';
    h.behavior.sdkDeleteDoc = 'throw-network';
    a.queue.enqueue('transactions', 'tx-keep', 'upsert', UID, tx('tx-keep'));
    a.queue.enqueueTxDelete('tx-gone', UID);
    h.server.set(serverTxPath('tx-gone'), tx('tx-gone'));
    await a.queue.processQueue();
    const pendingBefore = a.queue.getQueue();
    expect(pendingBefore.length).toBeGreaterThan(0);
    // The pending work is durable in localStorage, not just memory
    // (user-scoped key: _u_<uid>_ngwe_transactional_sync_queue).
    const stored = JSON.parse(a.store.get('_u_user_1_ngwe_transactional_sync_queue') || '[]');
    expect(stored.length).toBe(pendingBefore.length);

    // Kill + reopen: fresh module instances, SAME storage, SAME server.
    const b = await fresh(a.store, true);
    expect(b.queue.getQueue().length).toBe(pendingBefore.length);
    expect(b.queue.getPendingCount()).toBe(pendingBefore.length);

    // Reconnect: everything converges. Failed tasks carry backoff
    // (retryCount 1 → 1000ms), so wait it out first — the reload
    // itself does not reset the backoff clock.
    await new Promise((r) => setTimeout(r, 1100));
    h.behavior.restPatch = 'ok';
    h.behavior.restDelete = 'ok';
    h.behavior.sdkSetDoc = 'ok';
    h.behavior.sdkDeleteDoc = 'ok';
    const res = await b.queue.processQueue();
    expect(b.queue.getQueue()).toHaveLength(0);
    expect(h.server.get(serverTxPath('tx-keep'))?.id).toBe('tx-keep');
    expect(h.server.has(serverTxPath('tx-gone'))).toBe(false);
    // Second run: no duplicates, no resurrection.
    await b.queue.processQueue();
    expect(h.server.get(serverTxPath('tx-keep'))?.id).toBe('tx-keep');
    expect(h.server.has(serverTxPath('tx-gone'))).toBe(false);
    expect(res.succeeded + res.awaitingConfirmation).toBeGreaterThan(0);
  });
});

describe('dead-letter surfacing + retry', () => {
  it('permission-denied delete dead-letters visibly after 2 retries, stays un-synced, and retries to confirmed', async () => {
    const m = await fresh();
    h.server.set(serverTxPath('tx1'), tx('tx1'));
    h.behavior.restDelete = '403';
    h.behavior.sdkDeleteDoc = 'throw-permission';
    m.queue.enqueueTxDelete('tx1', UID);
    await m.queue.processQueue();
    // Backoff after a failure is 1000ms (retryCount 1): the second
    // attempt must wait it out, like a real retry would.
    await new Promise((r) => setTimeout(r, 1100));
    await m.queue.processQueue();
    const failed = m.queue.getFailedItems();
    expect(failed.some((t: any) => t.entityId === 'tx1' && t.operation === 'delete')).toBe(true);
    // Honest: the server copy is STILL there — the delete did not land.
    expect(h.server.has(serverTxPath('tx1'))).toBe(true);
    expect(m.queue.isDeleteBlocked('transactions', 'tx1')).toBe(true);
    // Retry from the dead-letter list.
    h.behavior.restDelete = 'ok';
    h.behavior.sdkDeleteDoc = 'ok';
    expect(m.queue.retryFailedItem('transactions', 'tx1')).toBe(true);
    await m.queue.processQueue();
    expect(m.queue.getFailedItems().some((t: any) => t.entityId === 'tx1')).toBe(false);
    expect(h.server.has(serverTxPath('tx1'))).toBe(false);
  });

  it('dead-letter survives a restart and can be retried afterwards', async () => {
    const a = await fresh();
    h.behavior.restDelete = '403';
    h.behavior.sdkDeleteDoc = 'throw-permission';
    a.queue.enqueueTxDelete('tx1', UID);
    await a.queue.processQueue();
    await new Promise((r) => setTimeout(r, 1100));
    await a.queue.processQueue();
    expect(a.queue.getFailedItems()).toHaveLength(1);
    const storedDead = JSON.parse(a.store.get('_u_user_1_ngwe_sync_queue_dead_letter') || '[]');
    expect(storedDead.length).toBe(1);

    const b = await fresh(a.store, true);
    expect(b.queue.getFailedItems().some((t: any) => t.entityId === 'tx1')).toBe(true);
    h.behavior.restDelete = 'ok';
    h.behavior.sdkDeleteDoc = 'ok';
    expect(b.queue.retryFailedItem('transactions', 'tx1')).toBe(true);
    await b.queue.processQueue();
    expect(b.queue.getFailedItems()).toHaveLength(0);
  });
});

describe('tombstone reconcile gate (cross-device resurrection)', () => {
  it('a second client reconciling while a delete is pending never re-pushes the deleted record', async () => {
    const m = await fresh();
    // Device 1 deleted txA: the tombstone is on the server.
    h.server.set(serverTombPath('txA'), { id: 'txA', userId: UID, entityType: 'transactions', deletedAt: Date.now() });
    // Device 2 holds a stale local copy and reconciles it as "missing".
    const res = await m.queue.reconcileMissingTxsWithWriteBatch({
      missingTxs: [tx('txA'), tx('txB')],
      targetUid: UID,
      cloudTxIds: new Set<string>(),
    });
    expect(h.server.has(serverTxPath('txA'))).toBe(false);
    expect(h.server.get(serverTxPath('txB'))?.id).toBe('txB');
    expect(res.newlyConfirmedTxIds).not.toContain('txA');
    expect(res.newlyConfirmedTxIds).toContain('txB');
  });
});

describe('v7.6.56 bounded retry + token failure + tombstone independence', () => {
  it('T1: a task that can never succeed dead-letters after MAX_RETRIES instead of retrying forever', async () => {
    const m = await fresh();
    vi.useFakeTimers();
    try {
      h.behavior.restDelete = 'network-error';
      h.behavior.restPatch = 'network-error';
      h.behavior.sdkDeleteDoc = 'throw-network';
      h.behavior.sdkSetDoc = 'throw-network';
      h.server.set(serverTxPath('tx1'), tx('tx1'));
      m.queue.enqueueTxDelete('tx1', UID);
      // 10 attempts, backoff-spaced (fake clock: 31s per step covers
      // the 30s cap). Advance-before-await keeps any internal timer
      // in the executor from deadlocking the test.
      for (let attempt = 0; attempt < 10; attempt++) {
        const p = m.queue.processQueue();
        await vi.advanceTimersByTimeAsync(31000);
        await p;
      }
      const failed = m.queue.getFailedItems();
      expect(failed.some((t: any) => t.entityId === 'tx1' && t.operation === 'delete')).toBe(true);
      expect(m.queue.getQueue().filter((t: any) => t.entityId === 'tx1')).toHaveLength(0);
      // Bounded: dead-lettered work is never auto-retried again.
      const callsBefore = h.calls.restDelete + h.calls.sdkDeleteDoc + h.calls.sdkSetDoc;
      const p2 = m.queue.processQueue();
      await vi.advanceTimersByTimeAsync(61000);
      await p2;
      expect(h.calls.restDelete + h.calls.sdkDeleteDoc + h.calls.sdkSetDoc).toBe(callsBefore);
    } finally {
      vi.useRealTimers();
    }
  });

  it('T3: fetchTombstoneTxIds unions the server set with the local cache instead of replacing it', async () => {
    const m = await fresh();
    m.markers.addTxTombstone('tx-local');
    h.server.set(serverTombPath('tx-server'), { id: 'tx-server', userId: UID, entityType: 'transactions', deletedAt: Date.now() });
    const ids = await m.markers.fetchTombstoneTxIds(UID);
    expect(ids.has('tx-local')).toBe(true);
    expect(ids.has('tx-server')).toBe(true);
    // The merged set is persisted, so the local tombstone survives
    // a restart even though the server never saw it land.
    expect(m.markers.getTombstonedTxIds().has('tx-local')).toBe(true);
    expect(m.markers.getTombstonedTxIds().has('tx-server')).toBe(true);
  });

  it('T4: a dead-lettered upsert does NOT delete-block a later delete for the same id', async () => {
    const m = await fresh();
    h.behavior.sdkSetDoc = 'throw-permission';
    h.behavior.restPatch = '403';
    m.queue.enqueue('transactions', 'tx1', 'upsert', UID, tx('tx1'));
    await m.queue.processQueue();
    await new Promise((r) => setTimeout(r, 1100));
    await m.queue.processQueue();
    expect(m.queue.getFailedItems().some((t: any) => t.entityId === 'tx1' && t.operation === 'upsert')).toBe(true);
    expect(m.queue.isEntityInDeadLetter('transactions', 'tx1')).toBe(true);
    expect(m.queue.isDeleteBlocked('transactions', 'tx1')).toBe(false);
    // The delete proceeds: it is enqueued and lands.
    m.queue.enqueueTxDelete('tx1', UID);
    expect(m.queue.getQueue().some((t: any) => t.entityId === 'tx1' && t.operation === 'delete')).toBe(true);
    h.behavior.sdkSetDoc = 'ok';
    h.behavior.restPatch = 'ok';
    await new Promise((r) => setTimeout(r, 1100));
    await m.queue.processQueue();
    expect(h.server.has(serverTxPath('tx1'))).toBe(false);
  });

  it('T5: safeDeleteDoc for a shared-wallet path records a durable task via the auth fallback uid', async () => {
    const m = await fresh();
    h.behavior.restDelete = 'network-error';
    h.behavior.sdkDeleteDoc = 'throw-network';
    const sharedPath = `sharedWallets/sw1/transactions/txShared`;
    const ok = await m.firebase.safeDeleteDoc({ path: sharedPath });
    expect(ok).toBe(false);
    expect(m.queue.isEntityPendingDelete('sharedWallets', 'sw1/transactions/txShared')).toBe(true);
    expect(
      m.queue.getQueue().some((t: any) => t.entityType === 'sharedWallets' && t.entityId === 'sw1/transactions/txShared' && t.operation === 'delete')
    ).toBe(true);
  });

  it('T8: delete while the auth token fails stays queued, then lands and prunes when the token recovers', async () => {
    const m = await fresh();
    h.server.set(serverTxPath('tx1'), tx('tx1'));
    // Token endpoint blocked (the user's 12:08 log): REST cannot
    // get a token, the SDK throws auth/network-request-failed.
    h.behavior.tokenFail = true;
    h.behavior.sdkDeleteDoc = 'throw-auth';
    h.behavior.sdkSetDoc = 'throw-auth';
    m.queue.enqueueTxDelete('tx1', UID);
    const res1 = await m.queue.processQueue();
    expect(res1.awaitingConfirmation).toBe(0);
    expect(m.queue.getQueue().some((t: any) => t.entityId === 'tx1' && t.operation === 'delete')).toBe(true);
    expect(h.server.has(serverTxPath('tx1'))).toBe(true);
    // Bounded while failing: an immediate re-run makes no new
    // transport attempt (backoff gate).
    const callsAfterFirst = h.calls.sdkDeleteDoc + h.calls.sdkSetDoc;
    await m.queue.processQueue();
    expect(h.calls.sdkDeleteDoc + h.calls.sdkSetDoc).toBe(callsAfterFirst);
    // Token recovers: the queued delete + tombstone land.
    await new Promise((r) => setTimeout(r, 1100));
    h.behavior.tokenFail = false;
    h.behavior.sdkDeleteDoc = 'ok';
    h.behavior.sdkSetDoc = 'ok';
    await m.queue.processQueue();
    expect(h.server.has(serverTxPath('tx1'))).toBe(false);
    expect(h.server.has(serverTombPath('tx1'))).toBe(true);
    expect(m.queue.getQueue().filter((t: any) => t.entityId === 'tx1')).toHaveLength(0);
  });

  it('T9: reconcile never re-pushes a record with a pending delete task', async () => {
    const m = await fresh();
    m.queue.enqueueTxDelete('txC', UID);
    const res = await m.queue.reconcileMissingTxsWithWriteBatch({
      missingTxs: [tx('txC'), tx('txD')],
      targetUid: UID,
      cloudTxIds: new Set<string>(),
    });
    expect(h.server.has(serverTxPath('txC'))).toBe(false);
    expect(h.server.get(serverTxPath('txD'))?.id).toBe('txD');
    expect(res.newlyConfirmedTxIds).not.toContain('txC');
    expect(res.newlyConfirmedTxIds).toContain('txD');
  });

  it('T10: a denied tombstone write can never block or stall the doc delete', async () => {
    const m = await fresh();
    h.server.set(serverTxPath('tx1'), tx('tx1'));
    // Tombstone upserts are SDK-only and the rules deny them here;
    // the delete itself goes through REST and must still land.
    h.behavior.sdkSetDoc = 'throw-permission';
    m.queue.enqueueTxDelete('tx1', UID);
    await m.queue.processQueue();
    await new Promise((r) => setTimeout(r, 1100));
    await m.queue.processQueue();
    expect(h.server.has(serverTxPath('tx1'))).toBe(false);
    expect(m.queue.getQueue().filter((t: any) => t.entityId === 'tx1')).toHaveLength(0);
    // The tombstone task dead-lettered visibly instead of looping.
    expect(m.queue.getFailedItems().some((t: any) => t.entityType === 'tombstones' && t.entityId === 'tx1')).toBe(true);
    // And the local tombstone cache still protects this device.
    expect(m.markers.getTombstonedTxIds().has('tx1')).toBe(true);
  });
});

describe('safeDeleteDoc / safeSetDoc lifecycle', () => {
  it('safeDeleteDoc confirms via REST, removes the task, and writes the tombstone', async () => {
    const m = await fresh();
    h.server.set(serverTxPath('tx1'), tx('tx1'));
    const ok = await m.firebase.safeDeleteDoc({ path: serverTxPath('tx1') });
    expect(ok).toBe(true);
    expect(h.server.has(serverTxPath('tx1'))).toBe(false);
    // The tombstone task is processed by the queue engine.
    await m.queue.processQueue();
    expect(h.server.has(serverTombPath('tx1'))).toBe(true);
    expect(m.queue.getQueue().filter((t: any) => t.entityId === 'tx1')).toHaveLength(0);
    expect(m.markers.getTombstonedTxIds().has('tx1')).toBe(true);
  });

  it('safeDeleteDoc with both transports failing keeps the durable delete task', async () => {
    const m = await fresh();
    h.server.set(serverTxPath('tx1'), tx('tx1'));
    h.behavior.restDelete = 'network-error';
    h.behavior.sdkDeleteDoc = 'throw-network';
    const ok = await m.firebase.safeDeleteDoc({ path: serverTxPath('tx1') });
    expect(ok).toBe(false);
    expect(m.queue.isEntityPendingDelete('transactions', 'tx1')).toBe(true);
    expect(m.markers.getTombstonedTxIds().has('tx1')).toBe(true);
    // The record is still on the server (honest: the delete did not land).
    expect(h.server.has(serverTxPath('tx1'))).toBe(true);
  });

  it('safeSetDoc refuses to write an entity with a pending delete', async () => {
    const m = await fresh();
    m.queue.enqueueTxDelete('tx1', UID);
    const ok = await m.firebase.safeSetDoc(
      { path: serverTxPath('tx1') },
      tx('tx1', { amount: 9999 })
    );
    expect(ok).toBe(false);
    expect(h.server.has(serverTxPath('tx1'))).toBe(false);
  });

  it('safeSetDoc writes through the single transport and confirms', async () => {
    const m = await fresh();
    const ok = await m.firebase.safeSetDoc(
      { path: serverTxPath('tx1') },
      tx('tx1')
    );
    expect(ok).toBe(true);
    expect(h.server.get(serverTxPath('tx1'))?.id).toBe('tx1');
  });

  it('safeDeleteDoc for a non-transaction entity uses generic REST-first delete and confirms', async () => {
    const m = await fresh();
    const walletPath = `users/${UID}/wallets/wallet_1`;
    h.server.set(walletPath, { id: 'wallet_1', userId: UID });
    const ok = await m.firebase.safeDeleteDoc({ path: walletPath });
    expect(ok).toBe(true);
    // [v7.6.56] Generic REST-first: the REST DELETE ran (not just
    // the SDK), so the confirmation is real.
    expect(h.calls.restDelete).toBeGreaterThan(0);
    expect(h.server.has(walletPath)).toBe(false);
  });

  it('safeDeleteDoc for a non-transaction entity: REST failing + SDK resolving keeps the durable task (local, not confirmed)', async () => {
    const m = await fresh();
    const walletPath = `users/${UID}/wallets/wallet_1`;
    h.server.set(walletPath, { id: 'wallet_1', userId: UID });
    h.behavior.restDelete = 'network-error';
    const ok = await m.firebase.safeDeleteDoc({ path: walletPath });
    // [v7.6.56] An SDK resolve is 'local', not confirmation — and a
    // queue intent WAS recorded, so safeDeleteDoc honestly
    // reports false and the task stays for REST re-confirmation.
    expect(ok).toBe(false);
    expect(m.queue.isEntityPendingDelete('wallets', 'wallet_1')).toBe(true);
    await new Promise((r) => setTimeout(r, 1100));
    h.behavior.restDelete = 'ok';
    await m.queue.processQueue();
    expect(h.server.has(walletPath)).toBe(false);
    expect(m.queue.isEntityPendingDelete('wallets', 'wallet_1')).toBe(false);
  });
});

describe('firestore.rules tombstones (source text)', () => {
  it('has an owner-only tombstones match inside match /users/{userId}', () => {
    const rules = readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8');
    const usersBlock = rules.slice(rules.indexOf('match /users/{userId}'));
    expect(usersBlock).toContain('match /tombstones/{tombstoneId}');
    const tombBlock = usersBlock.slice(
      usersBlock.indexOf('match /tombstones/{tombstoneId}'),
      usersBlock.indexOf('match /debts/{debtId}')
    );
    expect(tombBlock).toContain('allow read: if canAccess(userId);');
    expect(tombBlock).toContain('allow create, update: if canWriteOwnerOnly(userId)');
    expect(tombBlock).toContain('request.resource.data.userId == userId');
    expect(tombBlock).toContain('request.resource.data.id == tombstoneId');
    expect(tombBlock).toContain('allow delete: if canWriteOwnerOnly(userId) || isAdmin();');
  });
});

describe('firestore.rules admin + feedbacks (source text)', () => {
  it('activationCodes admin unmark/revoke updates are allowed (R1)', () => {
    const rules = readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8');
    const block = rules.slice(rules.indexOf('match /activationCodes/{codeId}'));
    const adminBlock = block.slice(0, block.indexOf('match /', 10) === -1 ? undefined : block.indexOf('match /', 10));
    expect(adminBlock).toContain('allow update: if isAdmin();');
  });

  it('feedbacks list is split so an unfiltered list query can never be denied (R2)', () => {
    const rules = readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8');
    const block = rules.slice(rules.indexOf('match /feedbacks/{feedbackId}'));
    const feedbackBlock = block.slice(0, 600);
    expect(feedbackBlock).toContain('allow get:');
    expect(feedbackBlock).toContain('allow list:');
    expect(feedbackBlock).toContain("data.isPublic == true");
    // No bare resource-dependent list rule remains.
    expect(feedbackBlock).not.toContain('allow read: if');
  });
});

describe('v7.6.56 wiring pins (source text)', () => {
  it('the five listeners prune confirmed-missing docs and record server ids', () => {
    const src = readFileSync(new URL('../hooks/useCloudListeners.ts', import.meta.url), 'utf8');
    expect(src).toContain('pruneConfirmedMissing');
    for (const key of ['wallets', 'debts', 'categories', 'budgets', 'shops']) {
      expect(src).toContain(`confirmedIdsRef.current.${key}.add`);
    }
    expect(src).toContain('isConfirmedMissingWallet');
  });

  it('the feedback subscription constrains non-admin queries (R2 companion)', () => {
    const src = readFileSync(new URL('../lib/feedbackService.ts', import.meta.url), 'utf8');
    expect(src).toContain("where('isPublic', '==', true)");
    expect(src).toContain("where('userId', '==', opts.userId)");
    expect(src).toContain('submitFeedback');
  });

  it('the pre-delete auto-backup includes every exported collection (P10)', () => {
    const src = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');
    expect(src).toContain('collectBackupExtras');
    expect(src).toContain('savingsTargets');
    expect(src).toContain('deletedMarkers');
  });

  it('the global menu derivation and both re-apply paths read fuel logs (P2a/P2b)', () => {
    const app = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');
    expect(app).toContain('collectLatestItemsByShop(transactions, suggestions, vehicleMaintenance, fuelLogs)');
    expect(app).toContain('fuelLogs,');
    const menu = readFileSync(new URL('../utils/shopMenuUpdate.ts', import.meta.url), 'utf8');
    expect(menu).toContain('fuelLogs?: FuelLog[]');
    expect(menu).toContain('shopMenuState');
  });

  it('the Vehicles-tab save wrappers build menu candidates after saving (P1b)', () => {
    const app = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');
    expect(app).toContain('handleSaveFuelLogWithMenu');
    expect(app).toContain('handleSaveMaintenanceWithMenu');
    expect(app).toContain('buildVehicleMenuCandidate');
  });
});

describe('no-bypass regression guards (source text)', () => {
  it('doProcessQueue has no upsert-only REST fallback anymore — every task goes through the executor', () => {
    const src = readFileSync(new URL('./syncQueue.ts', import.meta.url), 'utf8');
    expect(src).toContain('executeSyncTask(task)');
    expect(src).not.toContain('Direct HTTPS REST Fallback');
  });

  it('safeDeleteDoc persists the delete intent before attempting, via the single transport', () => {
    const src = readFileSync(new URL('./firebase.ts', import.meta.url), 'utf8');
    const fn = src.slice(src.indexOf('export async function safeDeleteDoc'));
    expect(fn).toContain('enqueueTxDelete');
    expect(fn).toContain('executeSyncTask');
    // The task leaves the queue only on server confirmation, in the
    // confirmed branch — never unconditionally after the attempt.
    expect(fn).toContain("result.outcome === 'confirmed'");
  });

  it('no task-killer remains in the transaction/debt delete handlers', () => {
    const txHandlers = readFileSync(new URL('../hooks/useTransactionHandlers.ts', import.meta.url), 'utf8');
    const debtHandlers = readFileSync(new URL('../hooks/useDebtHandlers.ts', import.meta.url), 'utf8');
    expect(txHandlers).not.toContain('syncQueue.remove(');
    expect(debtHandlers).not.toContain('syncQueue.remove(');
  });

  it('queue-task removal only happens at the allow-listed confirmation sites', async () => {
    const { execSync } = await import('node:child_process');
    const out = execSync('grep -rn "syncQueue.remove(" src --include="*.ts" --include="*.tsx" | grep -v ".test."', {
      cwd: new URL('../..', import.meta.url).pathname,
      encoding: 'utf8',
    });
    const files = [...new Set(out.trim().split('\n').map((l) => l.split(':')[0]))].sort();
    expect(files).toEqual([
      'src/components/DatabaseSyncTrackerModal.tsx',
      'src/components/SyncStatusDrawer.tsx',
      'src/hooks/useCloudListeners.ts',
      'src/hooks/useSyncOperations.ts',
      'src/lib/firebase.ts',
    ]);
  });

  it('Records balance card carries the Manual Sync button, signed-in only, wired to handleCardSync', () => {
    const src = readFileSync(new URL('../components/TransactionsView.tsx', import.meta.url), 'utf8');
    // Signed-in-only guard, handler wiring, disabled-while-syncing, spin
    // state, and both-language accessible labels — the button cannot be
    // reached in the guest Playwright harness, so the wiring is pinned
    // here and the live signed-in render stays on the not-verified list.
    expect(src).toContain('onClick={handleCardSync}');
    expect(src).toContain('disabled={isSyncing || isCardSyncing}');
    expect(src).toContain("aria-label={lang === 'my' ? 'Cloud နှင့် ထပ်မံချိတ်ဆက်မည်' : 'Sync with Cloud'}");
    const guardIdx = src.indexOf('{user && (');
    const btnIdx = src.indexOf('onClick={handleCardSync}');
    expect(guardIdx).toBeGreaterThan(-1);
    expect(btnIdx).toBeGreaterThan(guardIdx);
    expect(src.slice(guardIdx, btnIdx)).not.toContain('</button>');
  });
});
