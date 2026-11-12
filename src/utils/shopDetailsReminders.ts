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
// Fired (same-tab) after every add/resolve so the bell badge, the
// NotificationModal and the Sidebar badge refresh without a reload.
export const SHOP_REMINDERS_CHANGED_EVENT = 'ngwe:shop-reminders-changed';
// [v7.5.78 C] Deep-link event — same pattern as `ngwe:search-seed`:
// the TransactionModal / NotificationModal dispatch it, ShopsView
// listens and opens the ShopModal pre-filled with the name.
export const OPEN_SHOP_FORM_EVENT = 'ngwe:open-shop-form';

export interface ShopDetailReminder {
  id: string;
  shopName: string;
  /** normalized name (trim + lowercase) — the dedupe key. */
  key: string;
  createdAt: number;
}

/** The app's existing shop-name rule (TransactionModal `isNewShopName`,
 *  ShopModal duplicate check): trim, then case-insensitive compare. */
export function normalizeShopName(name: string): string {
  return (name || '').trim().toLowerCase();
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
    return parsed.filter(
      (r): r is ShopDetailReminder =>
        !!r && typeof (r as ShopDetailReminder).shopName === 'string' && typeof (r as ShopDetailReminder).key === 'string'
    );
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
// Matching: does this shop name still need its details filled?
// ---------------------------------------------------------------------

/** A directory record "has details" when any real contact/location
 *  field is filled. `note` is deliberately EXCLUDED: ShopModal stores
 *  the shop CATEGORY in `note` (default "grocery"), so every form-saved
 *  shop has a note even with nothing else filled — it proves nothing.
 *  `items` (priced items) also count as details. */
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
  if (
    nonEmpty(shop.phone) ||
    nonEmpty(shop.address) ||
    nonEmpty(shop.subCategory) ||
    nonEmpty(shop.stateRegion) ||
    nonEmpty(shop.township) ||
    nonEmpty(shop.city) ||
    nonEmpty(shop.ward) ||
    nonEmpty(shop.kpayNumber) ||
    nonEmpty(shop.generalNotes)
  ) {
    return true;
  }
  if ((shop.phones || []).some((p) => nonEmpty(p))) return true;
  if ((shop.addresses || []).some((a) => nonEmpty(a))) return true;
  if ((shop.items || []).length > 0) return true;
  return false;
}

/**
 * True when the shop name needs the "fill in details now?" prompt:
 * no PRIVATE shop with that name exists (a private record always went
 * through the ShopModal, which requires region + township, so it
 * always carries details) and no PUBLIC shop with that name HAS
 * details (a name-only public stub — auto-published from a transaction
 * with the opt-in ticked — does NOT suppress the prompt).
 */
export function isShopNameNeedingDetails(
  shopName: string,
  privateShops: { name: string }[],
  publicShops: ({ name: string } & ShopDetailsLike)[]
): boolean {
  const key = normalizeShopName(shopName);
  if (!key) return false;
  if ((privateShops || []).some((s) => normalizeShopName(s.name) === key)) return false;
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
