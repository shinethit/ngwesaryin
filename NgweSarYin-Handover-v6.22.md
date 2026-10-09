# 📋 NgweSarYin App — Session Handover (v6.22.0)

**Created:** 2026-10-10
**Previous:** v6.21.1 → v6.22.0 (Security Phase 5)

---

## 🎯 Project Overview

**App:** NgweSarYin (ငွေစာရင်း)
**Current Version:** v6.22.0
**Build:** 185
**Git HEAD:** `6f6998c v6.21.1: fix shared tx permission helpers`

---

## ✅ v6.22.0 — Phase 5

1. **Balance integrity** — member can no longer edit shared wallet balance
2. **Workspace split** — collaborator writes restricted to shared wallet paths
3. **Handover mismatch** (v6.21.0 → v6.21.1) cleaned
4. Removed unused `canWrite` helper

**Rules deployed cleanly (no warnings).**

---

## 🛡️ Security Phases 1 → 5 — COMPLETE

| Phase | Version | Fix |
|---|---|---|
| 1 | v6.16.0/6.16.1 | 5 rules fixes |
| 2 | v6.17.0 | Premium trial hardening |
| 3a/3b | v6.18.0 → v6.20.0 | sharedWalletRefs + list closure |
| 4 | v6.21.0/6.21.1 | Owner-only update + tx perm helpers |
| 5 | v6.22.0 | Balance integrity + workspace split |

---

## ⚠️ Remaining

- **High C** — Premium trial not server-atomic (Blaze plan)
- **High E** — Firestore Rules Emulator tests (verification)

**Beta launch: ✅ SAFE**
**Official stable launch: ⏳** (High C + E)

---

## 🎯 Balance integrity — Behavior

- Member adds/edits/deletes shared tx → rules allow (permission map)
- Member **cannot** update parent wallet `balance` field
- Owner's live subscription receives new tx
- Owner's client recomputes wallet balance
- Owner's next sync pushes correct balance

**Trade-off:** Balance shows stale between tx commit and owner's
recompute. Acceptable for beta. Cloud Function will fix it later.

---

## 🎯 Next Session Options

1. **Emulator tests** (verification — highest priority)
2. **Cloud Function premium** (Blaze needed)
3. **App.tsx refactor** — 4-6 sessions
4. **Capacitor APK** — 1-2 sessions
5. **i18n top 3** — 2-3 sessions

---

## 🔧 Session Rules

- PowerShell ❌ (Myanmar/emoji content) → Node.js .cjs ✅
- PowerShell ✅ (rules deploy, git, filename ops)
- Build before push
- NEVER `npm audit fix --force`
- Firebase rules deploy — backup first

---

## 🎬 Next Session Start Prompt

```
NgweSarYin App — ဆက်လုပ်ရန်

Current State:
- Version: v6.22.0
- Build: 185
- Git HEAD: 6f6998c v6.21.1: fix shared tx permission helpers
- Firebase: 12.19.0
- Rules: v6.22 deployed (Phase 5 done)
- Tests: 40 pass
- Security: Phases 1 → 5 COMPLETE

Next: [Emulator tests / Cloud Function premium / App.tsx refactor / Capacitor]

Rules:
- PowerShell ❌ (Myanmar/emoji) → Node.js .cjs ✅
- Build before push
- NEVER npm audit fix --force
- Firebase rules deploy — backup first
```

---

*Handover v6.22.0 — 2026-10-10*
*Git HEAD: 6f6998c v6.21.1: fix shared tx permission helpers*
