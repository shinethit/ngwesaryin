export const safeGetItem = (key: string): string | null => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
    return null;
  } catch (e) {
    return null;
  }
};

export const safeSetItem = (key: string, value: string): void => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  } catch (e) {}
};

export const safeRemoveItem = (key: string): void => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
    }
  } catch (e) {}
};


// ═══════════════════════════════════════════════════════════════
// [v6.11.0 S4] User-scoped storage
// ───────────────────────────────────────────────────────────────
// Keys starting with 'ngwe_' are per-user EXCEPT the small set of
// device-global keys below. Before setStorageScope() runs, scoped
// keys return null and writes are silently dropped — this prevents
// leaking one user's data into another user's session.
// ═══════════════════════════════════════════════════════════════

const __DEVICE_GLOBAL_KEYS = new Set<string>([
  'ngwe_guest_mode',
  'ngwe_lang',
  'ngwe_theme',
  'ngwe_pin',
  'ngwe_pin_salt',
  'ngwe_pin_settings',
]);

const __LAST_SCOPE_KEY   = '__ngwe_last_scope';
const __MIGRATION_MARKER = '__ngwe_mig_v610_owner';

let __storageScope: string | null = null;

const __rawGet    = localStorage.getItem.bind(localStorage);
const __rawSet    = localStorage.setItem.bind(localStorage);
const __rawRemove = localStorage.removeItem.bind(localStorage);
const __rawKey    = localStorage.key.bind(localStorage);

// Restore last-known scope immediately, so initial reads (before
// Firebase auth resolves) see the correct user's data.
try {
  const saved = __rawGet(__LAST_SCOPE_KEY);
  if (saved) __storageScope = saved;
} catch { /* ignore */ }

function __isScoped(key: string): boolean {
  return key.startsWith('ngwe_') && !__DEVICE_GLOBAL_KEYS.has(key);
}

function __scopedKey(key: string): string | null {
  if (!__isScoped(key)) return key;
  if (!__storageScope) return null;
  return '_u_' + __storageScope + '_' + key;
}

try {
  (localStorage as any).getItem = function (key: string): string | null {
    const k = __scopedKey(key);
    if (k === null) return null;
    return __rawGet(k);
  };
  (localStorage as any).setItem = function (key: string, value: string): void {
    const k = __scopedKey(key);
    if (k === null) return;
    __rawSet(k, value);
  };
  (localStorage as any).removeItem = function (key: string): void {
    const k = __scopedKey(key);
    if (k === null) return;
    __rawRemove(k);
  };
} catch (e) {
  console.warn('[S4] Failed to patch localStorage — scoping disabled.', e);
}

function __enumerateLegacyKeys(): string[] {
  const out: string[] = [];
  try {
    const len = localStorage.length;
    for (let i = 0; i < len; i++) {
      const k = __rawKey(i);
      if (!k) continue;
      if (k.startsWith('_u_')) continue;
      if (!__isScoped(k)) continue;
      out.push(k);
    }
  } catch { /* ignore */ }
  return out;
}

function __migrateLegacyKeysOnce(scope: string): void {
  try {
    const prev = __rawGet(__MIGRATION_MARKER);
    if (prev === scope) return;
    if (prev && prev !== scope) return;
    const legacy = __enumerateLegacyKeys();
    let moved = 0;
    for (const key of legacy) {
      const oldVal = __rawGet(key);
      if (oldVal === null) continue;
      const newKey = '_u_' + scope + '_' + key;
      if (__rawGet(newKey) === null) {
        __rawSet(newKey, oldVal);
        moved++;
      }
      __rawRemove(key);
    }
    __rawSet(__MIGRATION_MARKER, scope);
    if (moved > 0) {
      console.log('[S4] Migrated ' + moved + ' legacy key(s) into scope "' + scope + '"');
    }
  } catch (e) {
    console.warn('[S4] Migration failed:', e);
  }
}

/**
 * Set the active storage scope. Called by AuthContext whenever the
 * Firebase auth state resolves or changes.
 *
 * - First fire after a cold boot with no prior data → apply scope
 *   silently (no reload).
 * - Login / logout / account switch → apply scope and trigger a
 *   one-shot reload so every React state slice re-initializes
 *   against the new scope.
 */
export function setStorageScope(scope: string | null): void {
  const prev = __storageScope;
  if (scope === prev) return;

  const hadPrevMarker  = __rawGet(__LAST_SCOPE_KEY) !== null;
  const hasLegacyData  = __enumerateLegacyKeys().length > 0;

  __storageScope = scope;
  try {
    if (scope) __rawSet(__LAST_SCOPE_KEY, scope);
    else       __rawRemove(__LAST_SCOPE_KEY);
  } catch { /* ignore */ }

  if (scope) __migrateLegacyKeysOnce(scope);

  if (typeof window === 'undefined') return;
  const shouldReload = (hadPrevMarker || hasLegacyData) && prev !== scope;
  if (shouldReload) {
    setTimeout(() => {
      try { window.location.reload(); }
      catch {
        try { window.location.href = window.location.href; } catch { /* ignore */ }
      }
    }, 120);
  }
}

export function getStorageScope(): string | null {
  return __storageScope;
}
