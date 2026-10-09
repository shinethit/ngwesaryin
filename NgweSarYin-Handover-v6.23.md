# 📋 NgweSarYin App — Session Handover (v6.23.0)

**Created:** 2026-10-10
**Previous:** v6.22.0 → v6.23.0 (High E)

---

## 🎯 Project Overview

**App:** NgweSarYin (ငွေစာရင်း)
**Current Version:** v6.23.0
**Build:** 186
**Git HEAD:** `42bd8fb chore: root cleanup — remove .cjs + .bak + old handovers`

---

## ✅ v6.23.0 — High E (Firestore Rules Emulator Tests)

**New:** `firestore.rules.test.ts` — **11 automated rules tests, all passing.**

1. Outsider cannot GET shared wallet
2. Member CAN get shared wallet
3. Outsider cannot LIST sharedWallets collection
4. Member cannot edit `sharedWith`
5. Member cannot edit `collaboratorPermissions`
6. Member cannot write `balance` directly
7. Owner CAN update sharing/permissions
8. Viewer cannot create shared transaction
9. Trial cannot be claimed twice
10. Collaborator cannot write unrelated user subcollection
11. sharedWalletRefs read requires matching email

**Infrastructure:**
- `@firebase/rules-unit-testing` (via `--legacy-peer-deps`)
- `vitest.rules.config.ts`
- `firebase.json` → emulators.firestore (port 8181)
- `package.json` → `npm run test:rules`
- `.gitignore` → emulator artifacts

**Run anytime:** `npm run test:rules`

**Note:** Firestore emulator needs **Java 11+** (installed Temurin 21).

---

## 🛡️ Security Roadmap — 100% COMPLETE

| Phase | Version | Fix |
|---|---|---|
| 1 | v6.16.0/6.16.1 | 5 rules fixes |
| 2 | v6.17.0 | Premium trial hardening |
| 3a/3b | v6.18.0 → v6.20.0 | sharedWalletRefs + list closure |
| 4 | v6.21.0/6.21.1 | Owner-only update + tx perm helpers |
| 5 | v6.22.0 | Balance integrity + workspace split |
| 6 | **v6.23.0** | **Emulator tests — 11/11 pass** ✅ |

**Only remaining: High C (Cloud Function premium — Blaze plan needed).**

---

## 🎯 Launch Status

**Beta launch: ✅ SAFE** — verified with automated rules tests
**Official stable launch: ✅ READY** — all verification in place

---

## 🎯 Next Session Options

1. **Cloud Function premium** (High C — Blaze plan needed)
2. **App.tsx refactor** — 4-6 sessions
3. **Capacitor APK** — 1-2 sessions
4. **i18n top 3** — 2-3 sessions

---

## 🔧 Session Rules

- PowerShell ❌ (Myanmar/emoji content) → Node.js .cjs ✅
- PowerShell ✅ (rules deploy, git, filename ops)
- Build before push
- NEVER `npm audit fix --force`
- Firebase rules deploy — backup first
- Emulator port: 8181 (8080 held by system AgentService)

---

## 🎬 Next Session Start Prompt

```
NgweSarYin App — ဆက်လုပ်ရန်

Current State:
- Version: v6.23.0
- Build: 186
- Git HEAD: 42bd8fb chore: root cleanup — remove .cjs + .bak + old handovers
- Firebase: 12.19.0
- Rules: v6.22 deployed
- Rules tests: 11/11 PASS (npm run test:rules)
- Unit tests: 40 pass
- Security: Phases 1 → 6 COMPLETE (only Cloud Function premium remains)

Next: [Cloud Function premium / App.tsx refactor / Capacitor APK / i18n]

Rules:
- PowerShell ❌ (Myanmar/emoji) → Node.js .cjs ✅
- Build before push
- NEVER npm audit fix --force
- Firebase rules deploy — backup first
- Emulator port 8181 (8080 busy on this machine)
```

---

*Handover v6.23.0 — 2026-10-10*
*Git HEAD: 42bd8fb chore: root cleanup — remove .cjs + .bak + old handovers*
