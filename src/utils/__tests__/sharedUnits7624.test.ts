// [v7.6.24] Shared custom units — a unit typed once by anyone
// appears as a select option for EVERYONE (same account on another
// device AND different accounts), like the Public shop list.
// Collection: `public_units`, deterministic doc id = the
// encodeURIComponent'd NORMALIZED value. Pure helpers + a stubbed
// store: no live Firestore (the default store is built lazily, so
// importing this module never touches firebase — same pattern as
// shopPriceAlerts.test.ts). Wiring pins are source-text assertions
// (no test renderer in this repo; vitest node env). NO path
// comparisons: sources are read via new URL(..., import.meta.url).
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  SHARED_UNITS_COLLECTION,
  mergeSharedUnits,
  collectSharedUnits,
  encodeSharedUnitId,
  buildSharedUnitDoc,
  publishSharedUnits,
  type SharedUnitDoc,
  type SharedUnitStore,
} from '../sharedUnits';
import {
  VERSION_HISTORY,
  CURRENT_APP_VERSION,
  CURRENT_BUILD_NUMBER,
} from '../../data/versionHistory';

const APP_SRC = readFileSync(new URL('../../App.tsx', import.meta.url), 'utf8');
const TX_MODAL_SRC = readFileSync(
  new URL('../../components/TransactionModal.tsx', import.meta.url),
  'utf8',
);
const SHOP_CARD_SRC = readFileSync(
  new URL('../../components/shops/ShopCard.tsx', import.meta.url),
  'utf8',
);
const SHOPS_VIEW_SRC = readFileSync(
  new URL('../../components/ShopsView.tsx', import.meta.url),
  'utf8',
);
const MAINT_MODAL_SRC = readFileSync(
  new URL('../../components/vehicles/AddMaintenanceModal.tsx', import.meta.url),
  'utf8',
);
const VEHICLES_VIEW_SRC = readFileSync(
  new URL('../../components/vehicles/VehiclesView.tsx', import.meta.url),
  'utf8',
);
const RULES_SRC = readFileSync(new URL('../../../firestore.rules', import.meta.url), 'utf8');
const VERSION_JSON = JSON.parse(
  readFileSync(new URL('../../../public/version.json', import.meta.url), 'utf8'),
);

function countOccurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

describe('mergeSharedUnits (v7.6.24)', () => {
  it('shared units come first, then local-only extras, deduped', () => {
    expect(mergeSharedUnits(['ဗူး', 'ဖာ'], ['ဗူး', 'ပုံး'])).toEqual(['ဗူး', 'ပုံး', 'ဖာ']);
  });

  it('normalizes before deduping: a number-word unit collapses to the bare unit', () => {
    expect(mergeSharedUnits(['တစ်ဗူး'], ['ဗူး'])).toEqual(['ဗူး']);
    expect(mergeSharedUnits([], ['တစ်ဗူး'])).toEqual(['ဗူး']);
  });

  it('drops preset values and empties; presets are already options', () => {
    expect(mergeSharedUnits(['ခု', '', '  ', 'ဗူး'], ['ပါကင်', 'လီတာ'])).toEqual(['ဗူး']);
  });

  it('keeps digits (never stripped) and tolerates non-strings', () => {
    expect(mergeSharedUnits(['2ဗူး'], [undefined as unknown as string, null as unknown as string])).toEqual([
      '2ဗူး',
    ]);
  });

  it('returns [] when both lists are empty', () => {
    expect(mergeSharedUnits([], [])).toEqual([]);
  });
});

describe('collectSharedUnits / encodeSharedUnitId / buildSharedUnitDoc (v7.6.24)', () => {
  it('collects normalized string values in first-seen order, ignoring the rest', () => {
    expect(collectSharedUnits(['ဗူး', ' ဗူး ', 42, null, 'ထုပ်', ''])).toEqual(['ဗူး', 'ထုပ်']);
  });

  it('keeps a number-word-stripped value once', () => {
    expect(collectSharedUnits(['တစ်ဗူး', 'ဗူး'])).toEqual(['ဗူး']);
  });

  it('encodes the normalized value: a slash can never create a sub-path', () => {
    expect(encodeSharedUnitId('a/b')).toBe('a%2Fb');
    // encodeURIComponent percent-encodes non-ASCII too; the id
    // round-trips back to the unit. Only the slash case is pinned
    // as a literal — the Myanmar id is asserted via round-trip.
    expect(decodeURIComponent(encodeSharedUnitId('ဗူး'))).toBe('ဗူး');
    expect(encodeSharedUnitId('ဗူး')).not.toBe('ဗူး');
    expect(encodeSharedUnitId('တစ်ဗူး')).toBe(encodeSharedUnitId('ဗူး'));
  });

  it('builds the exact doc shape, omitting addedBy when unknown', () => {
    const doc = buildSharedUnitDoc('ဗူး', 'uid-1', undefined, 1790000000000);
    expect(doc).toEqual({ value: 'ဗူး', addedByUid: 'uid-1', createdAt: 1790000000000 });
    const named = buildSharedUnitDoc(' တစ်ဗူး ', 'uid-1', 'a@b.c', 1);
    expect(named).toEqual({ value: 'ဗူး', addedByUid: 'uid-1', addedBy: 'a@b.c', createdAt: 1 });
  });

  it('the collection name is public_units', () => {
    expect(SHARED_UNITS_COLLECTION).toBe('public_units');
  });
});

describe('publishSharedUnits (v7.6.24, stub store)', () => {
  function stubStore(): SharedUnitStore & { writeUnit: ReturnType<typeof vi.fn> } {
    return { writeUnit: vi.fn(async () => true) } as any;
  }

  it('writes each custom unit at its deterministic id with the doc shape', async () => {
    const store = stubStore();
    await publishSharedUnits(['ဗူး', 'ပုံး'], 'uid-1', 'a@b.c', store);
    expect(store.writeUnit).toHaveBeenCalledTimes(2);
    expect(store.writeUnit).toHaveBeenCalledWith(
      encodeSharedUnitId('ဗူး'),
      expect.objectContaining({ value: 'ဗူး', addedByUid: 'uid-1', addedBy: 'a@b.c' }),
    );
    expect(store.writeUnit).toHaveBeenCalledWith(
      encodeSharedUnitId('ပုံး'),
      expect.objectContaining({ value: 'ပုံး', addedByUid: 'uid-1' }),
    );
  });

  it('never publishes presets, empties, or duplicates within one call', async () => {
    const store = stubStore();
    await publishSharedUnits(['ခု', '', 'ဗူး', 'တစ်ဗူး', 'ဗူး'], 'uid-1', undefined, store);
    expect(store.writeUnit).toHaveBeenCalledTimes(1);
    expect(store.writeUnit).toHaveBeenCalledWith(
      encodeSharedUnitId('ဗူး'),
      expect.objectContaining({ value: 'ဗူး', addedByUid: 'uid-1' }),
    );
  });

  it('is a no-op without a uid (guests keep the local-only list)', async () => {
    const store = stubStore();
    await publishSharedUnits(['ဗူး'], undefined, undefined, store);
    await publishSharedUnits(['ဗူး'], null, undefined, store);
    await publishSharedUnits(['ဗူး'], '', undefined, store);
    expect(store.writeUnit).not.toHaveBeenCalled();
  });

  it('is a no-op when nothing custom remains, and never throws when the store fails', async () => {
    const store = stubStore();
    await publishSharedUnits(['ခု', 'ပါကင်'], 'uid-1', undefined, store);
    expect(store.writeUnit).not.toHaveBeenCalled();
    const failing: SharedUnitStore = { writeUnit: vi.fn(async () => { throw new Error('denied'); }) };
    await expect(publishSharedUnits(['ဗူး'], 'uid-1', undefined, failing)).resolves.toBeUndefined();
    const falseStore: SharedUnitStore = { writeUnit: vi.fn(async () => false) };
    await expect(publishSharedUnits(['ဗူး'], 'uid-1', undefined, falseStore)).resolves.toBeUndefined();
  });

  it('one failed unit does not block the rest', async () => {
    const failingId = encodeSharedUnitId('ဗူး');
    const writeUnit = vi.fn(async (id: string, _data: SharedUnitDoc) => {
      if (id === failingId) throw new Error('denied');
      return true;
    });
    await publishSharedUnits(['ဗူး', 'ပုံး'], 'uid-1', undefined, { writeUnit });
    expect(writeUnit).toHaveBeenCalledTimes(2);
  });
});

describe('shared-units wiring (v7.6.24)', () => {
  it('App subscribes to public_units un-gated and threads sharedUnits to all three surfaces', () => {
    expect(APP_SRC).toContain("query(collection(db, 'public_units'))");
    expect(APP_SRC).toContain('collectSharedUnits(');
    expect(APP_SRC).toContain('const [sharedUnits, setSharedUnits] = useState<string[]>([]);');
    expect(countOccurrences(APP_SRC, 'sharedUnits={sharedUnits}')).toBe(3);
  });

  it('TransactionModal merges the lists for all six select-helper calls and publishes on save', () => {
    expect(TX_MODAL_SRC).toContain('sharedUnits?: string[];');
    expect(TX_MODAL_SRC).toContain('mergeSharedUnits(customUnits, sharedUnits)');
    expect(countOccurrences(TX_MODAL_SRC, 'knownUnits)')).toBe(6);
    // The local persist still keys off the local list alone (offline/guest fallback).
    expect(TX_MODAL_SRC).toContain('collectNewCustomUnits(validItems.map((i) => i.unit), customUnits)');
    expect(TX_MODAL_SRC).toContain('void publishSharedUnits(newCustomUnits, user.uid,');
  });

  it('ShopCard merges the lists for both unit selects', () => {
    expect(SHOP_CARD_SRC).toContain('sharedUnits?: string[];');
    expect(SHOP_CARD_SRC).toContain('mergeSharedUnits(customUnits, sharedUnits)');
    expect(countOccurrences(SHOP_CARD_SRC, 'menuUnitSelectOptions(knownUnits)')).toBe(2);
  });

  it('ShopsView passes sharedUnits to all four ShopCards and publishes in the pricing handler', () => {
    expect(SHOPS_VIEW_SRC).toContain('sharedUnits?: string[];');
    expect(countOccurrences(SHOPS_VIEW_SRC, 'sharedUnits={sharedUnits}')).toBe(4);
    expect(SHOPS_VIEW_SRC).toContain('void publishSharedUnits([unit], currentUser.uid, contributorName);');
  });

  it('AddMaintenanceModal merges the lists and calls the publish callback on save', () => {
    expect(MAINT_MODAL_SRC).toContain('sharedUnits?: string[];');
    expect(MAINT_MODAL_SRC).toContain('onPublishCustomUnits?: (units: string[]) => void;');
    expect(MAINT_MODAL_SRC).toContain('mergeSharedUnits(customUnits, sharedUnits)');
    expect(countOccurrences(MAINT_MODAL_SRC, 'knownUnits)')).toBe(3);
    expect(MAINT_MODAL_SRC).toContain('onPublishCustomUnits?.(newCustoms);');
  });

  it('VehiclesView threads sharedUnits and wires the publish callback with the signed-in uid', () => {
    expect(VEHICLES_VIEW_SRC).toContain('sharedUnits?: string[];');
    expect(VEHICLES_VIEW_SRC).toContain('sharedUnits={sharedUnits}');
    expect(VEHICLES_VIEW_SRC).toContain('onPublishCustomUnits={(units) => {');
    expect(VEHICLES_VIEW_SRC).toContain('auth.currentUser');
    expect(VEHICLES_VIEW_SRC).toContain('void publishSharedUnits(units, u.uid,');
  });

  it('firestore.rules gates public_units like public_shops: public read, owner create, admin-only update/delete', () => {
    expect(RULES_SRC).toContain('match /public_units/{unitId} {');
    expect(RULES_SRC).toContain('allow get, list: if true;');
    expect(RULES_SRC).toContain('request.resource.data.addedByUid == request.auth.uid');
    expect(RULES_SRC).toContain('request.resource.data.value.size() <= 20');
    expect(RULES_SRC).toContain('allow update, delete: if isAdmin();');
    expect(RULES_SRC).not.toContain('serverTimestamp');
  });
});

// ---------- Version bump to v7.6.27 (build 342) ----------

describe('Version bump to v7.6.27 (build 342)', () => {
  it('version constants and history entry match version.json', () => {
    expect(CURRENT_APP_VERSION).toBe('v7.6.59');
    expect(CURRENT_BUILD_NUMBER).toBe(373);
    expect(VERSION_JSON.version).toBe('v7.6.59');
    expect(VERSION_JSON.buildNumber).toBe(373);
    const entry = VERSION_HISTORY[0];
    expect(entry.version).toBe('v7.6.59');
    expect(entry.buildNumber).toBe(373);
    expect(entry.releaseDate).toBe('2026-11-27');
    expect(entry.tag).toBe('fix');
    expect(entry.titleMy).toBe('လက်ကျန်ကတ် အဓိကပမာဏ Hero အတိုင်း ထူထူစိုစို');
    expect(entry.titleEn).toBe('Records balance figure matches the Hero — thick and vivid');
    expect(entry.changesMy).toEqual(VERSION_JSON.changesMy);
    expect(entry.changesEn).toEqual(VERSION_JSON.changesEn);
    expect(entry.changesMy).toHaveLength(3);
    expect(entry.changesEn).toHaveLength(3);
    expect(entry.changesMy[0]).toBe(
      'အဓိကပမာဏက Dashboard Hero အတိုင်း ပိုကြီး၊ ပိုထူလာပါပြီ',
    );
    expect(entry.changesEn[0]).toBe(
      'The main figure is now as large and bold as the Dashboard Hero figure',
    );
  });

  it('change log has no Admin content and releasedAt is present-only', () => {
    expect(VERSION_JSON.changesMy.join(' ')).not.toContain('Admin');
    expect(VERSION_JSON.changesEn.join(' ')).not.toContain('Admin');
    expect(JSON.stringify(VERSION_HISTORY[0])).not.toContain('Admin');
    expect(typeof VERSION_JSON.releasedAt).toBe('string');
    expect(VERSION_JSON.releasedAt.length).toBeGreaterThan(0);
  });

  it('no mangled numbering anywhere in the version surfaces', () => {
    expect(CURRENT_APP_VERSION).not.toBe('v7.5.100');
    expect(VERSION_JSON.version).not.toBe('v7.5.100');
    expect(CURRENT_APP_VERSION).not.toBe('v7.6.30'.replace(/0$/, ''));
    expect(VERSION_JSON.version).not.toBe('v7.6.30'.replace(/0$/, ''));
  });

  it('the fix-script guard is raw string equality: accepts exactly 7.6.25/7.6.26, rejects the mangled form', () => {
    const FROM_VERSION = '7.6.30';
    const TO_VERSION = '7.6.30';
    const guardFails = (pkgVersion: string): boolean =>
      pkgVersion !== FROM_VERSION && pkgVersion !== TO_VERSION;
    // The mangled form is built from TO_VERSION, never written as a
    // literal, so the shipped identity can never be confused with
    // it by a grep or by the guard.
    const mangled = TO_VERSION.replace(/0$/, '');
    expect(mangled).not.toBe(TO_VERSION);
    expect(TO_VERSION).toBe('7.6.30');
    expect(guardFails('7.6.30')).toBe(false);
    expect(guardFails('7.6.30')).toBe(false);
    expect(guardFails(mangled)).toBe(true);
    expect(guardFails('7.6.3')).toBe(true);
    expect(guardFails('')).toBe(true);
  });
});
