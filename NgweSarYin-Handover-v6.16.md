# 📋 NgweSarYin App — Session Handover (v6.16.0)

**Created:** 2026-10-09
**Previous:** v6.15.0 → v6.16.0 (Security Phase 1)

---

## 🎯 Project Overview

**App:** NgweSarYin (ငွေစာရင်း) — Income, Expense & Debt Manager
**Tech Stack:** React 19 + Vite 6.4.4 + Firebase 12.19.0 + Tailwind 4
**Current Version:** v6.16.0
**Build:** 178
**Git HEAD:** `e3e912a v6.15.0: v7.0 conflict resolution complete (detection + UI)`

---

## ✅ Sessions Completed

### v6.10 → v6.15.0 (foundation)
- S3/S4/S5 sync + storage + wallet identity
- v6.13.0/6.13.1 — entity updatedAt
- v6.14.0 — version + lastEditedBy
- v6.15.0 — v7.0 conflict resolution complete

### v6.16.0 — Security Phase 1 (this session)
**5 rules fixes:**
1. Transaction update validation
2. Visitors field whitelist + immutable critical fields
3. public_shops ownership immutability
4. User creation plan restriction
5. Shared wallet transaction CRUD split + validation

**⚠️ Rules NOT deployed — see deploy sequence below.**

---

## 🎯 Deploy Sequence

**1. Backup current rules** (Firebase Console → Firestore → Rules → copy to file)

**2. Commit code:**
```
git add -A
git commit -m "v6.16.0: Firestore rules hardening (Phase 1)"
git push origin main
```

**3. Deploy rules:**
```
firebase deploy --only firestore:rules
```

**4. Test with 2 accounts:**
- Account A: add/edit transaction, add wallet, share wallet
- Account B: try to write Account A's data (should fail)
- Both: verify sync works

**5. Rollback if broken:**
Console → Rules → paste backup → Publish
OR use the auto-created `firestore.rules.bak-<timestamp>` file.

---

## 🎯 Phase 2 (Remaining Security)

| # | Finding | Needs | Risk |
|---|---|---|---|
| **#1** | sharedWallets collection-wide list leak | Per-user subcollection | 🔴 HIGH |
| **#3** | Premium bypass (self-write plan) | Cloud Function | 🔴 HIGH |
| **#5** | Collaborator permission levels | Rules + client map | 🟡 MED |

**Do NOT deploy public release until #1 and #3 are fixed.**

---

## 🎯 Next Session Options

1. **Security Phase 2** — 2 sessions, 🔴 HIGH
2. **App.tsx refactor** — 4–6 sessions
3. **i18n top 3** — 2–3 sessions
4. **Capacitor APK Phase 1** — 1–2 sessions

---

## 🔧 Session Rules

### ⚠️ PowerShell ❌ (Myanmar/emoji content) → Node.js .cjs ✅
### ⚠️ PowerShell ✅ (rules deploy, git, filename ops)

### ⚠️ Build before push
```
npm run typecheck
npm run build:safe
npm run test
```

### ⚠️ NEVER `npm audit fix --force`
### ⚠️ Firebase rules deploy — backup first

---

## 🎬 Next Session Start Prompt

```
NgweSarYin App — ဆက်လုပ်ရန်

Current State:
- Version: v6.16.0
- Build: 178
- Git HEAD: e3e912a v6.15.0: v7.0 conflict resolution complete (detection + UI)
- Firebase: 12.19.0
- Deploy: https://ngwesaryin.pages.dev
- Rules: v6.16 PATCHED (deploy manually after backup)
- Tests: 40 pass

Recent (2026-10-09):
- v6.10.0 → v6.15.0 — Foundation + v7.0
- v6.16.0 — Security Phase 1 (5 rules fixes)

Next: [Security Phase 2 / App.tsx refactor / Capacitor APK / i18n]

Rules:
- PowerShell ❌ (Myanmar/emoji) → Node.js .cjs ✅
- PowerShell ✅ (rules deploy, git ops)
- Build before push
- NEVER npm audit fix --force
- Firebase rules deploy — backup first
```

---

*Handover v6.16.0 — 2026-10-09*
*Git HEAD: e3e912a v6.15.0: v7.0 conflict resolution complete (detection + UI)*
