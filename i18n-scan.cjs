/**
 * D:\Ngwesaryin\i18n-scan.cjs
 * Read-only i18n audit. Writes i18n-scan-report.txt.
 * Run:  node i18n-scan.cjs
 */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const REPORT = path.join(ROOT, 'i18n-scan-report.txt');
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.vite']);

// ─────────────────────────────────────────────────────────────
// 1. Read i18n.ts
// ─────────────────────────────────────────────────────────────
function readI18n() {
  const p = path.join(ROOT, 'src/utils/i18n.ts');
  if (!fs.existsSync(p)) return { exists: false, raw: '', keys: [] };
  const raw = fs.readFileSync(p, 'utf8');
  // Try to collect simple `key: 'value'` / `key: { my: '...', en: '...' }`
  const keys = [];
  const re1 = /^\s*([A-Za-z_$][\w$]*)\s*:\s*['"`]/gm;
  let m;
  while ((m = re1.exec(raw)) !== null) keys.push(m[1]);
  return { exists: true, raw, keys };
}

// ─────────────────────────────────────────────────────────────
// 2. Walk source tree
// ─────────────────────────────────────────────────────────────
function walk(dir, out = []) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    if (SKIP_DIRS.has(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(full);
  }
  return out;
}

// ─────────────────────────────────────────────────────────────
// 3. Find inline `lang === 'my'` / `lang === 'en'` patterns
// ─────────────────────────────────────────────────────────────
function findInlinePatterns(src) {
  const results = [];
  const lines = src.split('\n');

  // Match: lang === 'my'   OR   lang === "my"
  // Also:  lang === 'en'
  // Also:  isMy ?  /  isEn ?  (some files use boolean aliases)
  const pats = [
    { name: "lang === 'my'", re: /lang\s*===\s*['"]my['"]/ },
    { name: 'lang === "en"', re: /lang\s*===\s*['"]en['"]/ },
    { name: 'isMy ?', re: /\bisMy\s*\?/ },
    { name: 'isEn ?', re: /\bisEn\s*\?/ },
  ];

  lines.forEach((line, i) => {
    for (const p of pats) {
      if (p.re.test(line)) {
        // Collect up to 3 lines to capture multi-line ternaries
        const snippet = lines.slice(i, Math.min(i + 3, lines.length)).join(' ⏎ ').trim();
        results.push({
          lineNo: i + 1,
          kind: p.name,
          snippet: snippet.length > 300 ? snippet.slice(0, 297) + '...' : snippet,
        });
        break; // one match per line is enough
      }
    }
  });

  return results;
}

// ─────────────────────────────────────────────────────────────
// 4. Scan all source files
// ─────────────────────────────────────────────────────────────
function scan() {
  const srcDir = path.join(ROOT, 'src');
  const files = walk(srcDir);
  const perFile = {};
  let total = 0;

  for (const full of files) {
    const rel = path.relative(ROOT, full).replace(/\\/g, '/');
    const src = fs.readFileSync(full, 'utf8');
    const hits = findInlinePatterns(src);
    if (hits.length > 0) {
      perFile[rel] = hits;
      total += hits.length;
    }
  }

  return { perFile, total, filesScanned: files.length };
}

// ─────────────────────────────────────────────────────────────
// 5. Build report
// ─────────────────────────────────────────────────────────────
function buildReport(i18n, scanResult) {
  const L = [];
  L.push('════════════════════════════════════════════════════════════');
  L.push('  i18n Scan Report');
  L.push('  Generated: ' + new Date().toISOString());
  L.push('════════════════════════════════════════════════════════════');
  L.push('');

  L.push('── i18n.ts STATUS ─────────────────────────────────────────');
  if (!i18n.exists) {
    L.push('  ✗ src/utils/i18n.ts NOT FOUND');
  } else {
    L.push('  ✓ Exists, size = ' + i18n.raw.length + ' chars');
    L.push('  Existing keys detected: ' + i18n.keys.length);
    if (i18n.keys.length > 0) {
      L.push('  Keys:');
      for (const k of i18n.keys) L.push('    · ' + k);
    }
  }
  L.push('');

  L.push('── INLINE PATTERNS ────────────────────────────────────────');
  L.push('  Files scanned: ' + scanResult.filesScanned);
  L.push('  Total hits:    ' + scanResult.total);
  L.push('  Files affected: ' + Object.keys(scanResult.perFile).length);
  L.push('');

  // Group by file, sorted by hit count desc
  const fileList = Object.entries(scanResult.perFile)
    .sort((a, b) => b[1].length - a[1].length);

  L.push('── PER-FILE BREAKDOWN ─────────────────────────────────────');
  for (const [file, hits] of fileList) {
    L.push('');
    L.push(`${file}  (${hits.length} hits)`);
    for (const h of hits) {
      L.push(`  L${String(h.lineNo).padStart(5)}  [${h.kind}]`);
      L.push(`         ${h.snippet}`);
    }
  }
  L.push('');
  L.push('════════════════════════════════════════════════════════════');
  L.push('  END');
  L.push('════════════════════════════════════════════════════════════');

  return L.join('\n');
}

// ─────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────
console.log('▶ Scanning src/ for inline lang patterns...');
const i18n = readI18n();
const scanResult = scan();
const report = buildReport(i18n, scanResult);

fs.writeFileSync(REPORT, report, 'utf8');

console.log('');
console.log('  ✓ i18n.ts: ' + (i18n.exists ? i18n.keys.length + ' keys' : 'MISSING'));
console.log('  ✓ Files affected: ' + Object.keys(scanResult.perFile).length);
console.log('  ✓ Total inline hits: ' + scanResult.total);
console.log('  ✓ Report written: ' + REPORT);
console.log('');
console.log('Open i18n-scan-report.txt and paste its contents here.');