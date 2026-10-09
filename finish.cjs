/**
 * finish.cjs — Handover + cleanup for v6.23.6
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ROOT = __dirname;
const TS = new Date().toISOString().replace(/[:.]/g, '-');
const ok = (m) => console.log('  ✓ ' + m);
const skip = (m) => console.log('  · ' + m);

function safeWrite(rel, content) {
  const p = path.join(ROOT, rel);
  if (fs.existsSync(p)) {
    const orig = fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, '');
    if (orig === content) { skip(rel); return; }
    fs.writeFileSync(p + '.bak-' + TS, fs.readFileSync(p, 'utf8'), 'utf8');
  }
  fs.writeFileSync(p, content, 'utf8');
  ok(rel);
}

let HEAD = '<unknown>';
try { HEAD = execSync('git log --oneline -1', { cwd: ROOT }).toString().trim(); } catch {}

const md = `# 📋 NgweSarYin App — Session Handover (v6.23.6)

**Created:** 2026-10-10
**Previous:** v6.23.5 → v6.23.6

---

## 🎯 Project Overview

**App:** NgweSarYin (ငွေစာရင်း)
**Current Version:** v6.23.6
**Build:** 192
**Git HEAD:** \`${HEAD}\`

---

## ✅ v6.23.6 — Delete Return-Value Fix

**P1 (from v6.23.5 review):**
\`deleteSharedWalletTransaction\` used \`await safeDeleteDoc(txRef)\` and
assumed success. \`safeDeleteDoc\` returns boolean, not throw.

**Fix:** capture return value, return false on failure (canonical + mirror).

---

## 🛡️ Security Roadmap — 100%

| Phase | Version | Status |
|---|---|---|
| 1–10 | v6.16 → v6.23.5 | ✅ |
| **11** | **v6.23.6** | ✅ **Return-value check** |

---

## 🎯 Remaining Manual Verification

**2-device test recommended before official launch:**
1. B (collaborator) adds tx → A (owner) sync → appears?
2. A deletes same tx → B sync → disappears?
3. B deletes tx → A sync → disappears?
4. Close/reopen → no ghost resurrection?

Emulator covers rules; real device needed for cross-device timing.

---

## 🎯 Next Session Options

1. **2-device manual test** — verify cross-device delete
2. **App.tsx refactor** — 4–6 sessions
3. **Capacitor APK** — 1–2 sessions
4. **i18n top 3** — 2–3 sessions

---

## 🔧 Session Rules

- PowerShell ❌ (Myanmar/emoji content) → Node.js .cjs ✅
- Build before push
- NEVER \`npm audit fix --force\`
- Firebase rules deploy — backup first
- Emulator port 8181

---

## 🎬 Next Session Start Prompt

\`\`\`
NgweSarYin App — ဆက်လုပ်ရန်

Current State:
- Version: v6.23.6
- Build: 192
- Git HEAD: ${HEAD}
- Rules: v6.23.4 deployed
- Rules tests: 21/21 PASS
- Unit tests: 40 pass
- Security: Phases 1 → 11 complete

Next: [2-device test / App.tsx refactor / Capacitor APK / i18n]

Rules:
- PowerShell ❌ (Myanmar/emoji) → Node.js .cjs ✅
- Build before push
- NEVER npm audit fix --force
- Firebase rules deploy — backup first
\`\`\`

---

*Handover v6.23.6 — 2026-10-10*
*Git HEAD: ${HEAD}*
`;

safeWrite('NgweSarYin-Handover-v6.23.6.md', md);

console.log('');
console.log('▶ Cleanup...');
let cjs = 0, bak = 0, emu = 0;
for (const f of fs.readdirSync(ROOT)) {
  const p = path.join(ROOT, f);
  if (!fs.statSync(p).isFile()) continue;
  if (f.endsWith('.cjs') && f !== path.basename(__filename)) { try { fs.unlinkSync(p); cjs++; } catch {} }
  if (f.includes('.bak-')) { try { fs.unlinkSync(p); bak++; } catch {} }
  if (/^(firestore|firebase|ui)-debug\.log$/.test(f)) { try { fs.unlinkSync(p); emu++; } catch {} }
}
(function walk(dir) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    if (e.name === 'node_modules' || e.name === '.git' || e.name === 'dist') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.includes('.bak-')) { try { fs.unlinkSync(p); bak++; } catch {} }
  }
})(ROOT);
ok('removed ' + cjs + ' .cjs, ' + bak + ' .bak, ' + emu + ' emu log(s)');

try {
  require('child_process').spawn('cmd', ['/c', 'ping', '127.0.0.1', '-n', '3', '>nul', '&', 'del', '"' + __filename + '"'], { detached: true, stdio: 'ignore' }).unref();
  ok('scheduled self-delete');
} catch {}

console.log('');
console.log('Next:');
console.log('  git add -A');
console.log('  git commit -m "v6.23.6: fix safeDeleteDoc return-value check"');
console.log('  git push origin main');