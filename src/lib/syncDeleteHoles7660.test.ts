/**
 * v7.6.60 — sync delete-loss holes (F1/F3/F4): fake-server harness.
 *
 * F1: a delete enqueued while an upsert write is in flight must
 * survive the upsert's success cleanup (removeUpsertOnly).
 * F3: a batch/setDoc resolve is only a LOCAL accept — the
 * "synced" signature may advance only after server
 * acknowledgement (waitForPendingWrites), else durable backup
 * tasks are enqueued and the signature stays put.
 * F4: a stale device that was offline when a delete landed
 * elsewhere must learn the server tombstones BEFORE pushing,
 * for transactions AND for debts/wallets/shops/vehicles/logs
 * (generalized composite tombstones).
 *
 * Each flaw is proven fail-first: the F1 race test exercises only
 * pre-existing entry points (safeSetDoc/safeDeleteDoc) and FAILS
 * on the v7.6.59 tree; the F3/F4 wiring pins read source text
 * and FAIL on the v7.6.59 tree. The mechanism simulations show
 * the old flow resurrecting and the new flow not doing so, with
 * the real queue/transport/marker modules against one in-memory
 * fake server. F7 (tracker reachability) is proven by source pins
 * here and by a render check (drawer footer button opens the
 * tracker modal) — the pins FAIL on the v7.6.59 tree, where no
 * opener existed. What this does NOT prove (real devices, signed-in
 * Firestore, live rules) is listed honestly in the version report.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';

// ---------------------------------------------------------------- fake server
const h = vi.hoisted(() => {
  const server = new Map<string, any>();
  const behavior = {
    sdkSetDoc: 'ok' as 'ok' | 'slow' | 'hang' | 'throw-permission' | 'throw-network' | 'throw-auth',
    sdkDeleteDoc: 'ok' as 'ok' | 'hang' | 'throw-permission' | 'throw-network' | 'throw-auth',
    restPatch: 'ok' as 'ok' | '403' | '429' | 'network-error',
    restDelete: 'ok' as 'ok' | '403' | '404' | 'network-error',
    tokenFail: false,
    waitForPendingWrites: 'ok' as 'ok' | 'reject' | 'hang',
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
  h.behavior.waitForPendingWrites = 'ok';
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
    if (mode === 'slow') await new Promise((r) => setTimeout(r, 80));
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
    waitForPendingWrites: vi.fn(async () => {
      const mode = h.behavior.waitForPendingWrites;
      if (mode === 'reject') throw new Error('server rejected the write');
      if (mode === 'hang') return new Promise(() => {});
    }),
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
  vi.stubGlobal('fetch', fakeFetch);
  return storage;
}

let queueInstances: any[] = [];

async function fresh(keepStorageStore?: Map<string, string>, keepServer = false) {
  await new Promise((r) => setTimeout(r, 60));
  for (const q of queueInstances) {
    try {
      if (q.timer) clearInterval(q.timer);
    } catch {}
  }
  queueInstances = [];
  vi.resetModules();
  const store = keepStorageStore ?? new Map<string, string>();
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
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

beforeEach(() => {
  vi.useRealTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('F1 — delete enqueued mid-write survives the upsert success cleanup', () => {
  it('a delete issued while safeSetDoc is in flight keeps its queue task (the v7.6.59 race)', async () => {
    const m = await fresh();
    h.server.set(serverTxPath('tx1'), tx('tx1'));
    // A pending edit for tx1 (the upsert task exists before the save).
    m.queue.enqueue('transactions', 'tx1', 'upsert', UID, tx('tx1'));
    h.behavior.sdkSetDoc = 'slow';
    h.behavior.restDelete = 'network-error';
    h.behavior.sdkDeleteDoc = 'throw-network';
    // The save starts; its entry guard ran BEFORE any delete existed.
    const saveP = m.firebase.safeSetDoc({ path: serverTxPath('tx1') }, tx('tx1'));
    await sleep(20);
    // The user deletes tx1 while the save is still in flight. Both
    // transports fail, so the durable delete task must stay queued.
    const delOk = await m.firebase.safeDeleteDoc({ path: serverTxPath('tx1') });
    expect(delOk).toBe(false);
    const saveOk = await saveP;
    expect(saveOk).toBe(true);
    await sleep(10); // let safeSetDoc's fire-and-forget cleanup run
    // THE INVARIANT: the delete task survived the successful upsert.
    // On the old operation-blind remove() this is false — the task
    // was wiped and the record stayed on every other device.
    expect(m.queue.isEntityPendingDelete('transactions', 'tx1')).toBe(true);
    // And the race really happened: the upsert landed on the server.
    expect(h.server.has(serverTxPath('tx1'))).toBe(true);
    // The tombstone task converges, and the delete still retries.
    await m.queue.processQueue();
    expect(h.server.has(serverTombPath('tx1'))).toBe(true);
    expect(m.queue.isEntityPendingDelete('transactions', 'tx1')).toBe(true);
  });

  it('removeUpsertOnly drops upsert tasks and never delete tasks', async () => {
    const m = await fresh();
    const q = new m.SyncQueueManager();
    queueInstances.push(q);
    q.enqueue('transactions', 'txA', 'upsert', UID, tx('txA'));
    q.enqueue('transactions', 'txA', 'delete', UID);
    q.enqueue('transactions', 'txB', 'upsert', UID, tx('txB'));
    q.removeUpsertOnly('transactions', 'txA');
    expect(q.isEntityPendingDelete('transactions', 'txA')).toBe(true);
    q.removeUpsertOnly('transactions', 'txB');
    expect(q.isEntityPending('transactions', 'txB')).toBe(false);
    expect(q.getQueue()).toHaveLength(1);
  });

  it('force-push REST success drops only upsert tasks (source pin)', () => {
    const src = readFileSync(new URL('../hooks/useSyncOperations.ts', import.meta.url), 'utf8');
    expect(src).toContain("syncQueue.removeUpsertOnly('transactions', sId)");
    const queueSrc = readFileSync(new URL('./syncQueue.ts', import.meta.url), 'utf8');
    expect(queueSrc).toContain('public removeUpsertOnly(');
    const firebaseSrc = readFileSync(new URL('./firebase.ts', import.meta.url), 'utf8');
    expect(firebaseSrc).toContain('syncQueue.removeUpsertOnly(entityType as any, entityId)');
  });
});

describe('F3 — batch confirmation gate', () => {
  it('server acknowledgement returns true and enqueues no backup tasks', async () => {
    const m = await fresh();
    const confirmed = await m.queue.confirmBatchWritesOrEnqueueBackup(
      [{ entityType: 'transactions', entityId: 'tx1', operation: 'upsert', targetUid: UID, data: tx('tx1') }],
      async () => {}
    );
    expect(confirmed).toBe(true);
    expect(m.queue.getQueue()).toHaveLength(0);
  });

  it('server rejection returns false and enqueues durable backup tasks', async () => {
    const m = await fresh();
    const confirmed = await m.queue.confirmBatchWritesOrEnqueueBackup(
      [{ entityType: 'transactions', entityId: 'tx1', operation: 'upsert', targetUid: UID, data: tx('tx1') }],
      async () => {
        throw new Error('server rejected the write');
      }
    );
    expect(confirmed).toBe(false);
    const tasks = m.queue.getQueue();
    expect(tasks).toHaveLength(1);
    expect(tasks[0].entityId).toBe('tx1');
    expect(tasks[0].operation).toBe('upsert');
  });

  it('a backup is never enqueued for a delete-blocked id (delete still wins)', async () => {
    const m = await fresh();
    m.queue.enqueue('transactions', 'txD', 'delete', UID);
    const confirmed = await m.queue.confirmBatchWritesOrEnqueueBackup(
      [
        { entityType: 'transactions', entityId: 'txD', operation: 'upsert', targetUid: UID, data: tx('txD') },
        { entityType: 'transactions', entityId: 'txE', operation: 'upsert', targetUid: UID, data: tx('txE') },
      ],
      async () => {
        throw new Error('server rejected the write');
      }
    );
    expect(confirmed).toBe(false);
    const tasks = m.queue.getQueue();
    expect(tasks.filter((t: any) => t.entityId === 'txD')).toHaveLength(1);
    expect(tasks.find((t: any) => t.entityId === 'txD')!.operation).toBe('delete');
    expect(tasks.some((t: any) => t.entityId === 'txE' && t.operation === 'upsert')).toBe(true);
  });

  it('syncDataToCloud advances its signature only on confirmation (source pin)', () => {
    const src = readFileSync(new URL('../context/AuthContext.tsx', import.meta.url), 'utf8');
    expect(src).toContain('syncQueue.confirmBatchWritesOrEnqueueBackup(backupOps)');
    const callIdx = src.indexOf('syncQueue.confirmBatchWritesOrEnqueueBackup(backupOps)');
    const advanceIdx = src.indexOf('lastSyncedSignatureRef.current = currentSig', callIdx);
    expect(advanceIdx).toBeGreaterThan(callIdx);
    expect(src.slice(callIdx, advanceIdx)).toContain('if (batchConfirmed)');
  });
});

describe('F4 — stale-device resurrection window', () => {
  it('a shop deleted on device A blocks the stale push on device B via the composite tombstone', async () => {
    const a = await fresh();
    const shopId = 'shop_1';
    const shopPath = `users/${UID}/shops/${shopId}`;
    h.server.set(shopPath, { id: shopId, userId: UID, name: 'Shop' });
    h.behavior.restDelete = 'network-error';
    h.behavior.sdkDeleteDoc = 'throw-network';
    const ok = await a.firebase.safeDeleteDoc({ path: shopPath });
    expect(ok).toBe(false);
    // Durable delete task + composite tombstone intent recorded locally.
    expect(a.queue.isEntityPendingDelete('shops', shopId)).toBe(true);
    expect(a.markers.isEntityTombstoned('shops', shopId)).toBe(true);
    // Converge the tombstone task onto the fake server.
    await a.queue.processQueue();
    expect(h.server.has(`users/${UID}/tombstones/shops:${shopId}`)).toBe(true);
    // Device B: fresh storage, same server, stale local copy, no snapshot yet.
    const b = await fresh(new Map(), true);
    expect(b.markers.isEntityTombstoned('shops', shopId)).toBe(false);
    await b.markers.fetchEntityTombstones(UID);
    expect(b.markers.isEntityTombstoned('shops', shopId)).toBe(true);
    expect(b.queue.isDeleteBlocked('shops', shopId)).toBe(true);
    // B's push filter would drop the stale shop; enqueue refuses it too.
    expect(b.queue.enqueue('shops', shopId, 'upsert', UID, { id: shopId })).toBe('');
    expect(b.queue.isEntityPending('shops', shopId)).toBe(false);
  });

  it('stale-device resurrection: without the sync-start fetch the tx reappears; with it, it does not', async () => {
    const a = await fresh();
    h.server.set(serverTxPath('tx9'), tx('tx9'));
    // Device A deletes tx9; the tombstone converges.
    const delOk = await a.firebase.safeDeleteDoc({ path: serverTxPath('tx9') });
    expect(delOk).toBe(true);
    await a.queue.processQueue();
    expect(h.server.has(serverTxPath('tx9'))).toBe(false);
    expect(h.server.has(serverTombPath('tx9'))).toBe(true);
    // Device B: stale local copy, never saw a snapshot.
    const b = await fresh(new Map(), true);
    expect(b.queue.isDeleteBlocked('transactions', 'tx9')).toBe(false);
    // OLD FLOW (v7.6.59 syncDataToCloud): no tombstone fetch — the
    // batch pushes the stale copy and the record resurrects.
    const firestore = await import('firebase/firestore');
    const batch = firestore.writeBatch((b as any).firebase.db);
    batch.set(
      firestore.doc((b as any).firebase.db, 'users', UID, 'transactions', 'tx9'),
      { ...tx('tx9') },
      { merge: true }
    );
    await batch.commit();
    expect(h.server.has(serverTxPath('tx9'))).toBe(true);
    // Reset the server to the deleted state.
    h.server.delete(serverTxPath('tx9'));
    // NEW FLOW: B fetches tombstones first (the v7.6.60 sync-start
    // step), then its push filter drops the stale copy.
    await b.markers.fetchTombstoneTxIds(UID);
    expect(b.queue.isDeleteBlocked('transactions', 'tx9')).toBe(true);
    const toPush = [tx('tx9')].filter((t) => !b.queue.isDeleteBlocked('transactions', t.id));
    expect(toPush).toHaveLength(0);
    expect(h.server.has(serverTxPath('tx9'))).toBe(false);
  });

  it('budgets and categories get a delete task but NO server tombstone (reused doc ids)', async () => {
    const m = await fresh();
    h.behavior.restDelete = 'network-error';
    h.behavior.sdkDeleteDoc = 'throw-network';
    await m.firebase.safeDeleteDoc({ path: `users/${UID}/budgets/cat_food` });
    await m.firebase.safeDeleteDoc({ path: `users/${UID}/categories/cat_salary` });
    expect(m.queue.isEntityPendingDelete('budgets', 'cat_food')).toBe(true);
    expect(m.queue.isEntityPendingDelete('categories', 'cat_salary')).toBe(true);
    expect(m.markers.isEntityTombstoned('budgets', 'cat_food')).toBe(false);
    expect(m.markers.isEntityTombstoned('categories', 'cat_salary')).toBe(false);
    const tombTasks = m.queue.getQueue().filter((t: any) => t.entityType === 'tombstones');
    expect(tombTasks).toHaveLength(0);
  });

  it('syncDataToCloud fetches tombstones before building the push (source pin)', () => {
    const src = readFileSync(new URL('../context/AuthContext.tsx', import.meta.url), 'utf8');
    expect(src).toContain('fetchEntityTombstones(targetUid)');
    expect(src).toContain('fetchTombstoneTxIds(targetUid)');
    const fetchIdx = src.indexOf('fetchEntityTombstones(targetUid)');
    const pushIdx = src.indexOf('const txsToPush');
    expect(fetchIdx).toBeGreaterThan(-1);
    expect(fetchIdx).toBeLessThan(pushIdx);
    const firebaseSrc = readFileSync(new URL('./firebase.ts', import.meta.url), 'utf8');
    expect(firebaseSrc).toContain('addEntityTombstone');
  });
});

describe('F7 — database sync tracker is reachable from the sync drawer', () => {
  it('the drawer carries the single opener and App wires it to the tracker state (source pin)', () => {
    const drawerSrc = readFileSync(
      new URL('../components/SyncStatusDrawer.tsx', import.meta.url), 'utf8');
    expect(drawerSrc).toContain('onOpenDatabaseTracker?: () => void');
    expect(drawerSrc).toContain('onOpenDatabaseTracker();');
    // The drawer and the tracker modal share z-50 and the drawer
    // mounts later, so the opener must close the drawer first —
    // otherwise the tracker opens underneath it and looks dead.
    const btnIdx = drawerSrc.indexOf('View full sync details');
    expect(btnIdx).toBeGreaterThan(-1);
    expect(drawerSrc.slice(btnIdx - 400, btnIdx)).toContain('onClose();');
    const appSrc = readFileSync(
      new URL('../App.tsx', import.meta.url), 'utf8');
    expect(appSrc).toContain('onOpenDatabaseTracker={() => setIsDatabaseTrackerOpen(true)}');
    // Exactly one opener exists: no other call site may open the tracker.
    expect(appSrc.match(/setIsDatabaseTrackerOpen\(true\)/g)).toHaveLength(1);
  });
});
