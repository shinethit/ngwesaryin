// [v7.6.34] Failed fetch vs genuinely empty collection.
//
// pullDataFromCloud fetches every collection server-first with a
// local fallback; when BOTH fail the snapshot is null. A null
// snapshot must NEVER flow into the merge as an empty list: the
// merge is additive, but the pull's caller also maintains
// bookkeeping (e.g. the confirmed-ids set) from the returned
// lists, and a future replace-style caller would wipe state and
// mirrors outright. This helper makes the distinction explicit
// at the single place the pull shapes its result:
//
// - snap === null (fetch failed)  -> undefined: the caller skips
//   the collection entirely; existing state and mirrors are kept.
// - snap !== null (fetch succeeded) -> the docs, even when the
//   collection is genuinely empty ([]) — the empty result is real
//   and flows through exactly as before.
//
// No behavior change while online: successful fetches return the
// same lists as before. Offline, a failed pull is a no-op instead
// of an empty result.
export function pullCollection<T>(snap: unknown, docs: T[]): T[] | undefined {
  return snap ? docs : undefined;
}
