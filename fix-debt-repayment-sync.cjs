const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();

const typesPath = path.join(ROOT, 'src', 'types.ts');
const appPath = path.join(ROOT, 'src', 'App.tsx');
const viewPath = path.join(ROOT, 'src', 'components', 'DebtsView.tsx');

[typesPath, appPath, viewPath].forEach(p => fs.copyFileSync(p, p + '.bak'));

let types = fs.readFileSync(typesPath, 'utf8').replace(/\r\n/g, '\n');
let app = fs.readFileSync(appPath, 'utf8').replace(/\r\n/g, '\n');
let view = fs.readFileSync(viewPath, 'utf8').replace(/\r\n/g, '\n');

console.log('=== v6.1.11 Debt Repayment Sync Fix ===\n');

// ============================================
// [1] types.ts — Repayment.transactionId
// ============================================
const repOld = `export interface Repayment {
  id: string;
  amount: number;
  date: string;
  walletId: string;
  note?: string;
  createdAt: number;
}`;
const repNew = `export interface Repayment {
  id: string;
  amount: number;
  date: string;
  walletId: string;
  note?: string;
  /** [v6.1.11] Linked wallet transaction id so edit/delete stays in sync. */
  transactionId?: string;
  createdAt: number;
}`;

if (types.includes('Linked wallet transaction id')) {
  console.log('[1] types.ts already updated');
} else if (types.includes(repOld)) {
  types = types.replace(repOld, repNew);
  fs.writeFileSync(typesPath, types, { encoding: 'utf8' });
  console.log('[1] types.ts updated');
} else {
  console.error('[1] ✗ Repayment interface anchor not found');
  process.exit(1);
}

// ============================================
// [2] App.tsx — Repayment Tx ID format
// ============================================
const txIdOld = '      const repTxId = `tx_rep_${Date.now()}`;';
const txIdNew = '      const repTxId = `tx_rep_${debtId}_${Date.now()}`;';
if (app.includes(txIdNew)) {
  console.log('[2] Repayment Tx ID already new format');
} else if (app.includes(txIdOld)) {
  app = app.replace(txIdOld, txIdNew);
  console.log('[2] Repayment Tx ID format fixed');
} else {
  console.error('[2] ✗ repTxId anchor not found');
  process.exit(1);
}

// ============================================
// [3] App.tsx — save transactionId in new repayment
// ============================================
const newRepOld = `          const newRepayment = {
            id: \`rep_\${Date.now()}\`,
            amount,
            date,
            walletId,
            note,
            createdAt: Date.now(),
          };`;
const newRepNew = `          const newRepayment = {
            id: \`rep_\${Date.now()}\`,
            amount,
            date,
            walletId,
            note,
            transactionId: repTxId,
            createdAt: Date.now(),
          };`;

if (app.includes('transactionId: repTxId,')) {
  console.log('[3] transactionId save already present');
} else if (app.includes(newRepOld)) {
  app = app.replace(newRepOld, newRepNew);
  console.log('[3] New repayment now saves transactionId');
} else {
  console.error('[3] ✗ newRepayment anchor not found');
  process.exit(1);
}

// ============================================
// [4] App.tsx — handleEditRepayment updates linked tx
// ============================================
const editAnchor = `  const handleEditRepayment = (
    debtId: string,
    repaymentId: string,
    amount: number,
    date: string,
    walletId: string,
    note?: string
  ) => {
    setDebts((prev) => {`;

const editNew = `  const handleEditRepayment = (
    debtId: string,
    repaymentId: string,
    amount: number,
    date: string,
    walletId: string,
    note?: string
  ) => {
    // [v6.1.11] Update the linked transaction so wallet & summary stay in sync
    const targetDebtForEdit = debts.find((d) => d.id === debtId);
    const targetRepForEdit = targetDebtForEdit?.repayments?.find((r) => r.id === repaymentId);
    const linkedTxIdForEdit = targetRepForEdit?.transactionId;

    if (linkedTxIdForEdit && targetDebtForEdit) {
      const isReceivable = targetDebtForEdit.type === 'receivable';
      const updatedLinkedTx: Transaction = {
        id: linkedTxIdForEdit,
        type: isReceivable ? 'income' : 'expense',
        amount,
        category: isReceivable ? 'cat_debt_repayment' : 'cat_debt_payment',
        walletId,
        date,
        note: isReceivable
          ? \`[အကြွေးပြန်ရငွေ] ⬅ \${targetDebtForEdit.personName}\${note ? \` (\${note})\` : ''}\`
          : \`[အကြွေးပြန်ဆပ်ငွေ] ➔ \${targetDebtForEdit.personName}\${note ? \` (\${note})\` : ''}\`,
        createdAt: Date.now(),
      };

      setTransactions((prev) => {
        const next = prev.some((t) => t.id === linkedTxIdForEdit)
          ? prev.map((t) => (t.id === linkedTxIdForEdit ? updatedLinkedTx : t))
          : [updatedLinkedTx, ...prev];
        safeSetItem('ngwe_transactions', JSON.stringify(next));
        return next;
      });

      if (user?.uid) {
        const targetUid = activeWorkspaceId || user.uid;
        safeSetDoc(doc(db, 'users', targetUid, 'transactions', linkedTxIdForEdit), {
          ...updatedLinkedTx,
          userId: targetUid,
        }, { merge: true });
      }
    }

    setDebts((prev) => {`;

if (app.includes('targetRepForEdit')) {
  console.log('[4] handleEditRepayment already updated');
} else if (app.includes(editAnchor)) {
  app = app.replace(editAnchor, editNew);
  console.log('[4] handleEditRepayment now updates linked tx');
} else {
  console.error('[4] ✗ handleEditRepayment anchor not found');
  process.exit(1);
}

// ============================================
// [5] App.tsx — handleDeleteRepayment deletes linked tx
// ============================================
const delRepAnchor = `  const handleDeleteRepayment = (debtId: string, repaymentId: string) => {
    setDebts((prev) => {`;

const delRepNew = `  const handleDeleteRepayment = (debtId: string, repaymentId: string) => {
    // [v6.1.11] Delete the linked transaction so wallet & summary revert.
    const targetDebtForDel = debts.find((d) => d.id === debtId);
    const targetRepForDel = targetDebtForDel?.repayments?.find((r) => r.id === repaymentId);
    let linkedTxIdToDel = targetRepForDel?.transactionId;

    // Fallback: locate legacy tx by matching amount + date + wallet + person
    if (!linkedTxIdToDel && targetDebtForDel && targetRepForDel) {
      const isReceivable = targetDebtForDel.type === 'receivable';
      const expectedType = isReceivable ? 'income' : 'expense';
      const expectedCat = isReceivable ? 'cat_debt_repayment' : 'cat_debt_payment';
      const matched = transactions.find(
        (t) =>
          t.type === expectedType &&
          t.category === expectedCat &&
          t.amount === targetRepForDel.amount &&
          t.date === targetRepForDel.date &&
          t.walletId === targetRepForDel.walletId &&
          (t.note || '').includes(targetDebtForDel.personName)
      );
      if (matched) linkedTxIdToDel = matched.id;
    }

    if (linkedTxIdToDel) {
      markTxDeleted(linkedTxIdToDel);
      const linkedTx = transactions.find((t) => t.id === linkedTxIdToDel);
      const linkedWallet = linkedTx ? wallets.find((w) => isWalletMatch(w, linkedTx.walletId)) : undefined;

      setTransactions((prev) => {
        const next = prev.filter((t) => t.id !== linkedTxIdToDel);
        safeSetItem('ngwe_transactions', JSON.stringify(next));
        return next;
      });

      setCloudTxIds((prev) => {
        const next = new Set(prev);
        next.delete(linkedTxIdToDel as string);
        safeSetItem('ngwe_cloud_tx_ids', JSON.stringify(Array.from(next)));
        return next;
      });
      syncQueue.remove('transactions', linkedTxIdToDel);

      if (user?.uid) {
        const targetUid = activeWorkspaceId || user.uid;
        safeDeleteDoc(doc(db, 'users', targetUid, 'transactions', linkedTxIdToDel));

        if (linkedWallet && (linkedWallet.isSharedFromOther || (linkedWallet.sharedWith && linkedWallet.sharedWith.length > 0))) {
          const sharedDocId = getSharedWalletDocId(linkedWallet, user.uid);
          deleteSharedWalletTransaction(linkedWallet.id, linkedTxIdToDel, linkedWallet.balance, sharedDocId, user.uid);
        }

        (async () => {
          try {
            const { deleteTransactionDirectHttp } = await import('./lib/directFirestoreHttp');
            await deleteTransactionDirectHttp(linkedTxIdToDel as string, targetUid);
          } catch (e) {
            console.warn('[deleteRepayment] REST verify notice:', e);
          }
        })();
      }
    }

    setDebts((prev) => {`;

const delRepToastOld = `    showToast(lang === 'my' ? 'ငွေဆပ်မှတ်တမ်း ဖျက်လိုက်ပါပြီ ✓' : 'Repayment deleted ✓');
  };`;
const delRepToastNew = `    showToast(lang === 'my' ? 'ငွေဆပ်မှတ်တမ်းနှင့် တွဲဖက်ငွေစာရင်း ဖျက်လိုက်ပါပြီ ✓' : 'Repayment & linked transaction deleted ✓');
  };`;

if (app.includes('targetRepForDel')) {
  console.log('[5] handleDeleteRepayment already updated');
} else if (app.includes(delRepAnchor)) {
  app = app.replace(delRepAnchor, delRepNew);
  if (!app.includes(delRepToastNew) && app.includes(delRepToastOld)) {
    app = app.replace(delRepToastOld, delRepToastNew);
  }
  console.log('[5] handleDeleteRepayment now deletes linked tx');
} else {
  console.error('[5] ✗ handleDeleteRepayment anchor not found');
  process.exit(1);
}

// ============================================
// [6] App.tsx — handleDeleteDebt comprehensive cleanup
// ============================================
const delDebtOld = `  const handleDeleteDebt = (id: string) => {
    setDebts((prev) => {
      const next = prev.filter((d) => d.id !== id);
      safeSetItem('ngwe_debts', JSON.stringify(next));
      return next;
    });

    const txId = \`tx_debt_\${id}\`;
    markTxDeleted(txId);
    setTransactions((prev) => {
      const next = prev.filter((t) => t.id !== txId && !t.id.startsWith(\`tx_rep_\${id}\`));
      safeSetItem('ngwe_transactions', JSON.stringify(next));
      return next;
    });

    if (user?.uid) {
      const targetUid = activeWorkspaceId || user.uid;
      safeDeleteDoc(doc(db, 'users', targetUid, 'debts', id));
      safeDeleteDoc(doc(db, 'users', targetUid, 'transactions', txId));
    }

    showToast(lang === 'my' ? 'အကြွေးစာရင်းကို ဖျက်လိုက်ပါပြီ' : 'Debt record deleted');
  };`;

const delDebtNew = `  const handleDeleteDebt = (id: string) => {
    const targetDebtForDel = debts.find((d) => d.id === id);

    // [v6.1.11] Collect ALL linked transaction ids (main + every repayment)
    const txIdsToDelete = new Set<string>();
    txIdsToDelete.add(\`tx_debt_\${id}\`);
    if (targetDebtForDel?.repayments) {
      targetDebtForDel.repayments.forEach((r) => {
        if (r.transactionId) txIdsToDelete.add(r.transactionId);
      });

      // Fallback for legacy repayments without transactionId
      const isReceivable = targetDebtForDel.type === 'receivable';
      const expectedType = isReceivable ? 'income' : 'expense';
      const expectedCat = isReceivable ? 'cat_debt_repayment' : 'cat_debt_payment';
      targetDebtForDel.repayments.forEach((r) => {
        if (r.transactionId) return;
        const matched = transactions.find(
          (t) =>
            t.type === expectedType &&
            t.category === expectedCat &&
            t.amount === r.amount &&
            t.date === r.date &&
            t.walletId === r.walletId &&
            (t.note || '').includes(targetDebtForDel.personName)
        );
        if (matched) txIdsToDelete.add(matched.id);
      });
    }

    setDebts((prev) => {
      const next = prev.filter((d) => d.id !== id);
      safeSetItem('ngwe_debts', JSON.stringify(next));
      return next;
    });

    txIdsToDelete.forEach((tid) => markTxDeleted(tid));
    setTransactions((prev) => {
      const next = prev.filter((t) => !txIdsToDelete.has(t.id));
      safeSetItem('ngwe_transactions', JSON.stringify(next));
      return next;
    });

    setCloudTxIds((prev) => {
      const next = new Set(prev);
      txIdsToDelete.forEach((tid) => next.delete(tid));
      safeSetItem('ngwe_cloud_tx_ids', JSON.stringify(Array.from(next)));
      return next;
    });
    txIdsToDelete.forEach((tid) => syncQueue.remove('transactions', tid));

    if (user?.uid) {
      const targetUid = activeWorkspaceId || user.uid;
      safeDeleteDoc(doc(db, 'users', targetUid, 'debts', id));
      txIdsToDelete.forEach((tid) => {
        safeDeleteDoc(doc(db, 'users', targetUid, 'transactions', tid));
      });

      (async () => {
        try {
          const { deleteTransactionDirectHttp } = await import('./lib/directFirestoreHttp');
          await Promise.allSettled(Array.from(txIdsToDelete).map((tid) => deleteTransactionDirectHttp(tid, targetUid)));
        } catch (e) {
          console.warn('[deleteDebt] REST verify notice:', e);
        }
      })();
    }

    showToast(
      lang === 'my'
        ? \`အကြွေးစာရင်းနှင့် တွဲဖက်ငွေစာရင်း (\${txIdsToDelete.size}) ခု ဖျက်လိုက်ပါပြီ\`
        : \`Debt record & \${txIdsToDelete.size} linked transactions deleted\`
    );
  };`;

if (app.includes('txIdsToDelete')) {
  console.log('[6] handleDeleteDebt already updated');
} else if (app.includes(delDebtOld)) {
  app = app.replace(delDebtOld, delDebtNew);
  console.log('[6] handleDeleteDebt now cleans up all linked txs');
} else {
  console.error('[6] ✗ handleDeleteDebt anchor not found');
  process.exit(1);
}

// ============================================
// [7] App.tsx — migration ref + useEffect
// ============================================
const refAnchor = `  const lastResumeSyncAtRef = useRef<number>(0);
  const walletPushRequestedRef = useRef<Set<string>>(new Set());`;
const refNew = `  const lastResumeSyncAtRef = useRef<number>(0);
  const walletPushRequestedRef = useRef<Set<string>>(new Set());
  const migratedRepaymentsRef = useRef(false); // [v6.1.11] one-shot legacy migration`;

if (app.includes('migratedRepaymentsRef')) {
  console.log('[7a] migration ref already present');
} else if (app.includes(refAnchor)) {
  app = app.replace(refAnchor, refNew);
  console.log('[7a] migration ref added');
} else {
  console.error('[7a] ✗ ref anchor not found');
  process.exit(1);
}

const repairEffectAnchor = `  // Auto-repair missing wallet IDs and ensure legacy transfers are marked with isTransfer: true
  useEffect(() => {
    if (wallets.length === 0 || transactions.length === 0) return;
    const { repaired, hasChanges } = repairOrphanedTransactions(transactions, wallets);
    if (hasChanges && !areArraysEqual(transactions, repaired)) {
      setTransactions(repaired);
      safeSetItem('ngwe_transactions', JSON.stringify(repaired));
    }
  }, [wallets, transactions]);`;

const repairEffectNew = repairEffectAnchor + `

  // [v6.1.11] One-shot auto-migration: link legacy debt repayments → transactionId
  useEffect(() => {
    if (migratedRepaymentsRef.current) return;
    if (debts.length === 0 || transactions.length === 0) return;

    let changed = false;
    const updatedDebts = debts.map((d) => {
      if (!d.repayments || d.repayments.length === 0) return d;
      const isReceivable = d.type === 'receivable';
      const expectedType = isReceivable ? 'income' : 'expense';
      const expectedCat = isReceivable ? 'cat_debt_repayment' : 'cat_debt_payment';
      let debtChanged = false;

      const updatedRepayments = d.repayments.map((r) => {
        if (r.transactionId) return r;
        const matched = transactions.find(
          (t) =>
            t.type === expectedType &&
            t.category === expectedCat &&
            t.amount === r.amount &&
            t.date === r.date &&
            t.walletId === r.walletId &&
            (t.note || '').includes(d.personName)
        );
        if (matched) {
          debtChanged = true;
          return { ...r, transactionId: matched.id };
        }
        return r;
      });

      if (debtChanged) {
        changed = true;
        return { ...d, repayments: updatedRepayments };
      }
      return d;
    });

    migratedRepaymentsRef.current = true;

    if (changed) {
      setDebts(updatedDebts);
      safeSetItem('ngwe_debts', JSON.stringify(updatedDebts));
      console.log('[v6.1.11] Migrated legacy debt repayments → transactionId links');
      if (user?.uid) {
        const targetUid = activeWorkspaceId || user.uid;
        updatedDebts.forEach((d) => {
          safeSetDoc(doc(db, 'users', targetUid, 'debts', d.id), {
            ...d,
            userId: targetUid,
          }, { merge: true });
        });
      }
    }
  }, [debts.length, transactions.length]);`;

if (app.includes('[v6.1.11] One-shot auto-migration')) {
  console.log('[7b] migration effect already present');
} else if (app.includes(repairEffectAnchor)) {
  app = app.replace(repairEffectAnchor, repairEffectNew);
  console.log('[7b] migration effect added');
} else {
  console.error('[7b] ✗ repairOrphanedTransactions effect anchor not found');
  process.exit(1);
}

// Save App.tsx
fs.writeFileSync(appPath, app, { encoding: 'utf8' });
console.log('[App.tsx] all edits saved\n');

// ============================================
// [8] DebtsView.tsx — show Tx link badge
// ============================================
const badgeAnchor = `                                <div className="flex items-center gap-1">
                                  {onEditRepayment && (
                                    <button
                                      type="button"
                                      onClick={() => onEditRepayment(debt, rep)}`;

const badgeNew = `                                <div className="flex items-center gap-1">
                                  {rep.transactionId && (
                                    <span
                                      className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200 shrink-0"
                                      title={lang === 'my' ? \`တွဲဖက်ငွေစာရင်း ID: \${rep.transactionId}\` : \`Linked transaction ID: \${rep.transactionId}\`}
                                    >
                                      🔗 #{rep.transactionId.slice(-6)}
                                    </span>
                                  )}
                                  {onEditRepayment && (
                                    <button
                                      type="button"
                                      onClick={() => onEditRepayment(debt, rep)}`;

if (view.includes('rep.transactionId.slice(-6)')) {
  console.log('[8] DebtsView already has Tx badge');
} else if (view.includes(badgeAnchor)) {
  view = view.replace(badgeAnchor, badgeNew);
  fs.writeFileSync(viewPath, view, { encoding: 'utf8' });
  console.log('[8] DebtsView repayment list now shows Tx link badge');
} else {
  console.error('[8] ✗ DebtsView anchor not found');
  process.exit(1);
}

console.log('\n=== DONE ===');
console.log('Next:');
console.log('  npm run build');
console.log('  git add .');
console.log('  git commit -m "v6.1.11: debt repayment linked transaction sync (edit/delete/migration)"');
console.log('  git push origin main');