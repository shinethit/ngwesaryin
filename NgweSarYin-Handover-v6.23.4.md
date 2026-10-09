# 📋 NgweSarYin App — Session Handover (v6.23.4)

**Created:** 2026-10-10
**Previous:** v6.23.3 → v6.23.4

---

## 🎯 Project Overview

**App:** NgweSarYin (ငွေစာရင်း)
**Current Version:** v6.23.4
**Build:** 190
**Git HEAD:** `7e1ab1e v6.23.3: permission parity — deny-by-default frontend`

---

## ✅ v6.23.4 — Delete + Sync Fix

**P0-A — Delete rules split**
Rules used `allow write` accessing `request.resource.data.userId` —
but `request.resource` is null on delete → all deletes rejected on:
debts, wallets, categories, budgets, shops, vehicles, fuelLogs,
vehicleMaintenance, tirePressureLogs.

Split into:
- `allow create, update: if canWriteOwnerOnly(userId) && ...validation`
- `allow delete: if canWriteOwnerOnly(userId)`

**P0-B — 5 delete tests added** (total 16)

**P1-A — batch.commit() no longer swallows errors**

---

## 🛡️ Security Roadmap

| Phase | Version | Status |
|---|---|---|
| 1–6 | v6.16 → v6.23.1 | ✅ |
| 7 | v6.23.2 | ✅ (v6.23.4) |
| 8 | v6.23.3 | ✅ Permissions parity |
| **9** | **v6.23.4** | ✅ **Delete fix** |

**Only remaining: Cloud Function premium (optional, Blaze plan)**

---

## 🎯 Next Session Options

1. **App.tsx refactor** — 4–6 sessions
2. **Capacitor APK** — 1–2 sessions
3. **i18n top 3** — 2–3 sessions
4. **Cloud Function premium** — optional

---

## 🔧 Session Rules

- PowerShell ❌ (Myanmar/emoji content) → Node.js .cjs ✅
- PowerShell ✅ (rules deploy, git, filename ops)
- Build before push
- NEVER `npm audit fix --force`
- Firebase rules deploy — backup first
- Emulator port 8181

---

## 🎬 Next Session Start Prompt

```
NgweSarYin App — ဆက်လုပ်ရန်

Current State:
- Version: v6.23.4
- Build: 190
- Git HEAD: 7e1ab1e v6.23.3: permission parity — deny-by-default frontend
- Rules: v6.23.4 deployed (delete fixed)
- Rules tests: 16/16 PASS
- Unit tests: 40 pass
- Security: Phases 1 → 9 complete

Next: [App.tsx refactor / Capacitor APK / i18n / Cloud Function]

Rules:
- PowerShell ❌ (Myanmar/emoji) → Node.js .cjs ✅
- Build before push
- NEVER npm audit fix --force
- Firebase rules deploy — backup first
```

---

*Handover v6.23.4 — 2026-10-10*
*Git HEAD: 7e1ab1e v6.23.3: permission parity — deny-by-default frontend*
