# 📋 NgweSarYin App — Session Handover (v6.11.0)

**Created:** 2026-10-09 (end of session)
**Previous:** v6.10.0 → v6.11.0

---

## 🎯 Project Overview

**App:** NgweSarYin (ငွေစာရင်း) — Income, Expense & Debt Manager
**Tech Stack:** React 19 + Vite 6.4.4 + Firebase 12.19.0 + Tailwind 4
**Deploy:** Cloudflare Pages (`ngwesaryin.pages.dev`)
**Repo:** `D:\Ngwesaryin` (GitHub: `shinethit/ngwesaryin`, branch `main`)
**Current Version:** v6.11.0
**Build:** 172
**Git HEAD:** `5d61612 v6.11.0: S4 localStorage user scope`
**Firebase Project:** `ngwesaryin`

---

## ✅ Sessions Completed

### v6.10.0 — S3 Canonical Content-Hash Sync Signature
**Problem:** `count+sum+firstId` heuristic missed note/category/date/walletId
edits and offsetting amount changes → cloud write silently skipped.

**Fix:**
- `computeContentFingerprint<T>()` in `src/utils/syncGuards.ts`
- FNV-1a 32-bit content hash, order-independent, strips Firestore metadata
- `computeSyncSignature()` rewritten — 10 fingerprint strings
- `AuthContext.tsx → syncDataToCloud` call site updated
- No migration needed (works on existing records)

### v6.11.0 — S4 LocalStorage User Scope
**Problem:** Keys like `ngwe_transactions` were device-global → switching
Account A → B leaked A's data into B's session.

**Fix (`src/utils/storage.ts`):**
- Overrode `localStorage.getItem/setItem/removeItem` at source
- Every `ngwe_*` key transparently prefixed with `_u_<scope>_`
- Scope = current uid, or `'guest'`
- Auto-restore last-known scope on cold boot (before Firebase auth resolves)
- One-time legacy migration (first-login-claims)
- Auto reload (120ms) on scope change to reinitialize React state
- Device-global keys preserved: `ngwe_guest_mode`, `ngwe_lang`,
  `ngwe_theme`, `ngwe_pin*`

**Wired into `AuthContext.tsx`:**
- `setStorageScope(currentUser ? currentUser.uid : 'guest')` in
  `onAuthStateChanged`
- All 27 `ngwe_*` keys cataloged (25 scoped, 2 device-global)

**Verified:** typecheck + build:safe (2397 modules) + 33/33 tests pass

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
| P3.4 (S5) | Wallet identity fix | ❌ 🔴 **NEXT** |
| P4.x (S6–S8) | App.tsx refactor | ❌ 4–6 sessions |

**Overall: 8/10 complete (80%)**

---

## 🎯 Next Session — S5 Wallet Identity Fix

**Risk:** 🔴 HIGH | **Time:** 2–3 hours
**File:** `src/utils/walletBalance.ts`

**Issue:** `isWalletMatch()` matches by wallet **NAME** — duplicate "Cash"
wallets can cross-match. Two wallets with the same display name and any
similar string will alias to each other.

**Fix strategy:**
1. Exact ID match ONLY for normal transactions (`walletId` — already
   present on every tx)
2. Fuzzy name match reserved **exclusively** for legacy repair paths
   (`repairOrphanedTransactions` for pre-v5 records missing walletId)
3. Add explicit `isLegacyRepair` flag to disambiguate the two modes
4. Ensure `sharedDocId` / `originalId` matching stays exact

**Verification:**
- Existing 33 tests must pass (8 target `isWalletMatch`)
- Add 3-4 new tests for duplicate-name scenarios

---

## 🔧 Session Rules (unchanged)

### ⚠️ PowerShell ❌ (Myanmar/emoji) → Node.js (.cjs) ✅
- All Myanmar/emoji file edits go through `.cjs` scripts
- Scripts live at ROOT (`D:\Ngwesaryin\xxx.cjs`), no subfolder
- Every patch script: `--dry-run` support + idempotent + `.bak-<timestamp>`

### ⚠️ Build before push
```
npm run typecheck
npm run build:safe
npm run test
```

### ⚠️ .gitignore protects against:
```
*.bak-*
*.backup-*
v6.*.cjs
.env
```

### ⚠️ NEVER `npm audit fix --force`
Firebase 12 → 13 ရောက်ပြီး App ပျက်။ Rollback: `npm install firebase@12`

### ⚠️ Firebase rules deploy — backup first
```
firebase deploy --only firestore:rules
```

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
| `src/utils/walletBalance.ts` | Balance engine (S5 target) | ~370 |
| `src/utils/syncGuards.ts` | Sync fingerprint (v6.10) | ~130 |
| `src/utils/storage.ts` | Scoped storage (v6.11) | ~150 |
| `src/utils/i18n.ts` | Translations dict | ~120 |
| `src/utils/pinHash.ts` | PBKDF2 PIN hashing | ~150 |
| `src/utils/deletedMarkers.ts` | Resurrection guard | ~80 |
| `src/data/versionHistory.ts` | Changelog | ~2,750 |
| `src/components/Dashboard.tsx` | Main view | ~1,300 |
| `src/components/FinancialSummaryTable.tsx` | Open/Close view | ~500 |
| `src/components/AccountModal.tsx` | Account + settings | ~700 |
| `firestore.rules` | Firestore security | ~230 |

---

## 📦 Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server (port 3000) |
| `npm run typecheck` | TSC only |
| `npm run build:safe` | typecheck + vite build |
| `npm run test` | Vitest (33 tests) |
| `firebase deploy --only firestore:rules` | Deploy rules |
| `git push origin main` | Push |

---

## ⚠️ Known Issues

| # | Issue | Priority |
|---|---|---|
| 1 | Wallet name-based fuzzy matching (S5) | 🔴 |
| 2 | `updatedAt`/`deletedAt` missing on entities | 🟡 |
| 3 | App.tsx too large (2,200 lines) | 🟡 |
| 4 | i18n ~58 inline strings remaining | 🟡 |
| 5 | Guest data in localStorage only | 🟡 |
| 6 | Multi-device conflict (no version field) | 🟡 |
| 7 | Shared wallet N+1 reads | 🟡 |
| 8 | Sync fingerprint cost @ 5k+ tx (~30-60ms) | 🟢 |
| 9 | `isValidId` unused rule warning | 🟢 |

---

## 🎬 Next Session Start Prompt

```
NgweSarYin App — ဆက်လုပ်ရန်

Current State:
- Version: v6.11.0
- Build: 172
- Git HEAD: 5d61612 v6.11.0: S4 localStorage user scope
- Firebase: 12.19.0
- Deploy: https://ngwesaryin.pages.dev
- Rules: Deployed & Live
- Tests: 33 pass

Recent (2026-10-09):
- v6.10.0 — S3 canonical content-hash sync signature
- v6.11.0 — S4 localStorage user scope (per-uid keys)

Next: S5 — Wallet identity exact-ID matching (🔴 HIGH, walletBalance.ts)

Rules:
- PowerShell ❌ (Myanmar/emoji) → Node.js .cjs ✅
- Scripts at D:\Ngwesaryin\ root (no scripts/ folder)
- Every patch script: --dry-run + idempotent + .bak-<timestamp>
- build:safe before push
- NEVER npm audit fix --force
- Firebase rules deploy — backup first
- Sync logic မထိ (S3 = canonical)
- Storage scope မထိ (S4 = canonical)
```

---

**Session ကောင်းခဲ့တယ်! v6.10 + v6.11 နှစ်ခုလုံး production-safe
ဖြစ်သွားပြီ။ Progress 80% ရောက်ပြီ။ Reliability ⭐⭐⭐⭐ ခိုင်မာသွားပြီ။**

*Handover v6.11 — 2026-10-09*
*Git HEAD: 5d61612 v6.11.0: S4 localStorage user scope*
