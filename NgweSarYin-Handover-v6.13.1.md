# 📋 NgweSarYin App — Session Handover (v6.13.1)

**Created:** 2026-10-09 (end of session)
**Previous:** v6.13.0 → v6.13.1

---

## 🎯 Project Overview

**App:** NgweSarYin (ငွေစာရင်း) — Income, Expense & Debt Manager
**Tech Stack:** React 19 + Vite 6.4.4 + Firebase 12.19.0 + Tailwind 4
**Deploy:** Cloudflare Pages (`ngwesaryin.pages.dev`)
**Repo:** `D:\Ngwesaryin` (GitHub: `shinethit/ngwesaryin`, branch `main`)
**Current Version:** v6.13.1
**Build:** 175
**Git HEAD:** `9b6f0e0 chore: untrack i18n scan tooling + update .gitignore`
**Firebase Project:** `ngwesaryin`

---

## ✅ Sessions Completed

### v6.10.0 — S3 Canonical Content-Hash Sync Signature
FNV-1a 32-bit content hash replaces count+sum+firstId heuristic.
Detects note/category/date/walletId edits + offsetting amounts.
No migration required.

### v6.11.0 — S4 LocalStorage User Scope
All `ngwe_*` keys prefixed with `_u_<scope>_` (uid or 'guest').
Auto-restore on boot, one-time legacy migration, 120ms reload on
scope change. Device-global keys preserved.

### v6.12.0 — S5 Wallet Identity Fix
`isWalletMatch()` default = strict ID-only.
Name matching opt-in via `{ allowNameMatch: true }` (legacy only).
Test count 33 → 40.

### v6.13.0 — Entity updatedAt Fields (Base)
Added `updatedAt?: number` to 9 types. Populated in 5 handler files.
Foundation for v7.0 conflict resolution + audit trail.

### v6.13.1 — updatedAt Coverage Completion
**v6.13.0 gap:** 2 files missed → fixed.
- `useDebtHandlers.ts` — 4 debt lifecycle handlers now set updatedAt
  (handleAddDebt, handleToggleDebtStatus, handleRecordRepaymentSubmit,
  handleEditRepayment, handleDeleteRepayment)
- `useDataHandlers.ts` — 2 budget handlers now set updatedAt
  (handleAddBudget, handleUpdateBudget)

**Verified:** typecheck + build:safe + 40/40 tests

---

## 📊 Progress Tracker

| Phase | Task | Status |
|---|---|---|
| P1.x | Security | ✅ |
| P2.1 | Debt logic | ✅ |
| P2.4 | Import validation | ✅ |
| P3.2.2 | Notification UX | ✅ |
| P3.1 (S3) | Sync signature canonical | ✅ v6.10.0 |
| P3.3 (S4) | LocalStorage user scope | ✅ v6.11.0 |
| P3.4 (S5) | Wallet identity fix | ✅ v6.12.0 |
| P3.5 | Entity updatedAt | ✅ v6.13.0 + v6.13.1 |
| P4.x (S6–S8) | App.tsx refactor | ❌ 4–6 sessions |

**Overall: 9.75/10 complete (97.5%)**

---

## 🎯 Next Session — Options

### **Option 1 — App.tsx Refactor (S6–S8)** 🔴 HIGH | 4–6 sessions
Split 2,200 lines into 6 files:
- `AppBootstrap.tsx`, `AppAuthGate.tsx`, `AppDataProvider.tsx`,
  `AppCloudSync.tsx`, `AppNotifications.tsx`, `AppRoutes.tsx`

### **Option 2 — v7.0 Multi-Device Conflict Resolution** 🔴 HIGH | 3–4 sessions
Now unblocked by updatedAt foundation:
- Add `version: number` field to entities
- Last-write-wins with UI conflict indicators
- Optimistic locking via Firestore transactions

### **Option 3 — i18n Top 3 Files** 🟡 MEDIUM | 2–3 sessions
AdminPanel (196), SpendingComparisonView (140), TransactionModal (125).
Full report at `i18n-scan-report.txt` (2,794 total, 81 files).

### **Option 4 — Guest → Cloud Migration** 🟡 MEDIUM | 1 session
Opt-in merge when guest signs in.

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
i18n-scan.cjs
i18n-scan-report.txt
.env
```

### ⚠️ NEVER `npm audit fix --force`
Firebase 12 → 13 breaks app.

### ⚠️ Firebase rules deploy — backup first

---

## 📁 Key Files

| File | Purpose | Lines |
|---|---|---|
| `src/App.tsx` | Root orchestrator | ~2,200 |
| `src/types.ts` | Data models (updatedAt complete) | ~400 |
| `src/context/AuthContext.tsx` | Auth + sync hub | ~1,510 |
| `src/hooks/useCloudListeners.ts` | 10 Firestore listeners | ~440 |
| `src/hooks/useSyncOperations.ts` | Sync orchestration | ~520 |
| `src/hooks/useTransactionHandlers.ts` | Tx CRUD + transfer + updatedAt | ~650 |
| `src/hooks/useDebtHandlers.ts` | Debt + repayment + updatedAt ✅ | ~615 |
| `src/hooks/useWalletHandlers.ts` | Wallet CRUD + sharing + updatedAt | ~590 |
| `src/hooks/useVehicleHandlers.ts` | Vehicle + fuel + maint + updatedAt | ~460 |
| `src/hooks/useDataHandlers.ts` | Shops + categories + budgets + updatedAt ✅ | ~455 |
| `src/utils/walletBalance.ts` | Balance + identity (S5) | ~400 |
| `src/utils/syncGuards.ts` | Sync fingerprint (S3) | ~130 |
| `src/utils/storage.ts` | Scoped storage (S4) | ~150 |
| `src/utils/__tests__/walletBalance.test.ts` | 40 unit tests | ~410 |
| `src/data/versionHistory.ts` | Changelog | ~3,050 |
| `firestore.rules` | Firestore security | ~230 |
| `i18n-scan-report.txt` | Full i18n audit (gitignored) | — |

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
| 1 | App.tsx too large (2,200 lines) | 🟡 |
| 2 | i18n ~2,794 inline strings across 81 files | 🟡 |
| 3 | Guest data in localStorage only | 🟡 |
| 4 | Multi-device conflict (no version field) | 🟡 → v7.0 |
| 5 | Shared wallet N+1 reads | 🟡 |
| 6 | Sync fingerprint cost @ 5k+ tx (~30–60ms) | 🟢 |
| 7 | `isValidId` unused rule warning | 🟢 |

---

## 🎬 Next Session Start Prompt

```
NgweSarYin App — ဆက်လုပ်ရန်

Current State:
- Version: v6.13.1
- Build: 175
- Git HEAD: 9b6f0e0 chore: untrack i18n scan tooling + update .gitignore
- Firebase: 12.19.0
- Deploy: https://ngwesaryin.pages.dev
- Rules: Deployed & Live
- Tests: 40 pass

Recent (2026-10-09):
- v6.10.0 — S3 canonical content-hash sync signature
- v6.11.0 — S4 localStorage user scope
- v6.12.0 — S5 wallet identity exact-ID matching
- v6.13.0 — entity updatedAt fields (9 types, 5 handlers)
- v6.13.1 — updatedAt coverage completion (Debt + Budget)

Next: [App.tsx refactor / v7.0 conflict resolution / i18n top-3 / guest→cloud migration]

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
- v6.13 updatedAt = foundation for v7.0 (now complete)
```

---

**Session ကောင်းခဲ့တယ်! v6.13.0 gap ပိတ်ပြီး entity updatedAt 100% ပြည့်စုံသွားပြီ။
Progress 97.5% ရောက်ပြီ။ Data foundation အပြည့်အဝ ခိုင်မာသွားပြီ —
v7.0 conflict resolution အတွက် အသင့်ဖြစ်ပြီ။**

*Handover v6.13.1 — 2026-10-09*
*Git HEAD: 9b6f0e0 chore: untrack i18n scan tooling + update .gitignore*
