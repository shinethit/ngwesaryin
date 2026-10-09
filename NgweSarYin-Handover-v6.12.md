# 📋 NgweSarYin App — Session Handover (v6.12.0)

**Created:** 2026-10-09 (end of session)
**Previous:** v6.11.0 → v6.12.0

---

## 🎯 Project Overview

**App:** NgweSarYin (ငွေစာရင်း) — Income, Expense & Debt Manager
**Tech Stack:** React 19 + Vite 6.4.4 + Firebase 12.19.0 + Tailwind 4
**Deploy:** Cloudflare Pages (`ngwesaryin.pages.dev`)
**Repo:** `D:\Ngwesaryin` (GitHub: `shinethit/ngwesaryin`, branch `main`)
**Current Version:** v6.12.0
**Build:** 173
**Git HEAD:** `463909c v6.12.0: S5 wallet identity exact-ID matching`
**Firebase Project:** `ngwesaryin`

---

## ✅ Sessions Completed

### v6.10.0 — S3 Canonical Content-Hash Sync Signature
- `computeContentFingerprint<T>()` (FNV-1a 32-bit) in `syncGuards.ts`
- Detects note/category/date/walletId edits + offsetting amounts
- 10 fingerprint strings → `computeSyncSignature()`
- No migration required

### v6.11.0 — S4 LocalStorage User Scope
- `storage.ts` overrides `localStorage.getItem/setItem/removeItem`
- All `ngwe_*` keys prefixed with `_u_<scope>_` (uid or 'guest')
- Auto-restore last-known scope on boot
- One-time legacy migration (first-login-claims)
- Auto reload 120ms on scope change
- Device-global: `ngwe_guest_mode`, `ngwe_lang`, `ngwe_theme`, `ngwe_pin*`

### v6.12.0 — S5 Wallet Identity Fix
**Problem:** `isWalletMatch()` matched by NAME (case-insensitive exact +
substring fuzzy). Two wallets sharing a display name (e.g. two "Cash")
could alias each other → balance cross-contamination.

**Fix:**
- `isWalletMatch(wallet, target, { allowNameMatch?: boolean })`
- Default = **strict ID-only**: `id` / `originalId` / `sharedDocId` /
  `shared_<uid>_<id>` prefix stripping
- Name matching enabled only via `{ allowNameMatch: true }`
- `resolveTransactionWallet` step 1 = strict-first (id → strict →
  legacy name fallback)
- `resolveTransactionWallet` note-based fallbacks (senderMatch,
  targetMatch) now pass `{ allowNameMatch: true }`
- Test count **33 → 40** (7 new: strict mode, legacy mode, duplicate-name
  regression)

**Verified:** typecheck + build:safe (2397 modules, 9.80s) + 40/40 tests

---

## 📊 Progress Tracker

| Phase | Task | Status |
|---|---|---|
| P1.1–1.3 | Security | ✅ |
| P2.1 | Debt logic | ✅ |
| P2.4 | Import validation | ✅ |
| P3.2.2 | Notification UX | ✅ |
| P3.1 (S3) | Sync signature canonical | ✅ v6.10.0 |
| P3.3 (S4) | LocalStorage user scope | ✅ v6.11.0 |
| P3.4 (S5) | Wallet identity fix | ✅ v6.12.0 |
| P4.x (S6–S8) | App.tsx refactor | ❌ 4–6 sessions |

**Overall: 9/10 complete (90%)**

---

## 🎯 Next Session — Options

### **Option 1 — App.tsx Refactor (S6–S8)** 🔴 HIGH | 4–6 sessions
Split 2,200 lines into:
- `AppBootstrap.tsx`
- `AppAuthGate.tsx`
- `AppDataProvider.tsx`
- `AppCloudSync.tsx`
- `AppNotifications.tsx`
- `AppRoutes.tsx`

### **Option 2 — i18n Completion** 🟡 MEDIUM | 1–2 sessions
~58 inline `lang === 'my' ? ... : ...` strings remain.
- Migrate all to `src/utils/i18n.ts` dictionary
- Coverage complete → easier to add new languages

### **Option 3 — `updatedAt`/`deletedAt` on entities** 🟡 | 1 session
- Add optional fields to Transaction/Debt/Wallet types
- Populate in handlers
- Enables future conflict resolution

### **Option 4 — Guest data → Cloud migration** 🟡 | 1 session
- Guest user creates data → login → offers opt-in merge
- Currently guest data stays local-only

---

## 🔧 Session Rules (unchanged)

### ⚠️ PowerShell ❌ (Myanmar/emoji) → Node.js (.cjs) ✅
- All Myanmar/emoji file edits go through `.cjs` scripts
- Scripts live at ROOT (`D:\Ngwesaryin\xxx.cjs`), no subfolder
- Every patch script: `--dry-run` + idempotent + `.bak-<timestamp>` + auto-verify

### ⚠️ Build before push
```
npm run typecheck
npm run build:safe
npm run test
```

### ⚠️ .gitignore protects:
```
*.bak-*
*.backup-*
v6.*.cjs
.env
```

### ⚠️ NEVER `npm audit fix --force`
Rollback: `npm install firebase@12`

### ⚠️ Firebase rules deploy — backup first

---

## 📁 Key Files

| File | Purpose | Lines |
|---|---|---|
| `src/App.tsx` | Root orchestrator | ~2,200 |
| `src/types.ts` | Data models | ~390 |
| `src/context/AuthContext.tsx` | Auth + sync hub | ~1,510 |
| `src/hooks/useCloudListeners.ts` | 10 Firestore listeners | ~440 |
| `src/hooks/useSyncOperations.ts` | Sync orchestration | ~520 |
| `src/hooks/useTransactionHandlers.ts` | Tx CRUD + transfer | ~640 |
| `src/hooks/useDebtHandlers.ts` | Debt + repayment | ~600 |
| `src/hooks/useWalletHandlers.ts` | Wallet CRUD + sharing | ~580 |
| `src/hooks/useVehicleHandlers.ts` | Vehicle + fuel + maint | ~450 |
| `src/hooks/useDataHandlers.ts` | Shops + categories + budgets | ~440 |
| `src/lib/firebase.ts` | Firestore wrappers | ~400 |
| `src/utils/walletBalance.ts` | Balance + identity (v6.12) | ~400 |
| `src/utils/syncGuards.ts` | Sync fingerprint (v6.10) | ~130 |
| `src/utils/storage.ts` | Scoped storage (v6.11) | ~150 |
| `src/utils/__tests__/walletBalance.test.ts` | 40 unit tests | ~400 |
| `src/data/versionHistory.ts` | Changelog | ~2,900 |
| `src/components/Dashboard.tsx` | Main view | ~1,300 |
| `firestore.rules` | Firestore security | ~230 |

---

## 📦 Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server (port 3000) |
| `npm run typecheck` | TSC only |
| `npm run build:safe` | typecheck + vite build |
| `npm run test` | Vitest (40 tests) |
| `firebase deploy --only firestore:rules` | Deploy rules |
| `git push origin main` | Push |

---

## ⚠️ Known Issues

| # | Issue | Priority |
|---|---|---|
| 1 | `updatedAt`/`deletedAt` missing on entities | 🟡 |
| 2 | App.tsx too large (2,200 lines) | 🟡 |
| 3 | i18n ~58 inline strings remaining | 🟡 |
| 4 | Guest data in localStorage only | 🟡 |
| 5 | Multi-device conflict (no version field) | 🟡 |
| 6 | Shared wallet N+1 reads | 🟡 |
| 7 | Sync fingerprint cost @ 5k+ tx (~30–60ms) | 🟢 |
| 8 | `isValidId` unused rule warning | 🟢 |

---

## 🎬 Next Session Start Prompt

```
NgweSarYin App — ဆက်လုပ်ရန်

Current State:
- Version: v6.12.0
- Build: 173
- Git HEAD: 463909c v6.12.0: S5 wallet identity exact-ID matching
- Firebase: 12.19.0
- Deploy: https://ngwesaryin.pages.dev
- Rules: Deployed & Live
- Tests: 40 pass

Recent (2026-10-09):
- v6.10.0 — S3 canonical content-hash sync signature
- v6.11.0 — S4 localStorage user scope (per-uid keys)
- v6.12.0 — S5 wallet identity exact-ID matching (isWalletMatch strict default)

Next: [App.tsx refactor / i18n completion / updatedAt fields / guest→cloud migration]

Rules:
- PowerShell ❌ (Myanmar/emoji) → Node.js .cjs ✅
- Scripts at D:\Ngwesaryin\ root (no scripts/ folder)
- Every patch script: --dry-run + idempotent + .bak-<timestamp> + auto-verify
- build:safe before push
- NEVER npm audit fix --force
- Firebase rules deploy — backup first
- S3 sync signature = canonical
- S4 storage scope = canonical
- S5 wallet identity strict-by-default = canonical
```

---

**Session ကောင်းခဲ့တယ်! v6.10 + v6.11 + v6.12 သုံးခုလုံး production-safe
ဖြစ်သွားပြီ။ Progress 90% ရောက်ပြီ။ Test coverage 33 → 40 တိုးလာပြီ။**

*Handover v6.12 — 2026-10-09*
*Git HEAD: 463909c v6.12.0: S5 wallet identity exact-ID matching*
