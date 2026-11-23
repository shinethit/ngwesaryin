// [v7.6.19] Selected-wallet label for the Records header chip.
//
// The chip reuses the SAME summary wording as the filter panel's
// wallet selector (MultiWalletSelector.getTriggerLabel): no
// restriction -> "Wallet အားလုံးပေါင်း (N ခု)" / "All Wallets (N)";
// exactly one wallet -> its name (shared wallets add the owner);
// several -> the first two names, a +N remainder, and a count.
// Scope itself is never shown: the label is computed over the
// scope-filtered visible list, so "all" always means "all wallets
// in the active scope". Pure function; the selector's own
// rendering is untouched.
import type { Wallet } from '../types';

function isSharedWallet(w: Wallet): boolean {
  // Same predicate as MultiWalletSelector (B-17 will consolidate
  // the copies into one helper in a later version).
  return !!w.isSharedFromOther || !!(w.sharedWith && w.sharedWith.length > 0);
}

function walletDisplayName(w: Wallet, lang: 'my' | 'en'): string {
  return lang === 'my' ? w.name : w.nameEn || w.name;
}

function walletLabel(w: Wallet, lang: 'my' | 'en'): string {
  const name = walletDisplayName(w, lang);
  if (!isSharedWallet(w)) return name;
  const owner = w.ownerName || w.ownerEmail || '';
  return owner ? `${name} (${owner})` : name;
}

export function getWalletSelectionLabel(
  visibleWallets: Wallet[],
  selectedWalletIds: string[],
  selectedWallet: string,
  lang: 'my' | 'en',
): string {
  const allLabel =
    lang === 'my'
      ? `Wallet အားလုံးပေါင်း (${visibleWallets.length} ခု)`
      : `All Wallets (${visibleWallets.length})`;
  // A single-wallet pick (the legacy selectedWallet state) wins when set.
  if (selectedWallet !== 'all') {
    const single = visibleWallets.find((w) => w.id === selectedWallet);
    return single ? walletLabel(single, lang) : allLabel;
  }
  const selected = visibleWallets.filter((w) => selectedWalletIds.includes(w.id));
  // No restriction, or an explicit Select All: every visible wallet.
  if (selected.length === 0 || selected.length === visibleWallets.length) {
    return allLabel;
  }
  if (selected.length === 1) {
    return walletLabel(selected[0], lang);
  }
  const names = selected
    .slice(0, 2)
    .map((w) => walletLabel(w, lang))
    .join(', ');
  const remaining = selected.length - 2;
  const suffix =
    lang === 'my'
      ? ` (${selected.length} ခု ရွေးထားသည်)`
      : ` (${selected.length} selected)`;
  return `${names}${remaining > 0 ? ` +${remaining}` : ''}${suffix}`;
}
