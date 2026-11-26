# NgweSarYin Sync Mechanism (v7.6.52)

One canonical pipeline for every cloud write and delete. This document
describes the code as shipped in v7.6.52 — no aspirational claims.
Where a guarantee has a known residual window, it says so.

## The problem it replaces

Before v7.6.52 there were five-plus competing write paths: direct
`safeSetDoc`/`safeDeleteDoc` calls, the `syncQueue` retry queue, the
`syncDataToCloud` batch push, the reconcile write-batch, the REST
helpers, and the Firestore SDK's own offline queue. A delete could
succeed locally, fail on the network, lose its retry task (callers
removed queue tasks after attempting a delete), and then be
resurrected by another device re-pushing the same record — while the
UI showed nothing wrong. A queued delete retried through the SDK
only, even though the SDK's `deleteDoc` is documented to hang
silently on iOS WebKit.

## The pipeline

```
user action / listener / batch push
        │
        ▼
syncQueue.enqueue*()            durable intent, localStorage-persisted
        │                       (delete-wins dedup: an upsert for a
        │                        delete-blocked id is refused)
        ▼
syncQueue.processQueue()        retry engine (backoff, dead-letter)
        │
        ▼
executeSyncTask()              ONE transport (src/lib/syncTransport.ts)
        │  SDK attempt + REST fallback, order depends on the kind
        ▼
outcome: confirmed | local | failed
        │
        ├── confirmed ──► task removed from the queue
        ├── local ──────► task KEPT (SDK accepted, server unconfirmed;
        │                   deletes only; re-attempted REST-first,
        │                   backoff-spaced via the attempt count)
        └── failed ─────► task kept with backoff; failures that can
                           never succeed dead-letter visibly (see below)
```

Confirmation also arrives from the live listeners and the pull merge:
when a server snapshot (or a server-fresh pull) no longer contains a
record that was confirmed before, the local delete task for that id
is removed and the local marker cleared. A task leaves the queue
ONLY on server confirmation — never on a local SDK acknowledgement,
and never because a caller removed it after attempting the delete.

## Transport order (executeSyncTask)

| Kind | First attempt | Fallback | `confirmed` means |
|---|---|---|---|
| Transaction upsert | SDK `setDoc` (12s timeout) | REST PATCH | SDK resolve, or REST 2xx |
| Transaction delete | REST DELETE (12s timeout) | SDK `deleteDoc` (12s timeout) | REST ok/404, or listener/pull-observed absence. An SDK resolve alone is `local`, NOT confirmed |
| Shared-wallet tx upsert/delete | SDK first (upsert) / REST first (delete) | the other transport | same as above, on the shared doc path |
| Other entities (debts, wallets, ...) upsert | SDK `setDoc` (12s timeout) | REST is not available for these paths | SDK resolve |
| Other entities delete | generic REST DELETE (12s timeout) | SDK `deleteDoc` (12s timeout) | REST ok/404, or listener/pull-observed absence. An SDK resolve alone is `local`, NOT confirmed — the same rule as transaction deletes (v7.6.56; the old SDK-resolve-confirms asymmetry is gone) |

`safeSetDoc`/`safeDeleteDoc` (`src/lib/firebase.ts`) are thin
wrappers over the same executor for their immediate attempt, plus
queue bookkeeping. They do NOT have their own transport anymore.
`safeUpdateDoc` stays attempt-only by design: partial-update payloads
(including `deleteField()` sentinels) cannot round-trip through the
upsert queue, so it refuses (returns false) when the target is
delete-blocked instead of enqueueing.

Quota accounting (`recordFirestoreOp`) stays in the `safe*`
wrappers, not in the executor, so quota is counted once per
caller-visible operation.

## Delete wins — everywhere

`syncQueue.isDeleteBlocked(entityType, entityId)` is true when ANY of
these hold:

1. a delete task for the id is pending in the queue,
2. a delete for the id is in the dead-letter list,
3. a tombstone for the id exists (transactions only),
4. a local deletion marker for the id exists.

Every write path consults it:

- `syncQueue.enqueue()` / `enqueueBatch()` refuse upserts for
  blocked ids (the tombstone/marker leg — a delete that already
  confirmed still blocks re-upsert).
- `safeSetDoc` / `safeUpdateDoc` refuse blocked ids.
- `syncDataToCloud` skips blocked ids in EVERY collection loop, on
  both branches (pending-only and forced full sync). The old forced
  branch pushed all local transactions and resurrected deletes.
- `handleForcePushAll` partitions blocked ids out, repair-enqueues
  their delete tasks, and never unmarks them.
- The pull merge and every live listener skip blocked ids, and only
  clear a deletion marker when no delete task is outstanding.
- The single-push and REST-fallback paths in
  `DatabaseSyncTrackerModal` refuse/gate blocked ids.
- `reconcileMissingTxsWithWriteBatch` fetches tombstones
  server-first and skips tombstoned / pending-delete / marked ids.

## Tombstones (transactions only)

- Written to `users/{uid}/tombstones/{txId}` with
  `{ id, userId, entityType: 'transactions', deletedAt }`.
- `enqueueTxDelete` writes the tombstone task ONLY when the target
  uid is the current user's uid (a collaborator's tombstone write
  under the owner's path would be rules-denied; the shared-wallet
  delete task still proceeds — see Limitations).
- Tombstones are best-effort: the delete task is the primary
  guarantee. A tombstone write failure does not fail the delete.
- Tombstones are NEVER pruned in v1. Reusing a deleted transaction
  id is therefore permanently blocked on any device that knows the
  tombstone. Transaction ids are unique per creation, so this does
  not affect normal use.
- Rules (`firestore.rules`, inside `match /users/{userId}`):
  owner-only create/update/delete, owner/admin read, mirroring the
  wallets pattern. The payload must carry `userId` and `id`
  matching the path.
- Every device learns tombstones three ways: the tombstone
  `onSnapshot` listener, the pull (`pullDataFromCloud` returns
  `tombstoneTxIds`, unioned into the local cache — never a clear),
  and the reconcile fetch gate. The local cache
  (`ngwe_tombstone_tx_ids`, user-scoped) keeps gating working
  offline and across restarts.

## Retry / dead-letter rules

- Backoff: `BASE_BACKOFF_MS=1000`, doubling, capped at
  `MAX_BACKOFF_MS=30000`. `processQueue()` only runs tasks whose
  backoff has expired; there is no force flag (call sites that cast
  `{ force: true }` are passing an ignored argument — the retry
  happens when the backoff expires, on the next trigger, or on the
  2-minute heartbeat).
- Network errors: retry until confirmed. At `MAX_RETRIES=10` the
  task stays queued with capped backoff and a warning — it is NOT
  dropped.
- Permission-denied (and quota-exceeded) failures: after
  `PERMISSION_MAX_RETRIES=2` attempts the task moves to the
  dead-letter list (`getFailedItems()`), persisted across restarts.
  Dead-lettered items NEVER auto-retry. Any OTHER failure that
  reaches `MAX_RETRIES=10` dead-letters the same way (v7.6.56) —
  a task that can never succeed must not retry forever.
- `local` outcome (SDK-accepted delete, server unconfirmed): the
  task stays pending and the attempt is COUNTED (retryCount + 1,
  so the backoff gate spaces re-attempts), but it is never
  dead-lettered on the count alone — the delete may have landed —
  and is counted in `awaitingConfirmation`.
- `retryFailedItem()` / `retryAllFailed()` move dead-lettered items
  back to the queue with a reset retry count.

## Reconcile rules

- `reconcileMissingTxsWithWriteBatch` (missing = local, not on the
  server): server-fresh tombstone fetch first; skip tombstoned,
  pending-delete, dead-lettered, and marked ids; per-item REST
  fallback for SDK batch failures; per-item re-check after each
  failure.
- Pull merge (`handleManualSyncDown`): a local record is pruned
  ONLY when the transactions snapshot is server-fresh
  (`transactionsFromServer`), the record is absent from it, it has
  no pending upsert, no dead-letter entry, and is not a
  shared-wallet copy. Pruning removes the local delete task and
  marker (the delete elsewhere is confirmed).
- Listener confirmed-missing (same conditions, `fromCache === false`
  and previously confirmed): same prune + task removal.

## What each UI surface shows (truth table)

| Surface | Pending queue items | Dead-letter items | Confirmed |
|---|---|---|---|
| SyncStatusDrawer | amber "Pending" cards + Retry | rose "Failed — will NOT auto-retry" cards + per-item Retry + Retry All Failed | empty state only when queue AND dead-letter AND unconfirmed lists are all empty |
| DatabaseSyncTrackerModal | "missing from cloud" list + single-push (verify-left-queue) | surfaced via the drawer; the modal's retry path feeds the same queue | per-record confirm only when the task left the queue |
| Records balance card | Manual Sync button (v7.6.52): spins + disabled while syncing, signed-in only; same handler as the sync-detail modal | — | — |
| Toasts (`handleManualSyncUp` / `handleFullManualSync` / delete handlers) | pending/failed counts named explicitly; never a bare "synced" while work is unconfirmed | failed count named with a pointer to the sync status view | success toast only when queue and dead-letter are both empty |

## Write-path audit (v7.6.52)

| Path | Goes through the pipeline? | Gate |
|---|---|---|
| `safeSetDoc` | yes — executor + queue on failure | `isDeleteBlocked` refusal |
| `safeDeleteDoc` | yes — durable intent first, then executor | tombstone via `enqueueTxDelete` (own uid) |
| `safeUpdateDoc` | attempt-only (no queue) | `isDeleteBlocked` refusal |
| `syncQueue.enqueue/enqueueBatch` | the pipeline itself | delete-wins dedup incl. tombstone leg |
| `syncDataToCloud` batch + per-doc fallback | no — writeBatch + bounded per-doc `setDoc` (predates the executor); gated instead, and failures enqueue into the pipeline | `isDeleteBlocked` on all loops; fallback enqueue dedup |
| `reconcileMissingTxsWithWriteBatch` | write-batch + executor REST fallback | tombstone fetch gate |
| `DatabaseSyncTrackerModal` single-push / REST fallbacks | single-push via enqueue + processQueue + verify-left-queue | `isDeleteBlocked` gate on REST fallbacks |
| `deleteSharedTxChecked` / shared debt mirrors | caller enqueues shared delete tasks + `safeDeleteDoc` | composite-id delete tasks; executor REST-first for shared txs |
| Listeners / pull merge | read paths; prune only on confirmation | blocked-id skips; unmark guards |

## Offline-first behavior

- Queue, dead-letter list, deletion markers, and the tombstone
  cache are all `localStorage`-persisted (user-scoped keys) and
  survive kill + reopen while offline. Pending items and pending UI
  are intact after a restart; on reconnect the queue converges
  (proven by `src/lib/syncRebuild7652.test.ts`, "restart survival"
  case, against a fake server — see Limitations).
- No write path requires the network to record intent: the task is
  persisted before the first attempt.
- The Firestore SDK's offline persistence (`persistentLocalCache`)
  still exists underneath, but nothing in the app treats an SDK
  local acknowledgement as server confirmation for deletes.

## Limitations (honest)

1. Residual window: if the tombstone write fails AND a stale device
   pushes the record AND the listener/pull has not yet observed the
   delete, the record can briefly reappear. The next sync (tombstone
   fetch, listener, or pull) removes it again. The window needs all
   three failures at once; the delete task itself is unaffected.
2. Collaborator tombstones: a collaborator deleting a shared-wallet
   transaction cannot write a tombstone under the owner's path
   (rules deny it). The shared-copy delete task is the guard there;
   the personal-copy delete is owned by the workspace owner.
3. Non-transaction entities have no tombstones: their cross-device
   delete propagation relies on the listener/pull prune and the
   queue delete tasks, as before — only the delete-wins gating is
   new for them.
4. `processQueue()` has no force option; call sites casting
   `{ force: true }` are no-ops. Retries obey backoff.
5. Not verified live: real devices, real iOS WebKit behavior,
   signed-in Firestore, and the rules emulator (`npm run
   test:rules` needs Java, unavailable here). The rules change is
   covered only by a source-text test. The harness
   (`src/lib/syncRebuild7652.test.ts`) proves the pipeline against
   a fake server; it does not prove the live deployment.
6. The token-refresh / CORS failure seen on 2026-11-26 (VPN /
   extension / DNS environment) is environmental and out of scope:
   no app code can fix the network itself. What v7.6.52 guarantees
   is that work attempted during such an outage is queued durably
   and converges when the network recovers, instead of being lost.
