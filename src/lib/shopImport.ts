// [v7.5.71] Shop import helpers — pure functions (no Firestore, no React),
// so they can be unit-tested without a Firebase connection. The Admin
// Panel file picker reads a JSON file, these functions validate + map it,
// and AdminPanel writes the mapped rows to public_shops in batches.
import type { PublicShop } from '../types';

export const MYANMAR_DIGITS: Record<string, string> = {
  '၀': '0',
  '၁': '1',
  '၂': '2',
  '၃': '3',
  '၄': '4',
  '၅': '5',
  '၆': '6',
  '၇': '7',
  '၈': '8',
  '၉': '9',
};

// A raw row from the import file. Only `name` is required; everything
// else is optional and read defensively by mapShopRow.
export interface ValidShopRow {
  id?: string;
  name: string;
  [key: string]: unknown;
}

export type InvalidShopReason = 'not-object' | 'missing-name';

export interface InvalidShopRow {
  index: number;
  reason: InvalidShopReason;
}

export interface ShopImportPreview {
  total: number;
  valid: ValidShopRow[];
  invalid: InvalidShopRow[];
  byRegion: { region: string; count: number }[];
}

// Normalize a phone to digits only (Myanmar digits 0-9 first), so
// '09 123' and '၀၉၁၂၃' dedupe to the same key.
export function normalizePhone(phone: string): string {
  const latin = (phone || '').replace(/[၀-၉]/g, (d) => MYANMAR_DIGITS[d] || d);
  return latin.replace(/\D/g, '');
}

// Dedupe key for a shop: normalized name + normalized first phone.
// Returns null when there is no phone — with no discriminator at all
// there is no key, so the row is not deduped by name/phone (the id
// check still applies).
export function shopDedupeKey(name: string, phone: string): string | null {
  const digits = normalizePhone(phone);
  if (!digits) return null;
  return (name || '').trim().toLowerCase() + '|' + digits;
}

function asStr(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function asStrArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const v of value) {
    if (typeof v === 'string' && v.trim()) out.push(v.trim());
  }
  return out;
}

// First phone of a row: first entry of phones, else the legacy phone.
export function firstPhoneOf(row: { [key: string]: unknown }): string {
  const phones = asStrArray(row.phones);
  if (phones.length > 0) return phones[0];
  return asStr(row.phone);
}

// Parse the file text: must be a JSON array. Throws on bad JSON or a
// non-array top level; the caller shows a fixed message for that.
export function parseShopImportFile(text: string): unknown[] {
  const parsed: unknown = JSON.parse(text);
  if (!Array.isArray(parsed)) {
    throw new Error('Shop import file must contain a JSON array.');
  }
  return parsed;
}

// Validate rows: a row is valid when it is an object with a non-empty
// string name. Invalid rows are reported with their index + reason.
export function validateShopRows(rows: unknown[]): { valid: ValidShopRow[]; invalid: InvalidShopRow[] } {
  const valid: ValidShopRow[] = [];
  const invalid: InvalidShopRow[] = [];
  rows.forEach((row, index) => {
    if (!row || typeof row !== 'object' || Array.isArray(row)) {
      invalid.push({ index, reason: 'not-object' });
      return;
    }
    const name = asStr((row as Record<string, unknown>).name);
    if (!name) {
      invalid.push({ index, reason: 'missing-name' });
      return;
    }
    valid.push({ ...(row as Record<string, unknown>), name });
  });
  return { valid, invalid };
}

// Build the import preview: valid/invalid rows + a per-region breakdown
// (top 5 regions by count) for the preview card.
export function previewShopImport(rows: unknown[]): ShopImportPreview {
  const { valid, invalid } = validateShopRows(rows);
  const counts = new Map<string, number>();
  for (const row of valid) {
    const region = asStr(row.stateRegion) || asStr(row.city) || '—';
    counts.set(region, (counts.get(region) || 0) + 1);
  }
  const byRegion = Array.from(counts.entries())
    .map(([region, count]) => ({ region, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  return { total: rows.length, valid, invalid, byRegion };
}

interface ShopItemEntry {
  name: string;
  price: number;
  updatedAt: number;
  addedBy?: string;
}

// Keep only well-formed price items; a malformed entry is dropped
// instead of writing garbage into the shop document.
function asShopItems(value: unknown, fallbackUpdatedAt: number): ShopItemEntry[] {
  if (!Array.isArray(value)) return [];
  const out: ShopItemEntry[] = [];
  for (const it of value) {
    if (!it || typeof it !== 'object' || Array.isArray(it)) continue;
    const rec = it as Record<string, unknown>;
    if (typeof rec.name !== 'string' || !rec.name.trim()) continue;
    if (typeof rec.price !== 'number' || !Number.isFinite(rec.price)) continue;
    const entry: ShopItemEntry = {
      name: rec.name.trim(),
      price: rec.price,
      updatedAt: typeof rec.updatedAt === 'number' ? rec.updatedAt : fallbackUpdatedAt,
    };
    if (typeof rec.addedBy === 'string' && rec.addedBy.trim()) entry.addedBy = rec.addedBy.trim();
    out.push(entry);
  }
  return out;
}

// [v7.5.72] sm3 subCategory → preset note value. The 874 sm3 shops all
// arrive with note='other' and their real type only in subCategory, so
// map it at import time or they would all pile under 'Other' in
// ShopsView. Matched case-insensitively after trimming; a combined
// subCategory ('A; B') maps on its first segment. Anything else keeps
// the file's note ('other').
export const SM3_SUBCATEGORY_TO_NOTE: Record<string, string> = {
  'car rental service': 'car-rental',
  'real estate': 'real-estate',
  'advertising agency': 'advertising',
  'oversea employment service': 'oversea-employment',
  'insurance agent': 'insurance',
  'local employment service': 'local-employment',
  'seaman & shipping employment service': 'seaman-shipping',
  'general services': 'general-services',
  'custom clearance agents': 'custom-clearance',
};

// The preset note value for a subCategory, or null when it is not one
// of the 9 sm3 types.
export function sm3NoteForSubCategory(subCategory: string): string | null {
  const first = (subCategory || '').split(';')[0].trim().toLowerCase();
  return SM3_SUBCATEGORY_TO_NOTE[first] || null;
}

// Map one validated row to the exact public_shops document data.
// addedBy / addedByUid / createdAt always come from the signed-in admin
// at import time — never from the file. Source-only extras (sm3_id,
// sm3_url, facebook, website, email, latitude, longitude) are stripped
// from the stored doc; website/email are appended to generalNotes so the
// contact info is kept. Returned as a plain record so it can be passed
// straight to a Firestore batch set() call.
export function mapShopRow(
  row: ValidShopRow,
  meta: { id: string; addedBy: string; addedByUid: string; createdAt: number }
): Record<string, unknown> {
  const phones = asStrArray(row.phones);
  if (phones.length === 0) {
    const single = asStr(row.phone);
    if (single) phones.push(single);
  }
  const addresses = asStrArray(row.addresses);
  if (addresses.length === 0) {
    const single = asStr(row.address);
    if (single) addresses.push(single);
  }
  let generalNotes = asStr(row.generalNotes);
  const website = asStr(row.website);
  const email = asStr(row.email);
  if (website) generalNotes = generalNotes ? generalNotes + ' · website: ' + website : 'website: ' + website;
  if (email) generalNotes = generalNotes ? generalNotes + ' · email: ' + email : 'email: ' + email;
  // [v7.5.72] A matching sm3 subCategory sets the preset note; otherwise
  // the file's note stands (sm3 files ship note='other').
  const subCategory = asStr(row.subCategory);
  const note = sm3NoteForSubCategory(subCategory) || asStr(row.note) || 'other';
  const docData: Record<string, unknown> = {
    id: meta.id,
    name: row.name,
    phone: phones.length > 0 ? phones[0] : '',
    phones,
    city: asStr(row.city),
    stateRegion: asStr(row.stateRegion),
    township: asStr(row.township),
    ward: asStr(row.ward),
    address: addresses.length > 0 ? addresses[0] : '',
    addresses,
    note,
    subCategory,
    addedBy: meta.addedBy,
    addedByUid: meta.addedByUid,
    createdAt: meta.createdAt,
    helpfulCount: 0,
    kpayNumber: asStr(row.kpayNumber),
    generalNotes,
    items: asShopItems(row.items, meta.createdAt),
  };
  const nameEn = asStr(row.nameEn);
  if (nameEn) docData.nameEn = nameEn;
  return docData;
}

// Re-exported for callers that need the stored doc shape in types.
export type MappedShopDoc = PublicShop & { nameEn?: string; helpfulCount: number };
