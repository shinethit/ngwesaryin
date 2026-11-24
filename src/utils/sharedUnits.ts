// [v7.6.24] Shared custom units — the unit a user types once
// appears as a select option for EVERYONE (the same account on
// another device AND different accounts), like the Public shop
// list. Collection: `public_units`. One doc per normalized unit
// value (deterministic doc id = the dedupe, so a re-publish of the
// same unit overwrites the same doc); units are immutable shared
// facts — there is no owner-update path and no delete UI.
//
// Until v7.6.24 the custom-unit list lived ONLY in localStorage
// (`ngwe_custom_units` via usePersistedState: localStorage + a
// same-tab broadcast, no cloud sync), so a unit typed on one device
// never appeared anywhere else. The select helpers already
// anticipated this ('a custom unit from elsewhere (e.g. another
// device)' in resolveMenuUnitSelectValue) but only fell back to
// 'အခြား' + prefilled text — the unit never became an OPTION.
// Now the options merge the local list with this shared list.
//
// The Firestore store is injected so the logic is unit-testable
// without live Firestore; the default store is built lazily
// (dynamic import) so importing this module never pulls in
// firebase.ts — tests pass a stub store and never touch the
// network. Same pattern as shopPriceAlerts.ts (v7.5.82).
// Timestamps are `Date.now()` NUMBERS — never serverTimestamp()
// via the safe* wrappers (cleanForFirestore corrupts FieldValue
// sentinels; see AGENTS.md v7.5.64 lesson).

import { isCustomMenuUnit, normalizeMenuUnit, SHOP_MENU_UNITS } from './shopMenuUpdate';

export const SHARED_UNITS_COLLECTION = 'public_units';

/** One shared-unit doc: the normalized value is the fact; the
 * writer's uid/name and the publish time are provenance only. */
export interface SharedUnitDoc {
  value: string;
  addedByUid: string;
  addedBy?: string;
  createdAt: number;
}

/**
 * Merge the device-local custom list with the shared list into the
 * ONE list the select helpers receive. Shared units come first
 * (they are the canonical list every device sees); local-only units
 * (typed offline, unpublished, or written by a guest) append after.
 * Every entry is normalized (a leading Myanmar number word is
 * stripped), empties and preset values are dropped, duplicates
 * collapse — the options builder dedupes again, so this stays
 * correct even if a unit sits in both lists.
 */
export function mergeSharedUnits(localCustoms: string[], sharedUnits: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (raw: unknown) => {
    if (typeof raw !== 'string') return;
    const normalized = normalizeMenuUnit(raw.trim());
    if (!normalized) return;
    if (SHOP_MENU_UNITS.some((u) => u.value === normalized)) return;
    if (seen.has(normalized)) return;
    seen.add(normalized);
    out.push(normalized);
  };
  for (const u of sharedUnits || []) push(u);
  for (const u of localCustoms || []) push(u);
  return out;
}

/**
 * Values read from `public_units` docs → the shared list: normalize
 * each string value, drop empties, dedupe, keep first-seen order.
 * Non-string values are ignored (a malformed doc must never break
 * the listener). Preset values survive here and are dropped by
 * mergeSharedUnits, which owns the preset rule.
 */
export function collectSharedUnits(values: unknown[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of values || []) {
    if (typeof raw !== 'string') continue;
    const trimmed = raw.trim();
    if (trimmed === '') continue; // blank raw strings must not normalize into the default preset
    const normalized = normalizeMenuUnit(trimmed);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
}

/**
 * Deterministic doc id for a unit: encodeURIComponent of the
 * NORMALIZED value — encodeURIComponent encodes '/' as '%2F', so a
 * '/' in a unit can never create a sub-path (same convention as
 * buildShopPriceAlertId). Normalizing first means 'တစ်ဗူး' and
 * 'ဗူး' share ONE doc.
 */
export function encodeSharedUnitId(value: string): string {
  return encodeURIComponent(normalizeMenuUnit(value));
}

/** Pure doc builder — the exact shape written to `public_units`. */
export function buildSharedUnitDoc(
  value: string,
  addedByUid: string,
  addedBy: string | undefined,
  createdAt: number,
): SharedUnitDoc {
  const doc: SharedUnitDoc = {
    value: normalizeMenuUnit(value),
    addedByUid,
    createdAt,
  };
  if (addedBy) doc.addedBy = addedBy;
  return doc;
}

// ---------------------------------------------------------------------------
// Publish. The Firestore store is injected so the logic is
// unit-testable without live Firestore (same pattern as
// shopPriceAlerts.ts).
// ---------------------------------------------------------------------------

export interface SharedUnitStore {
  /** Writes the unit doc at the deterministic id (merge). False on failure. */
  writeUnit: (id: string, data: SharedUnitDoc) => Promise<boolean>;
}

async function defaultSharedUnitStore(): Promise<SharedUnitStore> {
  const [{ db, safeSetDoc }, firestore] = await Promise.all([
    import('../lib/firebase'),
    import('firebase/firestore'),
  ]);
  const { doc } = firestore;
  return {
    writeUnit: async (id, data) => {
      // safeSetDoc accepts merge options (firebase.ts) and its
      // boolean return is the truth. Merge + the full doc means a
      // re-publish of an already-shared unit is evaluated as an
      // UPDATE, which the rules reserve to admins — it fails
      // silently and harmlessly (the value is already there). The
      // doc holds only strings/numbers — no FieldValue sentinels —
      // so cleanForFirestore cannot corrupt anything here.
      return safeSetDoc(doc(db, SHARED_UNITS_COLLECTION, id), data, { merge: true });
    },
  };
}

/**
 * Publish custom units to the shared `public_units` collection so
 * they appear as select options for everyone. Fire-and-forget: it
 * NEVER throws and NEVER shows UI — callers must not await it and
 * must not gate a save on it. No-op without a uid (guests and
 * signed-out users keep the local-only list) or when nothing
 * custom remains after normalization (presets are never published).
 * One failed unit must not block the rest.
 */
export async function publishSharedUnits(
  units: (string | undefined)[],
  uid: string | undefined | null,
  addedBy?: string,
  store?: SharedUnitStore,
): Promise<void> {
  try {
    if (!uid) return;
    const customs: string[] = [];
    for (const raw of units || []) {
      if (!isCustomMenuUnit(raw)) continue;
      const normalized = normalizeMenuUnit((raw as string).trim());
      if (!customs.includes(normalized)) customs.push(normalized);
    }
    if (customs.length === 0) return;
    const s = store ?? (await defaultSharedUnitStore());
    const now = Date.now();
    for (const value of customs) {
      try {
        await s.writeUnit(encodeSharedUnitId(value), buildSharedUnitDoc(value, uid, addedBy, now));
      } catch {
        // One failed unit must not block the rest — the local list
        // still has it, and it is re-published on the next save.
      }
    }
  } catch (err) {
    console.warn('[sharedUnits] publish failed:', err);
  }
}
