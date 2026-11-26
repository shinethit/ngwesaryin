// [v7.6.34] PWA offline stability: the shell must open from a
// complete cached build, and a failed cloud fetch must never clear
// existing state or mirrors. Unit tests for the pure pieces
// (pullCollection, mergeById/mergeByKey) plus source-text pins for
// the wired-up paths (pull return shaping, listener fromCache
// guard, atomic service worker, reload-while-editing guard,
// explicit persistent-cache fallback, sync-queue reconnect flush).
// Source-text assertions follow the established pattern (vitest
// node env, no test renderer). NO path comparisons: sources are
// read via new URL(..., import.meta.url).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { pullCollection } from '../pullResult';
import { mergeById, mergeByKey } from '../mergeById';
import {
  VERSION_HISTORY,
  CURRENT_APP_VERSION,
  CURRENT_BUILD_NUMBER,
} from '../../data/versionHistory';

const AUTH_SRC = readFileSync(
  new URL('../../context/AuthContext.tsx', import.meta.url),
  'utf8',
);
const LISTENERS_SRC = readFileSync(
  new URL('../../hooks/useCloudListeners.ts', import.meta.url),
  'utf8',
);
const SW_SRC = readFileSync(
  new URL('../../../public/sw.js', import.meta.url),
  'utf8',
);
const MAIN_SRC = readFileSync(
  new URL('../../main.tsx', import.meta.url),
  'utf8',
);
const FIREBASE_SRC = readFileSync(
  new URL('../../lib/firebase.ts', import.meta.url),
  'utf8',
);
const QUEUE_SRC = readFileSync(
  new URL('../../lib/syncQueue.ts', import.meta.url),
  'utf8',
);
const VITE_CONFIG_SRC = readFileSync(
  new URL('../../../vite.config.ts', import.meta.url),
  'utf8',
);
const VERSION_JSON = JSON.parse(
  readFileSync(new URL('../../../public/version.json', import.meta.url), 'utf8'),
);

describe('pullCollection: failed fetch vs genuinely empty (v7.6.34)', () => {
  it('a null snapshot (both server + fallback failed) yields undefined', () => {
    expect(pullCollection(null, [{ id: 'a' }])).toBeUndefined();
    expect(pullCollection(undefined, [{ id: 'a' }])).toBeUndefined();
  });

  it('a successful-but-empty fetch still yields [] (genuinely empty)', () => {
    const snap = { docs: [] };
    expect(pullCollection(snap, [])).toEqual([]);
  });

  it('a successful fetch passes its docs through unchanged', () => {
    const snap = { docs: [{ id: 'x' }] };
    const docs = [{ id: 'x', amount: 5 }];
    expect(pullCollection(snap, docs)).toBe(docs);
  });

  it('a failed fetch with docs already merged yields undefined, not the docs', () => {
    // The caller skips undefined collections entirely, so a failed
    // pull can never overwrite state/mirrors with an empty list —
    // even when shared-doc merges produced local docs meanwhile.
    expect(pullCollection(null, [{ id: 'shared_1' }])).toBeUndefined();
  });
});

describe('merge utils never drop local data on an empty cloud result (v7.6.34)', () => {
  it('mergeById with an empty incoming list keeps every local item', () => {
    const prev = [
      { id: 't1', amount: 100 },
      { id: 't2', amount: 200 },
    ];
    expect(mergeById(prev, [])).toEqual(prev);
  });

  it('mergeById unions incoming docs over local ones by id', () => {
    const prev = [{ id: 't1', amount: 100, note: 'local' }];
    const incoming = [
      { id: 't1', amount: 150 },
      { id: 't2', amount: 200 },
    ];
    expect(mergeById(prev, incoming)).toEqual([
      { id: 't1', amount: 150, note: 'local' },
      { id: 't2', amount: 200 },
    ]);
  });

  it('mergeByKey with an empty incoming list keeps every local item', () => {
    const prev = [{ categoryId: 'c1', limit: 10 }];
    expect(mergeByKey(prev, [])).toEqual(prev);
  });
});

describe('pull return shaping uses pullCollection for every collection (v7.6.34)', () => {
  it('AuthContext shapes all six unguarded collections through pullCollection', () => {
    expect(AUTH_SRC).toContain('pullCollection(txSnap, visibleTransactions)');
    expect(AUTH_SRC).toContain('pullCollection(debtsSnap, debts)');
    expect(AUTH_SRC).toContain('pullCollection(shopsSnap, shops)');
    expect(AUTH_SRC).toContain('pullCollection(vehiclesSnap, vehicles)');
    expect(AUTH_SRC).toContain('pullCollection(fuelLogsSnap, fuelLogs)');
    expect(AUTH_SRC).toContain('pullCollection(maintSnap, maintenanceLogs)');
    expect(AUTH_SRC).toContain('pullCollection(tiresSnap, tireLogs)');
  });

  it('safeFetch returns null when both server and fallback fail', () => {
    const start = AUTH_SRC.indexOf('async function safeFetch');
    expect(start).toBeGreaterThan(-1);
    const body = AUTH_SRC.slice(start, start + 600);
    expect(body).toContain('return null');
  });
});

describe('cloud listeners never drop on a cached snapshot (v7.6.34)', () => {
  it('a confirmed tx is dropped only from a server snapshot', () => {
    expect(LISTENERS_SRC).toContain(
      'wasConfirmed && !confirmedServerTxIds.has(t.id) && !snap.metadata.fromCache',
    );
  });

  it('the reconcile guard keeps confirmed docs on cached snapshots', () => {
    expect(LISTENERS_SRC).toContain('isFromCache');
    expect(LISTENERS_SRC).toContain('if (!inCloud && wasConfirmed && isFromCache)');
  });
});

describe('service worker: atomic generations (v7.6.34)', () => {
  it('uses a bumped per-release cache name', () => {
    expect(SW_SRC).toContain("const CACHE_NAME = 'ngwesaryin-live-v11'");
    expect(SW_SRC).toContain('bump CACHE_NAME on EVERY release');
  });

  it('precaches the full build at install time before activating', () => {
    expect(SW_SRC).toContain("fetch('/index.html'");
    expect(SW_SRC).toContain('cache.addAll');
    expect(SW_SRC).toContain('skipWaiting');
  });

  it('precaches every chunk via the build-time asset manifest (lazy views included)', () => {
    expect(SW_SRC).toContain('asset-manifest.json');
    expect(VITE_CONFIG_SRC).toContain('asset-manifest.json');
    expect(VITE_CONFIG_SRC).toContain('generateBundle');
    expect(VITE_CONFIG_SRC).toContain('swAssetManifest');
  });

  it('has no network-first timeout race for shell assets', () => {
    expect(SW_SRC).not.toContain('fetchWithTimeout');
    expect(SW_SRC).not.toContain('1500');
  });

  it('never overwrites the cached index.html from the fetch handler', () => {
    expect(SW_SRC).toContain('!isHtml');
    expect(SW_SRC).toContain("caches.match('/index.html')");
  });

  it('still bypasses /version.json (v7.5.69 regression pin)', () => {
    expect(SW_SRC).toContain('[v7.5.69]');
    expect(SW_SRC).toContain("if (url.pathname === '/version.json')");
  });

  it('still bypasses Firebase/Google hostnames', () => {
    expect(SW_SRC).toContain('firestore.googleapis.com');
    expect(SW_SRC).toContain('identitytoolkit.googleapis.com');
  });
});

describe('update reload waits while the user is editing (v7.6.34)', () => {
  it('main.tsx defers the controllerchange reload on a focused field', () => {
    expect(MAIN_SRC).toContain('reloadForUpdate');
    expect(MAIN_SRC).toContain('focusout');
    expect(MAIN_SRC).toContain("el.tagName === 'INPUT'");
    expect(MAIN_SRC).toContain("el.tagName === 'TEXTAREA'");
  });
});

describe('Firestore cache fallback stays persistent (v7.6.34)', () => {
  it('the fallback retries with an explicit persistent single-tab cache', () => {
    expect(FIREBASE_SRC).toContain('persistent single-tab cache (fallback)');
    expect(FIREBASE_SRC).not.toContain('initializeFirestore(app, {})');
  });
});

describe('offline writes queue and flush on reconnect (v7.6.34)', () => {
  it('the queue processes on online/focus and skips while offline', () => {
    expect(QUEUE_SRC).toContain("window.addEventListener('online'");
    expect(QUEUE_SRC).toContain('triggerImmediateProcess');
    expect(QUEUE_SRC).toContain(
      "if (typeof navigator !== 'undefined' && !navigator.onLine) return;",
    );
  });
});

// ---------- Version bump to v7.6.41 (build 355) ----------

describe('Version bump to v7.6.41 (build 355)', () => {
  it('version constants and history entry match version.json', () => {
    expect(CURRENT_APP_VERSION).toBe('v7.6.54');
    expect(CURRENT_BUILD_NUMBER).toBe(368);
    expect(VERSION_JSON.version).toBe('v7.6.54');
    expect(VERSION_JSON.buildNumber).toBe(368);
    const entry = VERSION_HISTORY[0];
    expect(entry.version).toBe('v7.6.54');
    expect(entry.buildNumber).toBe(368);
    expect(entry.releaseDate).toBe('2026-11-26');
    expect(entry.tag).toBe('fix');
    expect(entry.titleMy).toBe('Menu မှာ ဝန်ဆောင်ခ သတ်သတ် ပြခြင်း');
    expect(entry.titleEn).toBe('Service fee shown separately on menus');
    expect(entry.changesMy).toEqual(VERSION_JSON.changesMy);
    expect(entry.changesEn).toEqual(VERSION_JSON.changesEn);
    expect(entry.changesMy).toHaveLength(2);
    expect(entry.changesEn).toHaveLength(2);
    expect(entry.changesMy[0]).toBe(
      'ယာဉ်ပြုပြင်တဲ့ ဆိုင်ရဲ့ Menu မှာ ဝန်ဆောင်ခကို ပစ္စည်းဖိုးနဲ့ မပေါင်းတော့ဘဲ သတ်သတ် အတန်းအဖြစ် ပြပါပြီ — ပစ္စည်းဈေးတွေက ပစ္စည်းဖိုးသက်သက်ပါ',
    );
    expect(entry.changesEn[0]).toBe(
      'Workshop menus now list the service fee as its own line instead of folding it into part prices — part prices are parts-only',
    );
  });

  it('change log has no Admin content and releasedAt is present-only', () => {
    expect(VERSION_JSON.changesMy.join(' ')).not.toContain('Admin');
    expect(VERSION_JSON.changesEn.join(' ')).not.toContain('Admin');
    expect(JSON.stringify(VERSION_HISTORY[0])).not.toContain('Admin');
    expect(typeof VERSION_JSON.releasedAt).toBe('string');
    expect(VERSION_JSON.releasedAt.length).toBeGreaterThan(0);
  });
});
