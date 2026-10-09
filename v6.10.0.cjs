/**
 * D:\Ngwesaryin\v6.10.0.cjs
 * ─────────────────────────────────────────────────────────────
 * v6.10.0 — S3 Canonical Sync Signature + Version Bump
 *
 * One-shot: patches syncGuards.ts, AuthContext.tsx, package.json,
 * App.tsx, AccountModal.tsx, versionHistory.ts.
 * Backs up every touched file as <name>.bak-<timestamp>.
 *
 * ⚠️  Handover rule: PowerShell ❌ for Myanmar/emoji files.
 *     Node.js .cjs only.
 *
 * Usage:
 *   node v6.10.0.cjs --dry-run   # preview
 *   node v6.10.0.cjs             # apply
 * ─────────────────────────────────────────────────────────────
 */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DRY = process.argv.includes('--dry-run');
const TS = new Date().toISOString().replace(/[:.]/g, '-');

const ok   = (m) => console.log('  ✓ ' + m);
const skip = (m) => console.log('  · ' + m);
const warn = (m) => console.log('  ! ' + m);

function write(rel, next, label) {
  const full = path.join(ROOT, rel);
  const original = fs.readFileSync(full, 'utf8');
  if (next === original) { skip(rel + ' — already applied'); return; }
  if (!DRY) {
    fs.writeFileSync(full + '.bak-' + TS, original, 'utf8');
    fs.writeFileSync(full, next, 'utf8');
  }
  ok(rel + ' — ' + label);
}

function read(rel) {
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) { warn('missing: ' + rel); return null; }
  return fs.readFileSync(full, 'utf8');
}

// ─────────────────────────────────────────────────────────────
// 1. src/utils/syncGuards.ts — content-hash signature
// ─────────────────────────────────────────────────────────────
(function patchSyncGuards() {
  const rel = 'src/utils/syncGuards.ts';
  const src = read(rel); if (src === null) return;
  if (src.includes('computeContentFingerprint')) { skip(rel + ' — already patched'); return; }

  const startAnchor = '/**\n * Computes a fast lightweight fingerprint of the syncable state.';
  const endAnchor   = '`;\n}';
  const s = src.indexOf(startAnchor);
  if (s < 0) { warn(rel + ' — start anchor not found'); return; }
  const e = src.indexOf(endAnchor, s);
  if (e < 0) { warn(rel + ' — end anchor not found'); return; }

  const NEW_BLOCK = `/**
 * Sync fingerprint helpers
 * -------------------------
 * Short-circuits cloud sync when local state has not actually changed.
 *
 * Design:
 * - Hashes CONTENT of every entity, not counts/sums/first-id. Before this,
 *   editing a tx note/category/date/walletId (or offsetting two amounts)
 *   would not change the signature, so the write was silently skipped and
 *   other devices never saw the edit.
 * - Order-independent: entities are sorted by key before hashing.
 * - Non-content fields (userId, _userId, _docPath, _docSource) are
 *   stripped so Firestore metadata does not create false positives.
 * - FNV-1a 32-bit is enough for change detection at personal-app scale.
 */

const FINGERPRINT_IGNORED_KEYS = new Set([
  'userId',
  '_userId',
  '_docPath',
  '_docSource',
]);

function stableStringify(value: any): string {
  if (value === null || value === undefined) return 'null';
  const t = typeof value;
  if (t === 'number') return Number.isFinite(value) ? String(value) : 'null';
  if (t === 'string') return JSON.stringify(value);
  if (t === 'boolean') return value ? '1' : '0';
  if (Array.isArray(value)) {
    return '[' + value.map(stableStringify).join(',') + ']';
  }
  if (t === 'object') {
    const keys = Object.keys(value)
      .filter((k) => !FINGERPRINT_IGNORED_KEYS.has(k))
      .sort();
    return (
      '{' +
      keys.map((k) => JSON.stringify(k) + ':' + stableStringify(value[k])).join(',') +
      '}'
    );
  }
  return 'null';
}

function fnv1a(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h.toString(36);
}

/**
 * Deterministic content fingerprint of an entity array.
 * @param items entities to hash (order-independent)
 * @param keyOf stable id extractor; defaults to item.id ?? item.categoryId
 */
export function computeContentFingerprint<T>(
  items: T[] | undefined | null,
  keyOf: (item: T) => string = (item: any) =>
    String(item?.id ?? item?.categoryId ?? '')
): string {
  if (!items || items.length === 0) return '0';
  const sorted = [...items].sort((a, b) => keyOf(a).localeCompare(keyOf(b)));
  const body = sorted.map((it) => stableStringify(it)).join('\\u0001');
  return items.length + '_' + fnv1a(body);
}

/**
 * Compact sync signature composed of per-collection fingerprints.
 * If it matches the last-synced value, the cloud write can be skipped.
 */
export function computeSyncSignature(
  txsFingerprint: string,
  debtsFingerprint: string,
  walletsFingerprint: string,
  categoriesFingerprint: string,
  budgetsFingerprint: string,
  shopsFingerprint: string,
  vehiclesFingerprint: string,
  fuelFingerprint: string,
  maintFingerprint: string,
  tiresFingerprint: string
): string {
  return (
    'txs:' + txsFingerprint +
    '|debts:' + debtsFingerprint +
    '|wallets:' + walletsFingerprint +
    '|cats:' + categoriesFingerprint +
    '|budgets:' + budgetsFingerprint +
    '|shops:' + shopsFingerprint +
    '|vehs:' + vehiclesFingerprint +
    '|fuel:' + fuelFingerprint +
    '|maint:' + maintFingerprint +
    '|tires:' + tiresFingerprint
  );
}`;

  write(rel, src.slice(0, s) + NEW_BLOCK + src.slice(e + endAnchor.length), 'content-hash signature');
})();

// ─────────────────────────────────────────────────────────────
// 2. src/context/AuthContext.tsx — import + call-site
// ─────────────────────────────────────────────────────────────
(function patchAuthContext() {
  const rel = 'src/context/AuthContext.tsx';
  let src = read(rel); if (src === null) return;
  let changed = false;

  // 2a. import
  const OLD_IMPORT = "import { computeSyncSignature } from '../utils/syncGuards';";
  const NEW_IMPORT = "import { computeSyncSignature, computeContentFingerprint } from '../utils/syncGuards';";
  if (src.includes(OLD_IMPORT)) {
    src = src.replace(OLD_IMPORT, NEW_IMPORT);
    changed = true;
    ok(rel + ' — import');
  } else if (src.includes(NEW_IMPORT)) {
    skip(rel + ' — import already patched');
  } else {
    warn(rel + ' — import anchor not found');
  }

  // 2b. signature block
  if (src.includes('computeContentFingerprint(transactions)')) {
    skip(rel + ' — signature block already patched');
  } else {
    const OLD_SIG = [
      '    const txsSum = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);',
      '    const debtsSum = debts.reduce((sum, d) => sum + (d.totalAmount || 0) + (d.paidAmount || 0), 0);',
      '',
      '    const currentSig = computeSyncSignature(',
      '      transactions.length,',
      '      txsSum,',
      "      transactions[0]?.id || '',",
      '      debts.length,',
      '      debtsSum,',
      "      debts[0]?.id || '',",
      "      wallets.map((w) => `${w.id}:${w.balance}`).join(','),",
      '      categories?.length || 0,',
      "      budgets.map((b) => `${b.categoryId}:${b.value}`).join(','),",
      '      shops?.length || 0,',
      '      vehicles?.length || 0,',
      '      fuelLogs?.length || 0,',
      '      maintenanceLogs?.length || 0,',
      '      tireLogs?.length || 0',
      '    );',
    ].join('\n');

    const NEW_SIG = [
      '    // [v6.10.0 S3] Content-aware signature. Full per-entity hash replaces',
      '    // the old count+sum+firstId heuristic, which silently missed note/',
      '    // category/date/walletId edits and offsetting amount changes.',
      '    const currentSig = computeSyncSignature(',
      '      computeContentFingerprint(transactions),',
      '      computeContentFingerprint(debts),',
      '      computeContentFingerprint(wallets),',
      '      computeContentFingerprint(categories),',
      '      computeContentFingerprint(budgets, (b) => b.categoryId),',
      '      computeContentFingerprint(shops),',
      '      computeContentFingerprint(vehicles),',
      '      computeContentFingerprint(fuelLogs),',
      '      computeContentFingerprint(maintenanceLogs),',
      '      computeContentFingerprint(tireLogs)',
      '    );',
    ].join('\n');

    if (src.includes(OLD_SIG)) {
      src = src.replace(OLD_SIG, NEW_SIG);
      changed = true;
      ok(rel + ' — signature block');
    } else {
      warn(rel + ' — signature block anchor not found (manual edit may be needed)');
    }
  }

  if (changed) write(rel, src, 'content-hash call-site');
})();

// ─────────────────────────────────────────────────────────────
// 3. package.json — version
// ─────────────────────────────────────────────────────────────
(function patchPackageJson() {
  const rel = 'package.json';
  const src = read(rel); if (src === null) return;
  const next = src.replace(/"version"\s*:\s*"[^"]*"/, '"version": "6.10.0"');
  write(rel, next, 'version 6.10.0');
})();

// ─────────────────────────────────────────────────────────────
// 4. Version strings in UI (App.tsx, AccountModal.tsx)
// ─────────────────────────────────────────────────────────────
(function patchVersionStrings() {
  const targets = ['src/App.tsx', 'src/components/AccountModal.tsx'];
  const PAT = /v6\.9[-\w.]*|v6\.9\.\d+|6\.9-phase3a/g;
  for (const rel of targets) {
    const src = read(rel); if (src === null) continue;
    if (!PAT.test(src)) { skip(rel + ' — no v6.9 string'); PAT.lastIndex = 0; continue; }
    PAT.lastIndex = 0;
    const next = src.replace(PAT, 'v6.10.0');
    write(rel, next, 'version string → v6.10.0');
    PAT.lastIndex = 0;
  }
})();

// ─────────────────────────────────────────────────────────────
// 5. src/data/versionHistory.ts — prepend v6.10.0 entry
// ─────────────────────────────────────────────────────────────
(function patchVersionHistory() {
  const rel = 'src/data/versionHistory.ts';
  const src = read(rel); if (src === null) return;
  if (src.includes("'v6.10.0'") || src.includes('"v6.10.0"')) {
    skip(rel + ' — v6.10.0 entry already present');
    return;
  }

  // Try common array-open patterns
  const patterns = [
    /export const versionHistory\s*:\s*[\w<>\[\]]+\s*=\s*\[\s*/,
    /export const versionHistory\s*=\s*\[\s*/,
    /const versionHistory\s*:\s*[\w<>\[\]]+\s*=\s*\[\s*/,
    /const versionHistory\s*=\s*\[\s*/,
  ];

  let match = null;
  for (const p of patterns) {
    match = src.match(p);
    if (match) break;
  }

  if (!match) {
    warn(rel + ' — array anchor not found; add v6.10.0 entry manually');
    return;
  }

  const insertAt = match.index + match[0].length;
  const ENTRY = `  {
    version: 'v6.10.0',
    date: '2026-10-09',
    title: 'Sync Reliability Batch',
    changes: [
      'S3: Canonical content-hash sync signature (fixes missed edits)',
      'Sync now detects note / category / date / walletId changes',
      'Offsetting amount edits (e.g. +100/-100) no longer slip through',
    ],
  },
`;
  const next = src.slice(0, insertAt) + ENTRY + src.slice(insertAt);
  write(rel, next, 'prepend v6.10.0 entry');
})();

console.log('');
console.log(DRY ? '[v6.10.0] Dry-run complete — no files written.' : '[v6.10.0] Done.');
console.log(DRY ? '' : 'Next: npm run typecheck && npm run build:safe && npm run test');