# 📋 NgweSarYin App — Session Handover (v6.18.0)

**Created:** 2026-10-09
**Previous:** v6.17.0 → v6.18.0 (Security Phase 3a — Additive)

---

## 🎯 Project Overview

**App:** NgweSarYin (ငွေစာရင်း)
**Stack:** React 19 + Vite 6.4.4 + Firebase 12.19.0 + Tailwind 4
**Current Version:** v6.18.0
**Build:** 180
**Git HEAD:** `4e9b6cd v6.17.0: harden premium trial rules (Phase 2)`

---

## ✅ Sessions Completed

### v6.10 → v6.15.0 — Foundation + v7.0 conflict resolution
### v6.16.0 — Security Phase 1 (5 rules fixes, deployed)
### v6.17.0 — Security Phase 2 (premium trial hardening, deployed)

### v6.18.0 — Security Phase 3a (this session, ADDITIVE)
**New infrastructure:**
- `src/lib/sharedWalletRefs.ts` — per-recipient pointer collection
- Ref write in `syncSharedWalletToCloud` (owner side)
- Ref read merge in `subscribeIncomingSharedWallets` (recipient side)
- Ref cleanup in `leaveSharedWallet` + unshare-all
- Rules block for `sharedWalletRefs/{email}/wallets/{docId}`
- Rules deployed to Firebase

**NOT changed (deliberate):**
- `sharedWallets list: if isSignedIn()` — still allowed for backward compat
- Legacy `where('sharedWith','array-contains', email)` query — still runs in parallel
- Existing shared wallets — unchanged, still work

---

## ⚠️ CRITICAL — Read this before next session

**The sharedWallets list leak is NOT yet fixed.** It requires:
1. Refs to be fully populated on all devices
2. Next session (v6.19.0) to disable legacy query + set `list: if false`

**Estimated ref population time:** ~1-2 days of normal app usage.
Refs are written automatically whenever `syncSharedWalletToCloud`
runs (on wallet save, share update, etc).

**Verify before v6.19.0:**
- Open app in both accounts (owner + recipient)
- Owner: open Account modal → manual sync (triggers ref write)
- Recipient: shared wallet should appear
- Firebase Console → Firestore → `sharedWalletRefs` → confirm docs exist

---

## 🎯 Next Session — v6.19.0 (Phase 3b)

**Task:** Turn off legacy query + list rule.

1. `sharedWalletService.subscribeIncomingSharedWallets` — remove legacy query
2. `sharedWallets list: if isSignedIn()` → `if false`
3. Deploy rules
4. Test 2-account shared wallet flow

**Risk:** 🔴 HIGH — if any device hasn't populated refs, shared wallets
will disappear for that user. **Verify refs on Firebase Console first.**

---

## 🎯 Other Next-Session Options

- **App.tsx refactor** — 4-6 sessions
- **Capacitor APK** — 1-2 sessions
- **i18n top 3** — 2-3 sessions

---

## 🔧 Session Rules

### ⚠️ PowerShell ❌ (Myanmar/emoji content) → Node.js .cjs ✅
### ⚠️ PowerShell ✅ (rules deploy, git, filename ops)
### ⚠️ Build before push
### ⚠️ NEVER `npm audit fix --force`
### ⚠️ Firebase rules deploy — backup first

---

## 📁 Key Files

| File | Purpose |
|---|---|
| `firestore.rules` | Firestore security (v6.18, deployed) |
| `src/lib/sharedWalletRefs.ts` | **NEW** — Per-recipient pointer collection |
| `src/lib/sharedWalletService.ts` | Ref writes + merges (v6.18) |
| `src/utils/conflictResolver.ts` | Conflict detection engine |
| `src/components/ConflictBanner.tsx` | Conflict UI |
| `src/hooks/useCloudListeners.ts` | 10 listeners + conflict detection |

---

## 🎬 Next Session Start Prompt

```
NgweSarYin App — ဆက်လုပ်ရန်

Current State:
- Version: v6.18.0
- Build: 180
- Git HEAD: 4e9b6cd v6.17.0: harden premium trial rules (Phase 2)
- Firebase: 12.19.0
- Rules: Deployed (v6.18 — refs block added, list still open)
- Tests: 40 pass

Recent (2026-10-09):
- v6.10.0 → v6.15.0 — Foundation + v7.0
- v6.16.0 — Security Phase 1
- v6.17.0 — Security Phase 2
- v6.18.0 — Security Phase 3a (additive sharedWalletRefs)

Next: [v6.19.0 turn off legacy + list:false / App.tsx refactor / Capacitor APK / i18n]

Rules:
- PowerShell ❌ (Myanmar/emoji) → Node.js .cjs ✅
- Build before push
- NEVER npm audit fix --force
- Firebase rules deploy — backup first
- Verify refs populated BEFORE v6.19.0 disables sharedWallets list
```

---

*Handover v6.18.0 — 2026-10-09*
*Git HEAD: 4e9b6cd v6.17.0: harden premium trial rules (Phase 2)*
