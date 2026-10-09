/**
 * Firestore Rules Emulator Tests — v6.23.0 (High E)
 *
 * Run: npm run test:rules
 * (which invokes: firebase emulators:exec --only firestore
 *   "vitest run --config vitest.rules.config.ts")
 *
 * Covers the 8 scenarios from the v6.21.1 security review.
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
});
