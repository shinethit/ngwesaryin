// =============================================================
// [v7.5.0] Live exchange rates via open.er-api.com (free, no key).
//
// Strategy:
//   1. In-memory cache (30 min TTL) — fast, session-only.
//   2. localStorage cache (24 hr TTL) — survives reloads offline.
//   3. SUPPORTED_CURRENCIES hardcoded defaults — always available.
//
// API returns USD-based rates. We derive MMK-per-unit for every
// currency in SUPPORTED_CURRENCIES (1 unit = X MMK).
//
// Consumers just call getCurrencyInfo() (unchanged API) — the
// override happens transparently in src/utils/currency.ts.
// =============================================================

import { SUPPORTED_CURRENCIES, setLiveRates } from '../utils/currency';

const API_URL = 'https://open.er-api.com/v6/latest/USD';
const CACHE_KEY = 'ngwe_exchange_rates_v1';
const MEM_TTL_MS = 30 * 60 * 1000;       // 30 minutes
const DISK_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const FETCH_TIMEOUT_MS = 10000;

export interface RateSnapshot {
  rates: Record<string, number>; // code -> MMK per 1 unit
  updatedAt: number;
  source: 'live' | 'cache' | 'default';
}

let current: RateSnapshot = { rates: {}, updatedAt: 0, source: 'default' };
let inFlight: Promise<RateSnapshot> | null = null;

const listeners = new Set<(s: RateSnapshot) => void>();

function notify() {
  listeners.forEach((cb) => { try { cb(current); } catch {} });
}

export function getRateSnapshot(): RateSnapshot { return current; }

export function subscribeRates(cb: (s: RateSnapshot) => void): () => void {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

// Build default rates from hardcoded SUPPORTED_CURRENCIES.
function buildDefaultRates(): Record<string, number> {
  const out: Record<string, number> = {};
  SUPPORTED_CURRENCIES.forEach((c) => { out[c.code] = c.defaultRateToMMK; });
  return out;
}

function readDiskCache(): RateSnapshot | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RateSnapshot;
    if (!parsed || typeof parsed !== 'object') return null;
    if (!parsed.rates || typeof parsed.rates !== 'object') return null;
    const age = Date.now() - (parsed.updatedAt || 0);
    if (age > DISK_TTL_MS) return null;
    return { rates: parsed.rates, updatedAt: parsed.updatedAt, source: 'cache' };
  } catch { return null; }
}

function writeDiskCache(snap: RateSnapshot) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(snap)); } catch {}
}

// Derive MMK-per-unit rates from open.er-api.com USD-based payload.
function deriveMmkRates(usdRates: Record<string, number>): Record<string, number> {
  const mmkPerUsd = Number(usdRates.MMK);
  if (!mmkPerUsd || mmkPerUsd <= 0) return {};
  const out: Record<string, number> = { MMK: 1, USD: mmkPerUsd };
  SUPPORTED_CURRENCIES.forEach((c) => {
    if (c.code === 'MMK' || c.code === 'USD') return;
    const perUsd = Number(usdRates[c.code]);
    if (perUsd && perUsd > 0) {
      const rate = mmkPerUsd / perUsd;
      if (Number.isFinite(rate) && rate > 0) out[c.code] = rate;
    }
  });
  return out;
}

export async function refreshExchangeRates(force = false): Promise<RateSnapshot> {
  const age = Date.now() - current.updatedAt;
  if (!force && current.source === 'live' && age < MEM_TTL_MS) {
    return current;
  }
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      const res = await fetch(API_URL, { cache: 'no-store', signal: controller.signal });
      clearTimeout(timeout);

      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      if (data?.result !== 'success' || !data?.rates) throw new Error('Bad payload');

      const mmkRates = deriveMmkRates(data.rates);
      if (Object.keys(mmkRates).length === 0) throw new Error('No MMK rate derivable');

      current = { rates: mmkRates, updatedAt: Date.now(), source: 'live' };
      setLiveRates(mmkRates);
      writeDiskCache(current);
      notify();
      console.log('[exchangeRates] Live update OK — ' + Object.keys(mmkRates).length + ' currencies');
      return current;
    } catch (e) {
      console.warn('[exchangeRates] Live fetch failed, falling back:', e && e.message ? e.message : e);
      // Already on cache/default — do not degrade.
      return current;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

// Bootstrap: load disk cache synchronously (instant display), then
// kick off a background API refresh (non-blocking).
export function bootstrapExchangeRates(): RateSnapshot {
  if (current.source !== 'default') return current;

  const disk = readDiskCache();
  if (disk) {
    current = disk;
    setLiveRates(disk.rates);
    notify();
    const ageMin = Math.round((Date.now() - disk.updatedAt) / 60000);
    console.log('[exchangeRates] Loaded from disk cache (age ' + ageMin + ' min)');
  } else {
    // Seed defaults immediately so UI has something before first fetch.
    const defaults = buildDefaultRates();
    current = { rates: defaults, updatedAt: 0, source: 'default' };
    setLiveRates(defaults);
    notify();
  }

  refreshExchangeRates().catch(() => {});
  return current;
}
