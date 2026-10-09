# 📋 NgweSarYin App — Session Handover (v6.20.0)

**Created:** 2026-10-09
**Previous:** v6.19.0 → v6.20.0 (Security Phase 3b — COMPLETE)

---

## 🎯 Project Overview

**App:** NgweSarYin (ငွေစာရင်း)
**Current Version:** v6.20.0
**Build:** 182
**Git HEAD:** `456d02c v6.19.0: boot-time ref backfill (Phase 3b-prep)`

---

## ✅ Session Completed

**v6.20.0 — Security Phase 3b (FINAL)**
- `sharedWallets list: if false` — collection-wide leak closed
- Switched ref hydration from one-shot to live (`subscribeMyRefs`)
- Rules deployed to Firebase
- Tests: 40/40

**Security roadmap COMPLETE:**
- Phase 1 (v6.16.0/6.16.1) — 5 rules fixes
- Phase 2 (v6.17.0) — premium trial hardening
- Phase 3a (v6.18.0) — refs infrastructure
- Phase 3b-prep (v6.19.0) — backfill
- Phase 3b (v6.20.0) — list closure ✅

---

## ⚠️ If shared wallets disappear — ROLLBACK

**Instant rollback (5 sec):**
1. Firebase Console → Firestore → Rules
2. Paste from `firestore.rules.bak-<timestamp>` (this session) OR from the Console history
3. Publish

**Why rollback might be needed:** refs weren't populated on some device
before the rules change. To fix permanently: let that device boot the app
(ref backfill runs) then redeploy rules.

---

## 🎯 Remaining Optional Work

| # | Task | Sessions | Priority |
|---|---|---|---|
| 1 | App.tsx refactor (2,200 → 6 files) | 4-6 | 🟡 |
| 2 | i18n top 3 files | 2-3 | 🟡 |
| 3 | Capacitor APK | 1-2 | 🟡 |
| 4 | Cloud Function premium (server-atomic) | 1-2 | 🟢 |

**No P0 work remains.**

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
| `firestore.rules` | v6.20 (list closed, fully hardened) |
| `src/lib/sharedWalletRefs.ts` | Per-user ref collection |
| `src/lib/sharedWalletService.ts` | Live ref subscription |
| `src/App.tsx` | Boot backfill effect |
| `src/utils/conflictResolver.ts` | Conflict detection |
| `src/components/ConflictBanner.tsx` | Conflict UI |

---

## 🎬 Next Session Start Prompt

```
NgweSarYin App — ဆက်လုပ်ရန်

Current State:
- Version: v6.20.0
- Build: 182
- Git HEAD: 456d02c v6.19.0: boot-time ref backfill (Phase 3b-prep)
- Firebase: 12.19.0
- Rules: v6.20 deployed — sharedWallets list closed
- Tests: 40 pass
- Security: Phase 1 + 2 + 3 COMPLETE

Recent (2026-10-09):
- v6.16.0/6.16.1 — Security Phase 1
- v6.17.0 — Security Phase 2
- v6.18.0/6.19.0 — Security Phase 3a + prep
- v6.20.0 — Security Phase 3b (leak closed)

Next: [App.tsx refactor / Capacitor APK / i18n top-3 / Cloud Function premium]

Rules:
- PowerShell ❌ (Myanmar/emoji) → Node.js .cjs ✅
- Build before push
- NEVER npm audit fix --force
- Firebase rules deploy — backup first
- No P0 work remains
```

---

*Handover v6.20.0 — 2026-10-09*
*Git HEAD: 456d02c v6.19.0: boot-time ref backfill (Phase 3b-prep)*
