// [v7.5.89 B3] Pure save-path helpers for ShopsView.handleSaveModal —
// the duplicate-create hard block, the Both-save counterpart lookup,
// the create-then-delete move order, and the shared field shapes for
// the two copies of a Both save.
//
// Pure functions — no Firestore, no auth import — so they are
// unit-testable in the node vitest env. The component wires them to
// safeSetDoc / safeUpdateDoc / safeDeleteDoc and to the
// onAddPrivateShop / onUpdatePrivateShop props; the Firestore calls
// themselves (and their failure toasts) stay in the component.
//
// Name matching everywhere here is the folded name — trim + lowercase
// via normalizeShopName, the same folding the reminders and the
// prefill lookup use — so a record these helpers find is the record
// the save path treats as the same shop.
import { ShopContact, PublicShop } from '../types';
import { normalizeShopName } from './shopDetailsReminders';
import { findShopByName } from './myShops';

/** The form fields ShopsView.handleSaveModal receives from ShopModal. */
export interface ShopFormFields {
  name: string;
  note: string;
  phones: string[];
  addresses: string[];
  stateRegion: string;
  township: string;
  city: string;
  ward: string;
  kpayNumber: string;
  generalNotes: string;
  subCategory: string;
}

/**
 * Duplicate-create hard block: true when a DIFFERENT record with the
 * same folded name already exists in ANY of the given lists (public
 * directory, private list, or both). `excludeId` is the record being
 * edited — a rename that keeps its own name is not a duplicate, and
 * an edit that keeps its own name must never trip the block.
 */
export function isDuplicateShopName(
  name: string,
  lists: readonly (readonly (ShopContact | PublicShop)[])[],
  excludeId?: string
): boolean {
  const key = normalizeShopName(name);
  if (!key) return false;
  return lists.some((list) =>
    list.some(
      (s) =>
        s.id !== excludeId && normalizeShopName(s.name) === key
    )
  );
}

/**
 * Counterpart lookup for an EDIT + Both save: the same shop's record
 * on the OTHER side (public counterpart of a private record, or the
 * private counterpart of a public record). Looked up by the OLD name
 * first — a rename leaves the counterpart under the old name — then
 * by the new name. Returns undefined when the shop exists on one side
 * only; the save then CREATES the counterpart as a copy, including
 * the edited record's menu, so the menu appears on both sides at once.
 */
export function findCounterpartShop<T extends ShopContact | PublicShop>(
  oldName: string,
  newName: string,
  otherSideShops: readonly T[]
): T | undefined {
  return (
    findShopByName(otherSideShops, oldName) ??
    (normalizeShopName(oldName) !== normalizeShopName(newName)
      ? findShopByName(otherSideShops, newName)
      : undefined)
  );
}

/**
 * Create-then-delete move (v7.5.89 B3): creates the copy on the
 * destination side FIRST and deletes the original only after the
 * create landed. Returns `{ moved: false }` when the create fails —
 * the original is untouched, so the modal can stay open for retry
 * without losing anything. When the create succeeded but the delete
 * failed, `{ moved: true, deleteOk: false }`: the move still counts
 * as done (retrying the create would duplicate the copy), and the
 * caller tells the user to remove the leftover original by hand.
 * This replaces the old delete-first public → private move, which
 * lost the menu together with the public doc when the private save
 * failed.
 */
export async function moveWithCreateFirst(
  createCopy: () => Promise<boolean>,
  deleteOriginal: () => Promise<boolean>
): Promise<{ moved: boolean; deleteOk: boolean | null }> {
  const okCreate = await createCopy();
  if (!okCreate) return { moved: false, deleteOk: null };
  const okDelete = await deleteOriginal();
  return { moved: true, deleteOk: okDelete };
}

/**
 * MOVE hard block (v7.5.90 F1): destination-side duplicate check
 * before a create-then-delete move. `destinationShops` is ONLY the
 * list on the side the shop is moving TO — a same folded name there
 * refuses the move (`blocked: true`) and NEITHER callback runs, so
 * nothing is created and nothing is deleted and the modal can stay
 * open. A same-name record on the SOURCE side is the record being
 * moved and must never block itself, so it is never passed here.
 * When the destination is clear this delegates to
 * moveWithCreateFirst unchanged (same create-then-delete order and
 * same `{ moved, deleteOk }` semantics, plus `blocked: false`).
 * The Both-save counterpart creation is NOT a move and never goes
 * through this helper — it keeps creating/updating the counterpart
 * as before.
 */
export async function moveShopWithDestinationCheck(
  name: string,
  destinationShops: readonly (ShopContact | PublicShop)[],
  createCopy: () => Promise<boolean>,
  deleteOriginal: () => Promise<boolean>
): Promise<{ moved: boolean; deleteOk: boolean | null; blocked: boolean }> {
  if (isDuplicateShopName(name, [destinationShops])) {
    return { moved: false, deleteOk: null, blocked: true };
  }
  const result = await moveWithCreateFirst(createCopy, deleteOriginal);
  return { ...result, blocked: false };
}

/**
 * Shared field shape for the PUBLIC copy of a shop. Same content as
 * the private copy (see buildPrivateShopFields) except for the
 * directory-only fields (id / addedBy / addedByUid / createdAt /
 * helpfulCount). `items` is the menu — [] for a brand-new shop, the
 * edited record's items when the copy is made by a Both-save edit.
 */
export function buildPublicShopFields(
  data: ShopFormFields,
  addedBy: string,
  addedByUid: string,
  id: string,
  items: NonNullable<ShopContact['items']>
) {
  return {
    id,
    name: data.name,
    phone: data.phones[0] || '',
    phones: data.phones,
    stateRegion: data.stateRegion,
    township: data.township,
    city: data.city,
    ward: data.ward,
    address: data.addresses[0] || '',
    addresses: data.addresses,
    note: data.note,
    subCategory: data.subCategory,
    addedBy,
    addedByUid,
    createdAt: Date.now(),
    helpfulCount: 0,
    kpayNumber: data.kpayNumber,
    generalNotes: data.generalNotes,
    items,
  };
}

/**
 * Shared field shape for the PRIVATE copy of a shop (the
 * onAddPrivateShop payload). Same content as the public copy, minus
 * the public-only fields. `items` is the menu — [] for a brand-new
 * shop, the edited record's items when the copy is made by a
 * Both-save edit.
 */
export function buildPrivateShopFields(
  data: ShopFormFields,
  items: NonNullable<ShopContact['items']>
) {
  return {
    name: data.name,
    phone: data.phones[0] || '',
    phones: data.phones,
    address: data.addresses[0] || '',
    addresses: data.addresses,
    note: data.note,
    subCategory: data.subCategory,
    stateRegion: data.stateRegion,
    township: data.township,
    city: data.city,
    ward: data.ward,
    kpayNumber: data.kpayNumber,
    generalNotes: data.generalNotes,
    items,
  };
}

/**
 * Non-menu field updates for an existing record on the other side of
 * a Both-save edit. Deliberately has NO `items` key: the counterpart
 * keeps ITS OWN menu (a public counterpart's menu and a private
 * counterpart's menu diverge by default — later edits of one copy do
 * not change the other). For a public counterpart this object goes
 * straight to safeUpdateDoc; for a private counterpart it is spread
 * over the counterpart record, which likewise keeps its items.
 */
export function buildCounterpartUpdateFields(data: ShopFormFields) {
  return {
    name: data.name,
    phone: data.phones[0] || '',
    phones: data.phones,
    address: data.addresses[0] || '',
    addresses: data.addresses,
    note: data.note,
    subCategory: data.subCategory,
    stateRegion: data.stateRegion,
    township: data.township,
    city: data.city,
    ward: data.ward,
    kpayNumber: data.kpayNumber,
    generalNotes: data.generalNotes,
  };
}
