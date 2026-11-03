/**
 * Firestore Rules Emulator Tests — v6.23.0 (High E), v7.5.56 additions
 *
 * Run: npm run test:rules
 * (which invokes: firebase emulators:exec --only firestore
 *   "vitest run --config vitest.rules.config.ts")
 *
 * Covers the 8 scenarios from the v6.21.1 security review, plus the
 * v7.5.56 shared-wallet fixes (tests 21–29): member privacy, self-
 * leave, ownership transfer, type-flip guard, invite accept, debts.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  addDoc,
} from 'firebase/firestore';

// ─── Constants ─────────────────────────────────────────────────
const OWNER_UID   = 'owner_uid_A';
const OWNER_EMAIL = 'owner@example.com';
const MEMBER_UID  = 'member_uid_B';
const MEMBER_EMAIL = 'member@example.com';
const OUTSIDER_UID = 'outsider_uid_C';
const OUTSIDER_EMAIL = 'outsider@example.com';
const WALLET_ID   = OWNER_UID + '_wallet_1';
const WALLET_PATH = 'sharedWallets/' + WALLET_ID;

let testEnv: RulesTestEnvironment;

// ─── Setup ─────────────────────────────────────────────────────
beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'ngwesaryin-rules-test',
    firestore: {
      rules: fs.readFileSync(
        path.resolve(__dirname, 'firestore.rules'),
        'utf8'
      ),
      host: '127.0.0.1',
      port: 8181,
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  // Seed: shared wallet owned by OWNER, shared with MEMBER (viewer only)
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, WALLET_PATH), {
      id: 'wallet_1',
      ownerUid: OWNER_UID,
      ownerEmail: OWNER_EMAIL,
      ownerName: 'Owner',
      name: 'Test Wallet',
      nameEn: 'Test Wallet',
      balance: 1000,
      sharedWith: [MEMBER_EMAIL],
      collaboratorPermissions: {
        [MEMBER_EMAIL]: {
          canAddIncome: false,
          canEditIncome: false,
          canDeleteIncome: false,
          canAddExpense: false,
          canEditExpense: false,
          canDeleteExpense: false,
        },
      },
      updatedAt: Date.now(),
    });

    // Seed: user doc for trial test
    await setDoc(doc(db, 'users', OWNER_UID), {
      userId: OWNER_UID,
      email: OWNER_EMAIL,
      plan: 'free',
      trialClaimed: false,
      premiumExpiresAt: null,
      premiumActivatedAt: null,
      premiumMonths: null,
      premiumCodeUsed: null,
      createdAt: new Date().toISOString(),
    });
  });
});

// ─── Context helpers ───────────────────────────────────────────
const asOwner = () => testEnv.authenticatedContext(OWNER_UID, { email: OWNER_EMAIL }).firestore();
const asMember = () => testEnv.authenticatedContext(MEMBER_UID, { email: MEMBER_EMAIL }).firestore();
const asOutsider = () => testEnv.authenticatedContext(OUTSIDER_UID, { email: OUTSIDER_EMAIL }).firestore();

// ─── Tests ─────────────────────────────────────────────────────
describe('Firestore Rules — shared wallet security', () => {

  it('1. Outsider cannot GET shared wallet', async () => {
    await assertFails(getDoc(doc(asOutsider(), WALLET_PATH)));
  });

  it('1b. Member CAN get shared wallet', async () => {
    await assertSucceeds(getDoc(doc(asMember(), WALLET_PATH)));
  });

  it('2. Outsider cannot LIST sharedWallets collection', async () => {
    await assertFails(getDocs(collection(asOutsider(), 'sharedWallets')));
  });

  it('3. Member cannot edit sharedWith', async () => {
    await assertFails(updateDoc(doc(asMember(), WALLET_PATH), {
      sharedWith: [MEMBER_EMAIL, OUTSIDER_EMAIL],
    }));
  });

  it('4. Member cannot edit collaboratorPermissions', async () => {
    await assertFails(updateDoc(doc(asMember(), WALLET_PATH), {
      collaboratorPermissions: {
        [MEMBER_EMAIL]: {
          canAddIncome: true,
          canEditIncome: true,
          canDeleteIncome: true,
          canAddExpense: true,
          canEditExpense: true,
          canDeleteExpense: true,
        },
      },
    }));
  });

  it('5. Member cannot write balance directly', async () => {
    await assertFails(updateDoc(doc(asMember(), WALLET_PATH), {
      balance: 999999,
    }));
  });

  it('6. Owner CAN update sharedWith and permissions', async () => {
    await assertSucceeds(updateDoc(doc(asOwner(), WALLET_PATH), {
      sharedWith: [MEMBER_EMAIL, OUTSIDER_EMAIL],
    }));
  });

  it('7. Viewer (no tx perms) cannot create shared transaction', async () => {
    const db = asMember();
    await assertFails(addDoc(collection(db, 'sharedWallets', WALLET_ID, 'transactions'), {
      id: 'tx_1',
      type: 'expense',
      amount: 100,
      walletId: WALLET_ID,
      date: '2026-10-10',
      createdAt: Date.now(),
    }));
  });

  it('8. Trial cannot be claimed twice (trialClaimed already true)', async () => {
    // Re-seed user with trialClaimed = true
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, 'users', OWNER_UID), {
        userId: OWNER_UID,
        email: OWNER_EMAIL,
        plan: 'premium',
        trialClaimed: true,
        premiumExpiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        premiumActivatedAt: new Date().toISOString(),
        premiumMonths: 3,
        premiumCodeUsed: null,
        createdAt: new Date().toISOString(),
      });
    });

    await assertFails(updateDoc(doc(asOwner(), 'users', OWNER_UID), {
      plan: 'premium',
      trialClaimed: true,
      premiumMonths: 6,   // trying to extend trial
    }));
  });

  it('9. Collaborator cannot write unrelated user subcollection (debts)', async () => {
    const db = asMember();
    await assertFails(setDoc(doc(db, 'users', OWNER_UID, 'debts', 'debt_1'), {
      id: 'debt_1',
      type: 'receivable',
      personName: 'Test',
      totalAmount: 100,
      paidAmount: 0,
      walletId: 'w1',
      status: 'active',
      createdAt: Date.now(),
    }));
  });

  it('10. sharedWalletRefs — refs read requires matching email', async () => {
    // Seed a ref for OUTSIDER only
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, 'sharedWalletRefs', OUTSIDER_EMAIL, 'wallets', 'some_id'), {
        docId: 'some_id',
        ownerUid: OWNER_UID,
        ownerEmail: OWNER_EMAIL,
        walletName: 'Test',
        addedAt: Date.now(),
      });
    });

    // Owner tries to read outsider's ref path → should fail
    await assertFails(getDoc(doc(asOwner(), 'sharedWalletRefs', OUTSIDER_EMAIL, 'wallets', 'some_id')));
    // Outsider reads own refs → succeeds
    await assertSucceeds(getDoc(doc(asOutsider(), 'sharedWalletRefs', OUTSIDER_EMAIL, 'wallets', 'some_id')));
  });

  // ── v6.23.4 — Delete rules ──
  it('11. Owner can DELETE own debt', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', OWNER_UID, 'debts', 'debt_1'), {
        id: 'debt_1', userId: OWNER_UID, type: 'receivable',
        personName: 'Test', totalAmount: 100, paidAmount: 0,
        walletId: 'w1', status: 'active', repayments: [],
        startDate: '2026-10-10', createdAt: Date.now(),
      });
    });
    await assertSucceeds(deleteDoc(doc(asOwner(), 'users', OWNER_UID, 'debts', 'debt_1')));
  });

  it('12. Outsider cannot DELETE owner debt', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', OWNER_UID, 'debts', 'debt_2'), {
        id: 'debt_2', userId: OWNER_UID, type: 'receivable',
        personName: 'Test', totalAmount: 100, paidAmount: 0,
        walletId: 'w1', status: 'active', repayments: [],
        startDate: '2026-10-10', createdAt: Date.now(),
      });
    });
    await assertFails(deleteDoc(doc(asOutsider(), 'users', OWNER_UID, 'debts', 'debt_2')));
  });

  it('13. Owner can DELETE own wallet', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', OWNER_UID, 'wallets', 'w1'), {
        id: 'w1', userId: OWNER_UID, name: 'Test', nameEn: 'Test',
        balance: 0, color: '#000', icon: 'Wallet', createdAt: Date.now(),
      });
    });
    await assertSucceeds(deleteDoc(doc(asOwner(), 'users', OWNER_UID, 'wallets', 'w1')));
  });

  it('14. Owner can DELETE own category', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', OWNER_UID, 'categories', 'c1'), {
        id: 'c1', userId: OWNER_UID, name: 'Test', nameEn: 'Test',
        type: 'expense', icon: 'Tag', color: '#000', createdAt: Date.now(),
      });
    });
    await assertSucceeds(deleteDoc(doc(asOwner(), 'users', OWNER_UID, 'categories', 'c1')));
  });

  it('16. Outsider cannot DELETE owner wallet', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', OWNER_UID, 'wallets', 'w_outs'), {
        id: 'w_outs', userId: OWNER_UID, name: 'T', nameEn: 'T',
        balance: 0, color: '#000', icon: 'Wallet', createdAt: Date.now(),
      });
    });
    await assertFails(deleteDoc(doc(asOutsider(), 'users', OWNER_UID, 'wallets', 'w_outs')));
  });

  it('17. Outsider cannot DELETE owner category', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', OWNER_UID, 'categories', 'c_outs'), {
        id: 'c_outs', userId: OWNER_UID, name: 'T', nameEn: 'T',
        type: 'expense', icon: 'Tag', color: '#000', createdAt: Date.now(),
      });
    });
    await assertFails(deleteDoc(doc(asOutsider(), 'users', OWNER_UID, 'categories', 'c_outs')));
  });

  it('18. Outsider cannot DELETE owner budget', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', OWNER_UID, 'budgets', 'b_outs'), {
        id: 'b_outs', userId: OWNER_UID, categoryId: 'c1',
        calcType: 'fixed', value: 100, walletId: 'all',
      });
    });
    await assertFails(deleteDoc(doc(asOutsider(), 'users', OWNER_UID, 'budgets', 'b_outs')));
  });

  it('19. Create with mismatched userId is rejected', async () => {
    await assertFails(setDoc(doc(asOwner(), 'users', OWNER_UID, 'debts', 'bad_id'), {
      id: 'bad_id', userId: 'OTHER_UID', type: 'receivable',
      personName: 'T', totalAmount: 100, paidAmount: 0,
      walletId: 'w1', status: 'active', repayments: [],
      startDate: '2026-10-10', createdAt: Date.now(),
    }));
  });

  it('20. Create with mismatched docId is rejected', async () => {
    await assertFails(setDoc(doc(asOwner(), 'users', OWNER_UID, 'debts', 'doc_a'), {
      id: 'doc_b', userId: OWNER_UID, type: 'receivable',
      personName: 'T', totalAmount: 100, paidAmount: 0,
      walletId: 'w1', status: 'active', repayments: [],
      startDate: '2026-10-10', createdAt: Date.now(),
    }));
  });

  it('15. Owner can DELETE own budget', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', OWNER_UID, 'budgets', 'b1'), {
        id: 'b1', userId: OWNER_UID, categoryId: 'c1',
        calcType: 'fixed', value: 100, walletId: 'all',
      });
    });
    await assertSucceeds(deleteDoc(doc(asOwner(), 'users', OWNER_UID, 'budgets', 'b1')));
  });

  // ── v7.5.56 — Shared wallet privacy / leave / transfer / type-flip ──

  // Helper: re-seed the shared wallet with the given member permissions.
  const seedMemberPerms = async (perms: Record<string, boolean>) => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), WALLET_PATH), {
        id: 'wallet_1',
        ownerUid: OWNER_UID,
        ownerEmail: OWNER_EMAIL,
        ownerName: 'Owner',
        name: 'Test Wallet',
        nameEn: 'Test Wallet',
        balance: 1000,
        sharedWith: [MEMBER_EMAIL],
        collaboratorPermissions: { [MEMBER_EMAIL]: perms },
        updatedAt: Date.now(),
      });
    });
  };

  it('21. [v7.5.56] Member CANNOT read the owner\'s other wallets/transactions (finding 2)', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, 'users', OWNER_UID, 'wallets', 'w_private'), {
        id: 'w_private', userId: OWNER_UID, name: 'Private', nameEn: 'Private',
        balance: 5000, color: '#000', icon: 'Wallet', createdAt: Date.now(),
      });
      await setDoc(doc(db, 'users', OWNER_UID, 'transactions', 'tx_private'), {
        id: 'tx_private', userId: OWNER_UID, type: 'income', amount: 5000,
        walletId: 'w_private', date: '2026-11-01', createdAt: Date.now(),
      });
    });
    // Root doc, private wallet, and private transaction: all denied,
    // even though the member is in the owner's shared wallet.
    await assertFails(getDoc(doc(asMember(), 'users', OWNER_UID)));
    await assertFails(getDoc(doc(asMember(), 'users', OWNER_UID, 'wallets', 'w_private')));
    await assertFails(getDoc(doc(asMember(), 'users', OWNER_UID, 'transactions', 'tx_private')));
    // Sanity: the owner can still read their own data.
    await assertSucceeds(getDoc(doc(asOwner(), 'users', OWNER_UID, 'wallets', 'w_private')));
  });

  it('22. [v7.5.56] Member CAN remove themself from sharedWith (self-leave, finding 1)', async () => {
    await assertSucceeds(updateDoc(doc(asMember(), WALLET_PATH), {
      sharedWith: [],
      collaboratorPermissions: {},
      updatedAt: Date.now(),
    }));
    // …but still cannot remove anyone else / add anyone (test 3 covers
    // adding; removing another member while keeping themself also fails
    // because the removed entry would not be the leaver).
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), WALLET_PATH), {
        id: 'wallet_1', ownerUid: OWNER_UID, ownerEmail: OWNER_EMAIL,
        ownerName: 'Owner', name: 'Test Wallet', nameEn: 'Test Wallet',
        balance: 1000, sharedWith: [MEMBER_EMAIL, OUTSIDER_EMAIL],
        collaboratorPermissions: {}, updatedAt: Date.now(),
      });
    });
    await assertFails(updateDoc(doc(asMember(), WALLET_PATH), {
      sharedWith: [MEMBER_EMAIL],
      collaboratorPermissions: {},
      updatedAt: Date.now(),
    }));
  });

  it('23. [v7.5.56] Owner CAN transfer ownership to a member', async () => {
    await assertSucceeds(updateDoc(doc(asOwner(), WALLET_PATH), {
      ownerUid: MEMBER_UID,
      ownerEmail: MEMBER_EMAIL,
      ownerName: 'Member',
      updatedAt: Date.now(),
    }));
    // …but a MEMBER cannot transfer ownership to themself.
    await assertFails(updateDoc(doc(asMember(), WALLET_PATH), {
      ownerUid: MEMBER_UID,
      ownerEmail: MEMBER_EMAIL,
      ownerName: 'Member',
      updatedAt: Date.now(),
    }));
  });

  it('24. [v7.5.56] Edit CANNOT flip a transaction type without the old-type permission (finding 7)', async () => {
    // Seed an expense transaction in the shared wallet.
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'sharedWallets', WALLET_ID, 'transactions', 'tx_exp'), {
        id: 'tx_exp', type: 'expense', amount: 100,
        walletId: WALLET_ID, date: '2026-11-01', createdAt: Date.now(),
      });
    });
    // Member holds ONLY canEditIncome: flipping expense -> income fails.
    await seedMemberPerms({
      canAddIncome: false, canEditIncome: true, canDeleteIncome: false,
      canAddExpense: false, canEditExpense: false, canDeleteExpense: false,
    });
    await assertFails(updateDoc(doc(asMember(), 'sharedWallets', WALLET_ID, 'transactions', 'tx_exp'), {
      type: 'income', amount: 100, walletId: WALLET_ID,
    }));
    // Same-type edit with the matching permission succeeds.
    await seedMemberPerms({
      canAddIncome: false, canEditIncome: false, canDeleteIncome: false,
      canAddExpense: false, canEditExpense: true, canDeleteExpense: false,
    });
    await assertSucceeds(updateDoc(doc(asMember(), 'sharedWallets', WALLET_ID, 'transactions', 'tx_exp'), {
      type: 'expense', amount: 150, walletId: WALLET_ID,
    }));
    // With BOTH edit permissions, the flip is allowed.
    await seedMemberPerms({
      canAddIncome: false, canEditIncome: true, canDeleteIncome: false,
      canAddExpense: false, canEditExpense: true, canDeleteExpense: false,
    });
    await assertSucceeds(updateDoc(doc(asMember(), 'sharedWallets', WALLET_ID, 'transactions', 'tx_exp'), {
      type: 'income', amount: 150, walletId: WALLET_ID,
    }));
  });

  it('25. [v7.5.56] Invitee CAN accept their own ref (status only)', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'sharedWalletRefs', MEMBER_EMAIL, 'wallets', WALLET_ID), {
        docId: WALLET_ID, ownerUid: OWNER_UID, ownerEmail: OWNER_EMAIL,
        walletName: 'Test Wallet', addedAt: Date.now(), status: 'pending',
      });
    });
    await assertSucceeds(updateDoc(
      doc(asMember(), 'sharedWalletRefs', MEMBER_EMAIL, 'wallets', WALLET_ID),
      { status: 'accepted' }
    ));
    // …but cannot rewrite any other ref field.
    await assertFails(updateDoc(
      doc(asMember(), 'sharedWalletRefs', MEMBER_EMAIL, 'wallets', WALLET_ID),
      { walletName: 'Hacked' }
    ));
    // Decline = delete own ref.
    await assertSucceeds(deleteDoc(
      doc(asMember(), 'sharedWalletRefs', MEMBER_EMAIL, 'wallets', WALLET_ID)
    ));
  });

  it('26. [v7.5.56] Member can read ONLY debts of a shared wallet, not other debts', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, 'users', OWNER_UID, 'debts', 'debt_shared'), {
        id: 'debt_shared', userId: OWNER_UID, type: 'receivable',
        personName: 'Shared', totalAmount: 100, paidAmount: 0,
        walletId: 'wallet_1', status: 'active', repayments: [],
        startDate: '2026-11-01', createdAt: Date.now(),
      });
      await setDoc(doc(db, 'users', OWNER_UID, 'debts', 'debt_private'), {
        id: 'debt_private', userId: OWNER_UID, type: 'receivable',
        personName: 'Private', totalAmount: 100, paidAmount: 0,
        walletId: 'w_private', status: 'active', repayments: [],
        startDate: '2026-11-01', createdAt: Date.now(),
      });
    });
    // walletId 'wallet_1' belongs to shared doc OWNER_UID_wallet_1.
    await assertSucceeds(getDoc(doc(asMember(), 'users', OWNER_UID, 'debts', 'debt_shared')));
    // walletId 'w_private' is not a shared wallet for this member.
    await assertFails(getDoc(doc(asMember(), 'users', OWNER_UID, 'debts', 'debt_private')));
  });

  it('27. [v7.5.56] Member still cannot LIST sharedWallets (privacy)', async () => {
    await assertFails(getDocs(collection(asMember(), 'sharedWallets')));
  });

  it('28. [v7.5.56] Member CAN write ONLY their own memberUids entry (email → own uid)', async () => {
    // Own entry, own uid: allowed.
    await assertSucceeds(updateDoc(doc(asMember(), WALLET_PATH), {
      memberUids: { [MEMBER_EMAIL]: MEMBER_UID },
    }));
    // Own entry pointing at someone else's uid: denied.
    await assertFails(updateDoc(doc(asMember(), WALLET_PATH), {
      memberUids: { [MEMBER_EMAIL]: OUTSIDER_UID },
    }));
    // Another member's entry: denied (diff touches a key that is not mine).
    await assertFails(updateDoc(doc(asMember(), WALLET_PATH), {
      memberUids: { [MEMBER_EMAIL]: MEMBER_UID, [OUTSIDER_EMAIL]: OUTSIDER_UID },
    }));
    // …and the owner may write the map (e.g. as part of a transfer).
    await assertSucceeds(updateDoc(doc(asOwner(), WALLET_PATH), {
      memberUids: { [MEMBER_EMAIL]: MEMBER_UID },
    }));
  });

  it('29. [v7.5.56] Debts mirror: members read it; only owner/creator write it', async () => {
    const DEBT_PATH = WALLET_PATH + '/debts/debt_1';
    const memberDebt = {
      id: 'debt_1',
      sharedWalletId: WALLET_ID,
      createdBy: MEMBER_UID,
      createdByName: 'Member',
      walletId: 'wallet_1',
      totalAmount: 5000,
    };
    // Member (creator) can create their own debt mirror.
    await assertSucceeds(setDoc(doc(asMember(), DEBT_PATH), memberDebt));
    // Member can read it; outsider cannot.
    await assertSucceeds(getDoc(doc(asMember(), DEBT_PATH)));
    await assertFails(getDoc(doc(asOutsider(), DEBT_PATH)));
    // Outsider cannot create in it.
    await assertFails(setDoc(doc(asOutsider(), DEBT_PATH), memberDebt));
    // Owner can update it.
    await assertSucceeds(updateDoc(doc(asOwner(), DEBT_PATH), { totalAmount: 6000 }));
    // Outsider cannot update or delete it.
    await assertFails(updateDoc(doc(asOutsider(), DEBT_PATH), { totalAmount: 7000 }));
    await assertFails(deleteDoc(doc(asOutsider(), DEBT_PATH)));
    // Member-creator can delete their own mirror.
    await assertSucceeds(deleteDoc(doc(asMember(), DEBT_PATH)));
  });
});
