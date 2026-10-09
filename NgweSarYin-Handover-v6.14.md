# 📋 NgweSarYin App — Session Handover (v6.14.0)

**Created:** 2026-10-09
**Previous:** v6.13.1 → v6.14.0 (Phase 1 of v7.0)

---

## 🎯 Project Overview

**App:** NgweSarYin (ငွေစာရင်း) — Income, Expense & Debt Manager
**Tech Stack:** React 19 + Vite 6.4.4 + Firebase 12.19.0 + Tailwind 4
**Deploy:** Cloudflare Pages (`ngwesaryin.pages.dev`)
**Repo:** `D:\Ngwesaryin`
**Current Version:** v6.14.0
**Build:** 176
**Git HEAD:** `abedda3 v6.13.1: complete updatedAt coverage (Debt + Budget)`
**Firebase Project:** `ngwesaryin`

---

## ✅ Sessions Completed

### v6.10 → v6.13.1 (recap)
- v6.10.0 — S3 canonical content-hash sync signature
- v6.11.0 — S4 localStorage user scope
- v6.12.0 — S5 wallet identity exact-ID matching
- v6.13.0 — Entity updatedAt fields (9 types)
- v6.13.1 — updatedAt coverage completion (Debt + Budget)

### v6.14.0 — v7.0 Phase 1 (this session)
**Purpose:** Lay foundation for multi-device conflict detection.

**Changes:**
- Added `version?: number` + `lastEditedBy?: string` to 10 entity types
  (Transaction, Debt, Wallet, Category, BudgetConfig, ShopContact,
   Vehicle, FuelLog, VehicleMaintenance, TirePressureLog)
- Handlers populate on every create / edit:
  - Create → `version: 1, lastEditedBy: user?.uid || 'guest'`
  - Edit → `version: (prev.version || 0) + 1`
- Fully compatible with S3 content-hash
- **Firestore rules NOT touched** (S2 task)

**Verified:** typecheck + build:safe + 40/40 tests

---

## 🎯 v7.0 Roadmap

| Phase | Task | Status |
|---|---|---|
| **S1** | version + lastEditedBy fields | ✅ **v6.14.0** |
| **S2** | Firestore rules + version-checked writes | ⏳ Next |
| **S3** | Conflict detection + merge logic | ⏳ |
| **S4** | Conflict UI Modal + tests | ⏳ |

---

## 🎯 Next Session — v7.0 S2

**Task:** Version-checked writes at Firestore level.
- Rules မှာ `version` field check
- Optimistic locking (write fail if version mismatch)
- **⚠️ HIGH RISK** — rules backup မဖြစ်မနေ
- **⚠️ Current rules copy ထားပါ** (Console မှ)

---

## 🔧 Session Rules (unchanged)

### ⚠️ PowerShell ❌ (Myanmar/emoji) → Node.js (.cjs) ✅
- All Myanmar/emoji file edits via `.cjs` scripts
- Scripts at ROOT (`D:\Ngwesaryin\xxx.cjs`)
- Every patch: `--dry-run` + idempotent + `.bak-<timestamp>` + auto-verify

### ⚠️ Build before push
```
npm run typecheck
npm run build:safe
npm run test
```

### ⚠️ .gitignore:
```
*.bak-*
*.backup-*
v6.*.cjs
i18n-scan.cjs
i18n-scan-report.txt
.env
```

### ⚠️ NEVER `npm audit fix --force`

### ⚠️ Firebase rules deploy — backup first

---

## 📁 Key Files

| File | Purpose | Lines |
|---|---|---|
| `src/App.tsx` | Root orchestrator | ~2,200 |
| `src/types.ts` | Data models (updatedAt + version) | ~430 |
| `src/context/AuthContext.tsx` | Auth + sync hub | ~1,510 |
| `src/hooks/useTransactionHandlers.ts` | Tx CRUD (+version) | ~680 |
| `src/hooks/useDebtHandlers.ts` | Debt + repayment (+version) | ~630 |
| `src/hooks/useWalletHandlers.ts` | Wallet CRUD (+version) | ~600 |
| `src/hooks/useVehicleHandlers.ts` | Vehicle + fuel (+version) | ~475 |
| `src/hooks/useDataHandlers.ts` | Shops/categories/budgets (+version) | ~465 |
| `src/utils/walletBalance.ts` | Balance (S5) | ~400 |
| `src/utils/syncGuards.ts` | Sync fingerprint (S3) | ~130 |
| `src/utils/storage.ts` | Scoped storage (S4) | ~150 |
| `src/data/versionHistory.ts` | Changelog | ~3,150 |
| `firestore.rules` | Firestore security | ~230 |

---

## ⚠️ Known Issues

| # | Issue | Priority |
|---|---|---|
| 1 | App.tsx too large | 🟡 |
| 2 | i18n ~2,794 strings | 🟡 |
| 3 | Guest → Cloud migration missing | 🟡 |
| 4 | Firestore rules version-check | 🎯 **v7.0 S2** |
| 5 | Conflict UI not built | 🎯 v7.0 S4 |
| 6 | Shared wallet N+1 reads | 🟡 |
| 7 | Sync fingerprint cost @ 5k+ tx | 🟢 |

---

## 🎬 Next Session Start Prompt

```
NgweSarYin App — ဆက်လုပ်ရန်

Current State:
- Version: v6.14.0
- Build: 176
- Git HEAD: abedda3 v6.13.1: complete updatedAt coverage (Debt + Budget)
- Firebase: 12.19.0
- Deploy: https://ngwesaryin.pages.dev
- Rules: Deployed & Live
- Tests: 40 pass

Recent (2026-10-09):
- v6.10.0 — S3 canonical content-hash sync signature
- v6.11.0 — S4 localStorage user scope
- v6.12.0 — S5 wallet identity exact-ID matching
- v6.13.0 — entity updatedAt fields
- v6.13.1 — updatedAt coverage completion
- v6.14.0 — v7.0 S1: version + lastEditedBy fields

Next: [v7.0 S2 Firestore rules / App.tsx refactor / i18n top-3 / Capacitor APK]

Rules:
- PowerShell ❌ (Myanmar/emoji) → Node.js .cjs ✅
- Scripts at D:\Ngwesaryin\ root
- --dry-run + idempotent + .bak-<timestamp> + auto-verify
- build:safe before push
- NEVER npm audit fix --force
- Firebase rules deploy — backup first
- S3/S4/S5/updatedAt = canonical
- v6.14.0 version/lastEditedBy = foundation for conflict UI
```

---

**v7.0 Phase 1 ပြီးသွားပါပြီ။ Conflict detection ရဲ့ အခြေခံ field များ
အားလုံး ရှိပြီဖြစ်ပါသည်။**

*Handover v6.14.0 — 2026-10-09*
*Git HEAD: abedda3 v6.13.1: complete updatedAt coverage (Debt + Budget)*
