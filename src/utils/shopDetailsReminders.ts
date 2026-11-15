// [v7.5.78 C] "Fill in this shop's details later" reminders.
//
// When a transaction is saved with a shop name that has no shop record
// with details yet, the TransactionModal asks whether to fill the details
// now. "Later" stores ONE reminder per shop name here (localStorage, so
// it survives reloads) until the shop's details are filled (a shop save
// with that name resolves it) or the user dismisses the notification.
//
// The store is deliberately tiny and follows the read-notifications
// pattern (App keeps `ngwe_read_notifications` the same way). It reads
// `window.localStorage` lazily instead of importing utils/storage — the
// app monkey-patches localStorage for per-user scoping, so the scoped
// behaviour is identical, and this keeps the module importable in the
// node vitest environment (storage.ts touches bare `localStorage` at
// import time).
import { useEffect, useState } from 'react';

export const SHOP_DETAIL_REMINDERS_KEY = 'ngwe_shop_detail_reminders';
// [v7.5.91 D3] "Not now" dismissals — names the user asked never to be
// prompted about again. Same lazy-localStorage pattern as the reminders
// store above; a dismissal is cleared when the shop's details are
// filled (same save paths that resolve reminders).
export const SHOP_DETAIL_DISMISSED_KEY = 'ngwe_shop_detail_dismissed';
// Fired (same-tab) after every dismissal add/clear so the prompt check
// (which reads the dismissed set) stays fresh without a reload.
export const SHOP_DISMISSED_CHANGED_EVENT = 'ngwe:shop-dismissed-changed';
// [v7.5.91 D2] Deep-link event — the floating-bar Shops badge dispatches
// it, ShopsView listens and turns the needs-details filter ON.
export const OPEN_SHOPS_NEEDS_DETAILS_EVENT = 'ngwe:open-shops-needs-details';
// Fired (same-tab) after every add/resolve so the bell badge, the
// NotificationModal and the Sidebar badge refresh without a reload.
export const SHOP_REMINDERS_CHANGED_EVENT = 'ngwe:shop-reminders-changed';
// [v7.5.78 C] Deep-link event — same pattern as `ngwe:search-seed`:
// the TransactionModal / NotificationModal dispatch it, ShopsView
// listens and opens the ShopModal pre-filled with the name.
export const OPEN_SHOP_FORM_EVENT = 'ngwe:open-shop-form';

// [v7.5.90 F2] Details-saved event — same pattern as
// `ngwe:open-shop-form`: ShopsView dispatches it after a SUCCESSFUL
// ShopModal save (never on a failed save — the modal stays open
// then), and App listens so a stashed menu candidate can follow a
// rename: the stash still carries the name the form was OPENED with,
// the shop now exists only under the SAVED name, and without this
// the stash retry would never resolve.
export const SHOP_DETAILS_SAVED_EVENT = 'ngwe:shop-details-saved';

/** Payload of `ngwe:shop-details-saved`. */
export interface ShopDetailsSavedDetail {
  /** Name the form was opened with (`editingShop.name` before save,
   *  or the prefill name for a new shop). Undefined for a plain
   *  "+ Add Shop" create, which has no opening name. */
  oldName?: string;
  /** Name the shop was saved under. */
  savedName: string;
  /** Saved record's id when ShopsView knows it: public creates /
   *  edits / moves mint or keep it locally. Undefined for private
   *  creates and public → private moves — App mints the private id
   *  (useDataHandlers.handleAddShop) and only returns a boolean, so
   *  the id is not visible here; the listener still rewrites the
   *  stash by NAME, which is what the rename fix needs. */
  shopId?: string;
  /** Which side the saved record landed on. */
  isPublic: boolean;
}

/** Dispatch `ngwe:shop-details-saved` (same guard pattern as
 *  dispatchOpenShopForm below). */
export function dispatchShopDetailsSaved(detail: ShopDetailsSavedDetail): void {
  try {
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent(SHOP_DETAILS_SAVED_EVENT, { detail }));
    }
  } catch {
    /* ignore */
  }
}

export interface ShopDetailReminder {
  id: string;
  shopName: string;
  /** normalized name (trim + lowercase) — the dedupe key. */
  key: string;
  createdAt: number;
}

/** Myanmar digits → Latin, mirroring normalizeItemName
 *  (itemIntelligence.ts:25-28). Kept local — importing
 *  itemIntelligence would pull heavier deps into this tiny module,
 *  which must stay importable in the node vitest env. */
const MYANMAR_DIGITS: Record<string, string> = {
  '၀': '0', '၁': '1', '၂': '2', '၃': '3', '၄': '4',
  '၅': '5', '၆': '6', '၇': '7', '၈': '8', '၉': '9',
};

/** The app's shop-name rule: trim, fold Myanmar digits to Latin,
 *  case-insensitive, internal whitespace runs collapsed to one space.
 *  [v7.5.89 A3] '၇' vs '7' and 'a  b' vs 'a b' are the SAME shop.
 *  (TransactionModal `isNewShopName` / ShopModal duplicate check use
 *  their own inline trim+lowercase — this is the shared util rule.) */
export function normalizeShopName(name: string): string {
  return (name || '')
    .replace(/[၀-၉]/g, (d) => MYANMAR_DIGITS[d] ?? d)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/** Notification-centre id for a reminder — shared with App's bell
 *  badge so "mark as read" and the badge agree. */
export function shopReminderId(key: string): string {
  return `notif_shop_${key}`;
}

function readRaw(key: string): string | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeRaw(key: string, value: string): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(key, value);
  } catch {
    /* storage full / private mode — the reminder is best-effort */
  }
}

function notifyChanged(): void {
  try {
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent(SHOP_REMINDERS_CHANGED_EVENT));
    }
  } catch {
    /* ignore */
  }
}

export function loadShopDetailReminders(): ShopDetailReminder[] {
  try {
    const raw = readRaw(SHOP_DETAIL_REMINDERS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const valid = parsed.filter(
      (r): r is ShopDetailReminder =>
        !!r && typeof (r as ShopDetailReminder).shopName === 'string' && typeof (r as ShopDetailReminder).key === 'string'
    );
    // [v7.5.89 A3] MIGRATION — normalizeShopName now folds Myanmar
    // digits and collapses whitespace, so a reminder stored under the
    // old rule (key 'shop ၇') would never match its new key ('shop 7')
    // and would sit uncleared forever. Re-key every stored reminder
    // through the new normalizer and dedupe by key, keeping the
    // EARLIEST createdAt (and that entry's display name). Persists
    // only when something actually changed, so a migrated store is
    // not rewritten on every load.
    let changed = false;
    const byKey = new Map<string, ShopDetailReminder>();
    for (const r of valid) {
      const key = normalizeShopName(r.shopName);
      if (!key) {
        changed = true;
        continue;
      }
      const id = shopReminderId(key);
      const existing = byKey.get(key);
      if (existing) {
        changed = true;
        if (r.createdAt < existing.createdAt) {
          byKey.set(key, { id, shopName: r.shopName, key, createdAt: r.createdAt });
        }
        continue;
      }
      if (r.key !== key || r.id !== id) changed = true;
      byKey.set(key, { id, shopName: r.shopName, key, createdAt: r.createdAt });
    }
    const migrated = [...byKey.values()];
    if (changed) {
      // Direct write, no change event: the caller already receives
      // the migrated list, and a re-load now finds nothing to migrate.
      writeRaw(SHOP_DETAIL_REMINDERS_KEY, JSON.stringify(migrated));
    }
    return migrated;
  } catch {
    return [];
  }
}

function persistShopDetailReminders(list: ShopDetailReminder[]): void {
  writeRaw(SHOP_DETAIL_REMINDERS_KEY, JSON.stringify(list));
  notifyChanged();
}

/**
 * Add a reminder for a shop name. DEDUPED by normalized name — a second
 * "Later" for the same shop is a no-op ({ added: false }).
 */
export function addShopDetailReminder(shopName: string): { added: boolean; reminders: ShopDetailReminder[] } {
  const name = (shopName || '').trim();
  const key = normalizeShopName(name);
  if (!key) return { added: false, reminders: loadShopDetailReminders() };
  const current = loadShopDetailReminders();
  if (current.some((r) => r.key === key)) return { added: false, reminders: current };
  const next = [...current, { id: shopReminderId(key), shopName: name, key, createdAt: Date.now() }];
  persistShopDetailReminders(next);
  return { added: true, reminders: next };
}

/** Remove the reminder for a shop name (details filled / shop deleted).
 *  Returns true when a reminder was actually removed. */
export function resolveShopDetailReminder(shopName: string): boolean {
  const key = normalizeShopName(shopName);
  if (!key) return false;
  const current = loadShopDetailReminders();
  const next = current.filter((r) => r.key !== key);
  if (next.length === current.length) return false;
  persistShopDetailReminders(next);
  return true;
}

export function hasShopDetailReminder(shopName: string): boolean {
  const key = normalizeShopName(shopName);
  if (!key) return false;
  return loadShopDetailReminders().some((r) => r.key === key);
}

// ---------------------------------------------------------------------
// [v7.5.91 D3] Dismissals ("လောလောဆယ် မဖြည့်သေးပါ" / Not now).
// Later = remind me (a reminder: badge + notifications). Not now =
// stop asking: the reminder is removed AND the name is recorded here
// so future saves with that shop do NOT re-prompt. The filter and the
// card marker IGNORE dismissal — they are computed from shop DATA, so
// a dismissed shop still shows in the filter with its marker and can
// be filled later from there. Filling details clears the dismissal
// (same save paths that resolve reminders).
// ---------------------------------------------------------------------

export interface ShopDetailDismissal {
  /** normalized name (trim + lowercase + digit-folded) — the dedupe key. */
  key: string;
  shopName: string;
  dismissedAt: number;
}

function notifyDismissedChanged(): void {
  try {
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent(SHOP_DISMISSED_CHANGED_EVENT));
    }
  } catch {
    /* ignore */
  }
}

export function loadShopDetailDismissals(): ShopDetailDismissal[] {
  try {
    const raw = readRaw(SHOP_DETAIL_DISMISSED_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const byKey = new Map<string, ShopDetailDismissal>();
    let changed = false;
    for (const r of parsed) {
      if (!r || typeof (r as ShopDetailDismissal).shopName !== 'string') {
        changed = true;
        continue;
      }
      const key = normalizeShopName((r as ShopDetailDismissal).shopName);
      if (!key) {
        changed = true;
        continue;
      }
      const existing = byKey.get(key);
      if (existing) {
        changed = true;
        if ((r as ShopDetailDismissal).dismissedAt < existing.dismissedAt) {
          byKey.set(key, { key, shopName: (r as ShopDetailDismissal).shopName, dismissedAt: (r as ShopDetailDismissal).dismissedAt });
        }
        continue;
      }
      if ((r as ShopDetailDismissal).key !== key) changed = true;
      byKey.set(key, {
        key,
        shopName: (r as ShopDetailDismissal).shopName,
        dismissedAt: typeof (r as ShopDetailDismissal).dismissedAt === 'number' ? (r as ShopDetailDismissal).dismissedAt : Date.now(),
      });
    }
    const list = [...byKey.values()];
    if (changed) writeRaw(SHOP_DETAIL_DISMISSED_KEY, JSON.stringify(list));
    return list;
  } catch {
    return [];
  }
}

/** Folded-name keys of all dismissals — the shape the prompt check takes. */
export function loadShopDetailDismissedKeys(): Set<string> {
  return new Set(loadShopDetailDismissals().map((d) => d.key));
}

function persistShopDetailDismissals(list: ShopDetailDismissal[]): void {
  writeRaw(SHOP_DETAIL_DISMISSED_KEY, JSON.stringify(list));
  notifyDismissedChanged();
}

/**
 * Dismiss a shop: remove its reminder (if present) AND record the name
 * so future saves do NOT re-prompt. Returns true when a dismissal was
 * newly recorded.
 */
export function dismissShopDetailReminder(shopName: string): boolean {
  const name = (shopName || '').trim();
  const key = normalizeShopName(name);
  if (!key) return false;
  // The reminder goes away with the dismissal — the badge drops at once.
  resolveShopDetailReminder(name);
  const current = loadShopDetailDismissals();
  if (current.some((d) => d.key === key)) return false;
  persistShopDetailDismissals([...current, { key, shopName: name, dismissedAt: Date.now() }]);
  return true;
}

export function isShopDetailDismissed(shopName: string, dismissed?: Set<string> | string[] | ShopDetailDismissal[]): boolean {
  const key = normalizeShopName(shopName);
  if (!key) return false;
  if (!dismissed) return loadShopDetailDismissals().some((d) => d.key === key);
  if (dismissed instanceof Set) return dismissed.has(key);
  return dismissed.some((d) => (typeof d === 'string' ? normalizeShopName(d) : d.key) === key);
}

/** Filling details clears the dismissal (same paths as resolve). */
export function clearShopDetailDismissal(shopName: string): boolean {
  const key = normalizeShopName(shopName);
  if (!key) return false;
  const current = loadShopDetailDismissals();
  const next = current.filter((d) => d.key !== key);
  if (next.length === current.length) return false;
  persistShopDetailDismissals(next);
  return true;
}

// ---------------------------------------------------------------------
// Matching: does this shop name still need its details filled?
// ---------------------------------------------------------------------

/** [v7.5.91 D1] A directory record "has details" FOR THE PROMPT
 *  when it carries a real way to reach / find the shop — a phone or an
 *  address ONLY. [v7.5.89 A2] Region / township / city / ward /
 *  subCategory / KPay number / general notes alone do NOT count, and
 *  `note` is deliberately EXCLUDED: ShopModal stores the shop CATEGORY
 *  in `note` (default "grocery"), so every form-saved shop has a note
 *  even with nothing else filled — it proves nothing. [v7.5.91 D1]
 *  `items` (priced menu items) NO LONGER count: a shop with a menu but
 *  no phone/address is NOT filled — it prompts on the next save,
 *  appears in the needs-details filter, and carries the card marker.
 *  One source of truth: the prompt check, the card marker and the
 *  filter all read this helper. */
export interface ShopDetailsLike {
  phone?: string;
  phones?: string[];
  address?: string;
  addresses?: string[];
  subCategory?: string;
  stateRegion?: string;
  township?: string;
  city?: string;
  ward?: string;
  kpayNumber?: string;
  generalNotes?: string;
  items?: unknown[];
}

export function shopHasDetails(shop: ShopDetailsLike | null | undefined): boolean {
  if (!shop) return false;
  const nonEmpty = (v?: string) => !!v && v.trim().length > 0;
  if (nonEmpty(shop.phone) || nonEmpty(shop.address)) return true;
  if ((shop.phones || []).some((p) => nonEmpty(p))) return true;
  if ((shop.addresses || []).some((a) => nonEmpty(a))) return true;
  return false;
}

/** Shops in a list that still need details (D1 definition) — the D4
 *  filter's helper, so the filter is unit-testable without a view. */
export function filterShopsNeedingDetails<T extends ShopDetailsLike>(shops: T[]): T[] {
  return (shops || []).filter((s) => !shopHasDetails(s));
}

/** Pure re-validation (D1): drop reminders whose shop NOW has details
 *  (folded-name match, either list). Menu-only no longer counts, so a
 *  reminder for a menu-only shop is KEPT. */
export function filterStaleShopDetailReminders(
  reminders: ShopDetailReminder[],
  shops: ({ name: string } & ShopDetailsLike)[]
): ShopDetailReminder[] {
  const byKey = new Map<string, ShopDetailsLike>();
  for (const s of shops || []) {
    const key = normalizeShopName(s.name);
    if (key && !byKey.has(key)) byKey.set(key, s);
  }
  return (reminders || []).filter((r) => {
    const shop = byKey.get(r.key);
    return !shop || !shopHasDetails(shop);
  });
}

/**
 * Load-time sweep (D1): persist the re-validated reminder list, dropping
 * reminders whose shop now has details — without the user opening
 * anything. Only writes when something actually dropped.
 */
export function pruneShopDetailReminders(
  shops: ({ name: string } & ShopDetailsLike)[]
): ShopDetailReminder[] {
  const current = loadShopDetailReminders();
  const kept = filterStaleShopDetailReminders(current, shops);
  if (kept.length !== current.length) persistShopDetailReminders(kept);
  return kept;
}

/**
 * True when the shop name needs the "fill in details now?" prompt:
 * no PRIVATE shop with that name HAS details and no PUBLIC shop with
 * that name HAS details, and the name is not dismissed.
 * [v7.5.91 D1] The private side is no longer name-only: a private
 * record WITHOUT details does NOT suppress — the prompt fires, and its
 * fill flow opens THAT record for editing (v7.5.89 prefill). The old
 * justification ("a private record always went through the ShopModal,
 * which requires region + township, so it always carries details") is
 * wrong under the D1 definition: region + township are NOT details.
 * [v7.5.91 D3] `dismissed` is the folded-name set from
 * loadShopDetailDismissedKeys() — a dismissed name never prompts.
 */
export function isShopNameNeedingDetails(
  shopName: string,
  privateShops: ({ name: string } & ShopDetailsLike)[],
  publicShops: ({ name: string } & ShopDetailsLike)[],
  dismissed?: Set<string> | string[]
): boolean {
  const key = normalizeShopName(shopName);
  if (!key) return false;
  if (dismissed) {
    const has = dismissed instanceof Set ? dismissed.has(key) : dismissed.some((d) => normalizeShopName(d) === key);
    if (has) return false;
  }
  if ((privateShops || []).some((s) => normalizeShopName(s.name) === key && shopHasDetails(s))) return false;
  if ((publicShops || []).some((s) => normalizeShopName(s.name) === key && shopHasDetails(s))) return false;
  return true;
}

/** Ask ShopsView to open the ShopModal pre-filled with this shop name
 *  (listener lives in ShopsView — see the v7.5.78 wiring note). */
export function dispatchOpenShopForm(shopName: string): void {
  try {
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent(OPEN_SHOP_FORM_EVENT, { detail: { shopName: (shopName || '').trim() } }));
    }
  } catch {
    /* ignore */
  }
}

/** [v7.5.91 D2] Ask ShopsView to turn the needs-details filter ON
 *  (listener lives in ShopsView). Dispatched by the floating-bar Shops
 *  badge tap; the caller switches to the Shops tab itself. */
export function dispatchOpenShopsNeedsDetails(): void {
  try {
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent(OPEN_SHOPS_NEEDS_DETAILS_EVENT));
    }
  } catch {
    /* ignore */
  }
}

/** Live list of reminders — re-reads on every change event so the bell
 *  badge, NotificationModal and Sidebar badge stay in sync. */
export function useShopDetailReminders(): ShopDetailReminder[] {
  const [reminders, setReminders] = useState<ShopDetailReminder[]>(() => loadShopDetailReminders());
  useEffect(() => {
    const refresh = () => setReminders(loadShopDetailReminders());
    refresh();
    window.addEventListener(SHOP_REMINDERS_CHANGED_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(SHOP_REMINDERS_CHANGED_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);
  return reminders;
}
