# 📋 NgweSarYin App — Session Handover (v6.19.0)

**Created:** 2026-10-09
**Previous:** v6.18.0 → v6.19.0 (Phase 3b-prep)

---

## 🎯 Project Overview

**App:** NgweSarYin (ငွေစာရင်း)
**Current Version:** v6.19.0
**Build:** 181
**Git HEAD:** `bdfd2e0 chore: root cleanup — remove .cjs scripts, .bak files, old handovers`

---

## ✅ Sessions Completed

- v6.10 → v6.15.0 — Foundation + v7.0 conflict resolution
- v6.16.0 / 6.16.1 — Security Phase 1 (5 rules fixes, deployed)
- v6.17.0 — Security Phase 2 (premium trial hardening, deployed)
- v6.18.0 — Security Phase 3a (sharedWalletRefs infrastructure, deployed)
- **v6.19.0 — Phase 3b-prep (this session):** ref backfill

**What v6.19.0 does:**
- `backfillMyRefs()` in `sharedWalletService.ts`
- One-shot boot effect in `App.tsx` (per login)
- Writes a `sharedWalletRefs/{email}/wallets/{docId}` pointer for
  every existing share
- Idempotent
- **Rules UNCHANGED** — `sharedWallets list: if isSignedIn()` still open

---

## ⚠️ Verify refs BEFORE v6.20.0

**Do not start v6.20.0 until you confirm refs are populated.**

1. Log in as the wallet owner (or family member sharing)
2. Open app briefly (backfill runs on boot)
3. Firebase Console → Firestore → `sharedWalletRefs`
   - Should show `{recipientEmail}` documents
   - Each should have `wallets/{ownerUid}_{walletId}` subdoc
4. Log in as recipient → confirm shared wallet still appears

**If refs are empty after a few boots:**
- Check browser console for `[v6.19.0] backfilled N` messages
- Or `[v6.19.0] ref backfill notice` errors

---

## 🎯 Next Session — v6.20.0

**Task:** Close the list leak (FINAL step of Phase 3).

1. `firestore.rules`: `sharedWallets list: if isSignedIn()` → `if false`
2. Deploy rules
3. Handover v6.20

**Risk:** 🔴 HIGH — if any device hasn't populated refs yet, that user's
shared wallets disappear until they log back in.

**Deploy-time check:** Re-read the "Verify refs" section above.

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
| `firestore.rules` | v6.18 (Phase 3a) deployed, list still open |
| `src/lib/sharedWalletRefs.ts` | Ref collection helpers |
| `src/lib/sharedWalletService.ts` | Ref writes + backfill |
| `src/App.tsx` | Boot backfill effect |
| `src/utils/conflictResolver.ts` | Conflict detection |
| `src/components/ConflictBanner.tsx` | Conflict UI |

---

## 🎬 Next Session Start Prompt

```
NgweSarYin App — ဆက်လုပ်ရန်

Current State:
- Version: v6.19.0
- Build: 181
- Git HEAD: bdfd2e0 chore: root cleanup — remove .cjs scripts, .bak files, old handovers
- Firebase: 12.19.0
- Rules: v6.18 deployed (Phase 3a), list still open
- Tests: 40 pass

Recent (2026-10-09):
- v6.16.0 — Security Phase 1
- v6.17.0 — Security Phase 2
- v6.18.0 — Security Phase 3a (refs infrastructure)
- v6.19.0 — Phase 3b-prep (boot backfill)

Next: [v6.20.0 close sharedWallets list / App.tsx refactor / Capacitor APK / i18n]

Rules:
- PowerShell ❌ (Myanmar/emoji) → Node.js .cjs ✅
- Build before push
- NEVER npm audit fix --force
- Firebase rules deploy — backup first
- VERIFY refs in Firestore Console BEFORE v6.20.0 closes list rule
```

---

*Handover v6.19.0 — 2026-10-09*
*Git HEAD: bdfd2e0 chore: root cleanup — remove .cjs scripts, .bak files, old handovers*
