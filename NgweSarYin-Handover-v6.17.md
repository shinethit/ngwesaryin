# 📋 NgweSarYin App — Session Handover (v6.17.0)

**Created:** 2026-10-09
**Previous:** v6.16.0 → v6.17.0 (Security Phase 2)

---

## 🎯 Project Overview

**App:** NgweSarYin (ငွေစာရင်း)
**Stack:** React 19 + Vite 6.4.4 + Firebase 12.19.0 + Tailwind 4
**Deploy:** Cloudflare Pages (`ngwesaryin.pages.dev`)
**Current Version:** v6.17.0
**Build:** 179
**Git HEAD:** `6f2d1b6 v6.16.0: Firestore rules hardening (Phase 1)`
**Firebase Project:** `ngwesaryin`

---

## ✅ Sessions Completed (this session)

### v6.16.0 — Security Phase 1
Rules hardening: tx update validation, visitors whitelist,
public_shops immutable, user create plan restriction,
shared wallet tx CRUD split.

### v6.17.0 — Security Phase 2 (this)
**Premium trial hardening** — blocks DevTools bypass:
- premiumMonths must be exactly 3
- premiumActivatedAt must be null (never had premium)
- premiumExpiresAt must be a plausible ISO string
- premiumCodeUsed must be empty during trial claim

**Cleanup:**
- Removed unused `isValidId`
- Documented sharedWallets list limitation in rules

**Rules deployed** — Firebase confirm ✅

---

## ⚠️ Remaining Security Work (Architecture Required)

### P0 #1 — sharedWallets list leak 🔴
**Problem:** `allow list: if isSignedIn()` — any signed-in user can
list ALL shared wallet docs. Firestore rules cannot enforce WHERE-clause
filtering on list queries — this is a fundamental Firestore limitation.

**Fix requires:**
1. Create `users/{uid}/sharedWalletRefs/{docId}` subcollection listing
   wallet doc IDs shared with this user
2. Owner share → also writes ref to recipient's subcollection
3. Client reads `users/{uid}/sharedWalletRefs` (uid-scoped, rules-protected)
4. Client `get()`s each `sharedWallets/{docId}` directly
5. Rules: `allow list: if false` on sharedWallets; scoped on refs subcoll

**Estimated effort:** 2 sessions + client refactor

### P0 #2 — Collaborator permission levels 🟡
**Problem:** Rules don't check per-wallet `collaboratorPermissions` map.

**Fix:** Rules-level wallet permission check in tx/debt/wallet writes.

**Estimated effort:** 1 session

### P0 #3 — Cloud Function for premium 🔴
**Problem:** Trial expiry date math isn't server-validated.

**Fix:** Cloud Function (requires Blaze plan).

**Alternative:** Skip — v6.17.0 rules hardening already blocks the
common DevTools bypass attack.

---

## 📊 Progress

**Foundation + v7.0: 100%**
**Security Phase 1: 100%**
**Security Phase 2 (rules-only): 100%**
**Security Phase 2 (architecture): 0%** (next session, if desired)

---

## 🎯 Next Session Options

1. **Security Architecture** (sharedWallets ref collection + collaborator perms) — 2-3 sessions
2. **App.tsx refactor** — 4-6 sessions
3. **Capacitor APK Phase 1** — 1-2 sessions
4. **i18n top 3** — 2-3 sessions

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
| `firestore.rules` | Firestore security (v6.17 hardened, deployed) |
| `src/utils/conflictResolver.ts` | Conflict detection engine |
| `src/components/ConflictBanner.tsx` | Conflict UI |
| `src/hooks/useCloudListeners.ts` | 10 listeners + conflict detection |
| `src/App.tsx` | Root orchestrator |

---

## 🎬 Next Session Start Prompt

```
NgweSarYin App — ဆက်လုပ်ရန်

Current State:
- Version: v6.17.0
- Build: 179
- Git HEAD: 6f2d1b6 v6.16.0: Firestore rules hardening (Phase 1)
- Firebase: 12.19.0
- Deploy: https://ngwesaryin.pages.dev
- Rules: Deployed (v6.17 — Phase 2 rules-only complete)
- Tests: 40 pass

Recent (2026-10-09):
- v6.10.0 → v6.15.0 — Foundation + v7.0 conflict resolution
- v6.16.0 — Security Phase 1 (5 rules fixes, deployed)
- v6.17.0 — Security Phase 2 (premium trial hardening, deployed)

Next: [sharedWallets architecture / collaborator perms / App.tsx refactor / Capacitor APK]

Rules:
- PowerShell ❌ (Myanmar/emoji) → Node.js .cjs ✅
- PowerShell ✅ (rules deploy, git ops)
- Build before push
- NEVER npm audit fix --force
- Firebase rules deploy — backup first
- Residual: sharedWallets list leak needs per-user ref collection
```

---

*Handover v6.17.0 — 2026-10-09*
*Git HEAD: 6f2d1b6 v6.16.0: Firestore rules hardening (Phase 1)*
