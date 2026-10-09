# 📋 NgweSarYin App — Session Handover (v6.21.0)

**Created:** 2026-10-09
**Previous:** v6.20.0 → v6.21.0 (Security Phase 4)

---

## 🎯 Project Overview

**App:** NgweSarYin (ငွေစာရင်း)
**Current Version:** v6.21.0
**Build:** 183
**Git HEAD:** `d812690 v6.20.0: close sharedWallets list + live refs`

---

## ✅ v6.21.0 — Phase 4 Fixes (from v6.20 review)

**Critical #1 — Shared wallet member permission bypass**
- Before: member could edit `sharedWith` and `collaboratorPermissions`
- After: owner-only for those fields; members can only update
  `balance` and `updatedAt`

**High A — Shared tx permission map enforcement**
- Before: any member could create/update/delete any shared tx
- After: rules check `sharedTxPerm(walletId, action, type)`
  against the wallet's `collaboratorPermissions` map

**High D — sharedWalletRefs spoofing**
- Before: any signed-in user could write refs into any email's path
- After: `request.resource.data.ownerUid == request.auth.uid`

**Rules deployed** ✅

---

## ⚠️ Remaining (from review — deferred)

**High B — Collaborator writes too broadly**
`canWrite(userId)` allows any collaborator to write debts, wallets,
categories, budgets, vehicles. Should be split into workspace-level
vs wallet-level permissions.

**High C — Premium trial not server-atomic**
Client still computes expiry timestamp. Should be Cloud Function
(requires Blaze plan).

**High E — No Emulator tests**
Firestore Rules Emulator tests are needed for:
1. Non-member cannot get shared wallet
2. Non-member cannot list shared wallets (already done v6.20)
3. Member cannot edit sharedWith (NEW v6.21)
4. Member cannot edit collaboratorPermissions (NEW v6.21)
5. Viewer cannot create/edit/delete tx (NEW v6.21)
6. Owner can manage member permissions
7. Trial cannot be claimed twice or with invalid expiry
8. Collaborator cannot write unrelated user collections

---

## 🎯 Launch Status

**Beta launch: SAFE after v6.21.0** ✅
Review recommends "limited beta" is possible.

**Official stable launch: NOT YET**
Waiting for:
- High B (workspace role split)
- High E (Emulator tests)

**Facebook messaging reminder (from review):**
DON'T SAY: "100% secure", "Bank-level security",
"Security Phase Complete", "No P0", "Money Lover/Drivvo ထက် ပိုကောင်း"
DO SAY: "Beta", "Security နဲ့ sync ဆက်လက်တိုးတက်နေတယ်",
"Backup ထားပါ", "Feedback လိုအပ်ပါတယ်"

---

## 🎯 Next Session Options

1. **High B** — Split workspace vs wallet permissions
2. **High E** — Firestore Rules Emulator tests
3. **High C** — Cloud Function premium (Blaze plan needed)
4. **App.tsx refactor** — 4-6 sessions
5. **Capacitor APK** — 1-2 sessions

---

## 🔧 Session Rules

### ⚠️ PowerShell ❌ (Myanmar/emoji content) → Node.js .cjs ✅
### ⚠️ PowerShell ✅ (rules deploy, git, filename ops)
### ⚠️ Build before push
### ⚠️ NEVER `npm audit fix --force`
### ⚠️ Firebase rules deploy — backup first

---

## 🎬 Next Session Start Prompt

```
NgweSarYin App — ဆက်လုပ်ရန်

Current State:
- Version: v6.21.0
- Build: 183
- Git HEAD: d812690 v6.20.0: close sharedWallets list + live refs
- Firebase: 12.19.0
- Rules: v6.21 deployed (Phase 4 done)
- Tests: 40 pass

Recent (2026-10-09):
- v6.16 → v6.20 — Security Phase 1, 2, 3
- v6.21.0 — Security Phase 4 (Critical + High A + High D fixed)

Remaining High issues:
- High B: workspace vs wallet permission split
- High C: Cloud Function premium (Blaze needed)
- High E: Firestore Rules Emulator tests

Next: [High B / High E / High C / App.tsx refactor / Capacitor APK]

Rules:
- PowerShell ❌ (Myanmar/emoji) → Node.js .cjs ✅
- Build before push
- NEVER npm audit fix --force
- Firebase rules deploy — backup first
- Beta launch OK; official stable needs High B + E
```

---

*Handover v6.21.0 — 2026-10-09*
*Git HEAD: d812690 v6.20.0: close sharedWallets list + live refs*
