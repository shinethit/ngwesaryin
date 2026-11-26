import React from 'react';
import { X, Edit2, Lock } from 'lucide-react';
import { Category, FuelLog, Transaction, VehicleMaintenance, Wallet } from '../types';
import { formatMMK, formatLakhs, getCategoryDisplayName } from '../utils/formatters';
import { formatCurrency, convertToMMK } from '../utils/currency';
import { CategoryTile, CategoryIcon } from './CategoryIcon';
import { resolveSubCategoryIconValue } from '../utils/categoryPictures';
import { displayMenuUnit } from '../utils/shopMenuUpdate';
import { hasSplits, getSplitAttribution } from '../utils/transactionSplits';
import { isWalletMatch } from '../utils/walletBalance';
// [v7.6.15] Same one-line fuel summary as the Records row, from the
// linked FuelLog (joined by transactionId by the caller).
import { formatFuelRowLine } from '../utils/fuelRowLine';

interface TransactionDetailModalProps {
  transaction: Transaction | null;
  categories: Category[];
  wallets: Wallet[];
  lang: 'my' | 'en';
  /** [v7.6.15] The FuelLog linked to this record (transactionId
      join, resolved by the caller). Optional: without it the view
      renders exactly as before, including the bare litres row. */
  fuelLog?: FuelLog | null;
  /** [v7.6.45] The VehicleMaintenance record linked to this record
      (transactionId join, resolved by the caller) — the parallel of
      fuelLog, for the odometer row on maintenance records. Optional:
      without it the view renders exactly as before. */
  maintenanceLog?: VehicleMaintenance | null;
  /** Same edit permission the list row's pencil uses. When false the
      Edit button is replaced by the lock note — the permission gate
      in the edit handler still applies when the button is shown. */
  canEdit?: boolean;
  onClose: () => void;
  onEdit: (tx: Transaction) => void;
}

// [v7.6.11] Localised date for the detail view (same weekday/month
// names as TransactionsView's formatLocalizedDate, which is local
// to that file and cannot be imported).
const formatDetailDate = (dateStr: string, lang: 'my' | 'en'): string => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const year = parseInt(parts[0], 10);
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const d = new Date(year, monthIdx, day);
  if (isNaN(d.getTime())) return dateStr;
  const daysMy = ['တနင်္ဂနွေ', 'တနင်္လာ', 'အင်္ဂါ', 'ဗုဒ္ဓဟူး', 'ကြာသပတေး', 'သောကြာ', 'စနေ'];
  const daysEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const monthsMy = [
    'ဇန်နဝါရီ', 'ဖေဖော်ဝါရီ', 'မတ်', 'ဧပြီ', 'မေ', 'ဇွန်',
    'ဇူလိုင်', 'သြဂုတ်', 'စက်တင်ဘာ', 'အောက်တိုဘာ', 'နိုဝင်ဘာ', 'ဒီဇင်ဘာ',
  ];
  const monthsEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const days = lang === 'my' ? daysMy : daysEn;
  const months = lang === 'my' ? monthsMy : monthsEn;
  return `${days[d.getDay()]}, ${months[monthIdx]} ${day}, ${year}`;
};

/**
 * [v7.6.11] Read-only view of a saved record. Tapping a record in
 * the list (or a search hit) opens THIS view first — never the edit
 * form. The view renders every field as plain text: it contains no
 * inputs, no selects, no textareas and nothing editable, so a
 * mistaken tap cannot change the record. Editing happens only via
 * the explicit Edit button, which opens the existing edit form
 * unchanged (with its own permission gate).
 */
export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  transaction,
  categories,
  wallets,
  lang,
  fuelLog,
  maintenanceLog,
  canEdit = true,
  onClose,
  onEdit,
}) => {
  if (!transaction) return null;

  const tx = transaction;
  const isIncome = tx.type === 'income';
  const cat = categories.find((c) => c.id === tx.category);
  const subCat = tx.subCategoryId
    ? cat?.subCategories?.find((s) => s.id === tx.subCategoryId)
    : undefined;
  const wallet =
    wallets.find((w) => w.id === tx.walletId) ||
    wallets.find((w) => isWalletMatch(w, tx.walletId));
  const amountMMK = convertToMMK(tx.amount, wallet?.currency, wallet?.exchangeRate);
  const isMMK = !wallet?.currency || wallet.currency === 'MMK';
  const isShared = !!wallet && (!!wallet.isSharedFromOther || !!(wallet.sharedWith && wallet.sharedWith.length > 0));
  const ownerName = wallet?.ownerName || wallet?.ownerEmail || '';
  const destWallet = tx.transferToWalletId
    ? wallets.find((w) => w.id === tx.transferToWalletId) ||
      wallets.find((w) => isWalletMatch(w, tx.transferToWalletId))
    : undefined;
  const splitRows = hasSplits(tx) ? getSplitAttribution(tx) : [];
  // [v7.6.15] One-line fuel summary for fuel records; '' when no log
  // is linked, so non-fuel records render byte-identically.
  const fuelLine = formatFuelRowLine(fuelLog);
  // [v7.6.45] Odometer row for vehicle records: the linked fuel or
  // maintenance log's reading (fuel wins if both are ever linked —
  // a record is one or the other in practice). 0 / missing means
  // "not recorded" and shows no row, never "0 km".
  const odometerKm =
    (fuelLog?.odometer ?? 0) > 0
      ? fuelLog!.odometer
      : (maintenanceLog?.odometer ?? 0) > 0
        ? maintenanceLog!.odometer
        : 0;

  const handleEdit = () => {
    onClose();
    onEdit(tx);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={lang === 'my' ? 'မှတ်တမ်း အသေးစိတ်' : 'Record details'}
    >
      <div
        className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden p-5 sm:p-6 relative max-h-[calc(100vh-2rem)] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
          aria-label={lang === 'my' ? 'ပိတ်မည်' : 'Close'}
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 pr-8">
          <CategoryTile
            categoryId={cat?.id}
            icon={cat?.icon}
            color={cat?.color || (isIncome ? '#10B981' : '#EF4444')}
            sizeClassName="w-11 h-11"
            roundedClassName="rounded-2xl"
            iconClassName="w-5 h-5"
            extraClassName="text-white shadow-[2px_3px_8px_rgba(0,0,0,0.12),inset_1px_1px_2px_rgba(255,255,255,0.6)]"
          />
          <div className="min-w-0">
            <h3 className="font-bold text-slate-900 text-base break-words">
              {getCategoryDisplayName(tx.category, categories, lang)}
            </h3>
            <p className="text-xs text-slate-500">
              {lang === 'my' ? 'မှတ်တမ်း အသေးစိတ် (ကြည့်ရှုခြင်းသာ)' : 'Record details (view only)'}
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-2.5 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-500 text-xs">{lang === 'my' ? 'အမျိုးအစား:' : 'Type:'}</span>
            <span className={`font-bold ${isIncome ? 'text-emerald-700' : 'text-rose-600'}`}>
              {isIncome ? (lang === 'my' ? 'ဝင်ငွေ' : 'Income') : (lang === 'my' ? 'ထွက်ငွေ' : 'Expense')}
              {tx.isTransfer ? (lang === 'my' ? ' (လွှဲပြောင်းမှု)' : ' (transfer)') : ''}
              {tx.isFuelLog ? (lang === 'my' ? ' (ဆီထည့်မှတ်တမ်း)' : ' (fuel log)') : ''}
              {tx.isMaintenanceLog ? (lang === 'my' ? ' (ပြုပြင်ထိန်းသိမ်းမှု)' : ' (maintenance)') : ''}
            </span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-500 text-xs">{lang === 'my' ? 'ပမာဏ:' : 'Amount:'}</span>
            <span className={`font-mono font-bold ${isIncome ? 'text-emerald-700' : 'text-rose-600'}`} title={formatMMK(amountMMK)}>
              {isIncome ? '+' : '-'}
              {isMMK ? formatLakhs(amountMMK, lang) : formatCurrency(tx.amount, wallet?.currency)}
            </span>
          </div>
          {!isMMK && (
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500 text-xs">{lang === 'my' ? 'ကျပ်ငွေ အတိအကျ:' : 'Exact kyat:'}</span>
              <span className="font-mono font-bold text-slate-800">≈ {formatMMK(amountMMK)}</span>
            </div>
          )}

          {subCat && (
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500 text-xs">{lang === 'my' ? 'ကဏ္ဍခွဲ:' : 'Sub-category:'}</span>
              <span className="inline-flex items-center gap-1.5 font-semibold text-slate-900 text-right break-words">
                {/* [v7.6.48] Sub-category's own resolved icon; no categoryId. */}
                <CategoryIcon name={resolveSubCategoryIconValue(subCat, cat)} className="w-4 h-4 shrink-0" />
                <span>{lang === 'my' ? subCat.name : subCat.nameEn}</span>
              </span>
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-500 text-xs">{lang === 'my' ? 'ရက်စွဲ:' : 'Date:'}</span>
            <span className="font-medium text-slate-900">{formatDetailDate(tx.date, lang)}</span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-500 text-xs">{lang === 'my' ? 'ပိုက်ဆံအိတ်:' : 'Wallet:'}</span>
            <span className="font-semibold text-slate-900 text-right break-words">
              {wallet ? (lang === 'my' ? wallet.name : wallet.nameEn) || wallet.name : (lang === 'my' ? 'ပိုက်ဆံအိတ်' : 'Wallet')}
              {isShared && (
                <span className="ml-1.5 text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded px-1 py-0.5 whitespace-nowrap">
                  🤝 {ownerName || (lang === 'my' ? 'မျှဝေထား' : 'Shared')}
                </span>
              )}
            </span>
          </div>

          {destWallet && (
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500 text-xs">{lang === 'my' ? 'လွှဲပြောင်းသည့် ပိုက်ဆံအိတ်:' : 'Transfer to:'}</span>
              <span className="font-semibold text-slate-900 text-right break-words">
                {(lang === 'my' ? destWallet.name : destWallet.nameEn) || destWallet.name}
              </span>
            </div>
          )}

          {tx.note && (
            <div className="flex items-start justify-between gap-3">
              <span className="text-slate-500 text-xs shrink-0">{lang === 'my' ? 'မှတ်ချက်:' : 'Note:'}</span>
              <span className="font-medium text-slate-800 text-right italic break-words">“{tx.note}”</span>
            </div>
          )}

          {tx.shopName && (
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500 text-xs">{lang === 'my' ? 'ဆိုင်:' : 'Shop:'}</span>
              <span className="font-semibold text-slate-900 text-right break-words">{tx.shopName}</span>
            </div>
          )}

          {tx.unitPrice != null && (
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500 text-xs">{lang === 'my' ? 'ဈေး × အရေအတွက်:' : 'Price × quantity:'}</span>
              <span className="font-mono font-semibold text-slate-900">
                {formatMMK(tx.unitPrice)} × {tx.quantity || 1}
                {tx.items?.[0]?.unit && tx.items[0].unit.trim() ? ` ${displayMenuUnit(tx.items[0].unit)}` : ''}
              </span>
            </div>
          )}

          {/* [v7.6.15] Fuel summary (linked log only): type · litres ·
              station. It replaces the bare litres row below while a
              log is linked, so the litre count never shows twice;
              records with no linked log keep the bare row as before. */}
          {fuelLine && (
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500 text-xs">{lang === 'my' ? 'ဆီ:' : 'Fuel:'}</span>
              <span className="font-semibold text-slate-900 text-right break-words">{fuelLine}</span>
            </div>
          )}

          {!fuelLine && tx.fuelLiters != null && (
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500 text-xs">{lang === 'my' ? 'ဆီ (လီတာ):' : 'Fuel (litres):'}</span>
              <span className="font-mono font-semibold text-slate-900">{tx.fuelLiters}</span>
            </div>
          )}

          {/* [v7.6.45] Odometer (linked vehicle log only): 'မိုင်တာ' is
              AddFuelModal's wording. Placed with the fuel rows so
              every vehicle-related popup shows it; other popups are
              unchanged. */}
          {odometerKm > 0 && (
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500 text-xs">{lang === 'my' ? 'မိုင်တာ:' : 'Odometer:'}</span>
              <span className="font-mono font-semibold text-slate-900">{odometerKm.toLocaleString('en-US')} km</span>
            </div>
          )}

          {isShared && tx.createdByName && (
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500 text-xs">{lang === 'my' ? 'ထည့်သွင်းသူ:' : 'Added by:'}</span>
              <span className="font-semibold text-slate-900 text-right break-words">{tx.createdByName}</span>
            </div>
          )}

          {tx.receiptUrl && (
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500 text-xs">{lang === 'my' ? 'ပြေစာ:' : 'Receipt:'}</span>
              <span className="font-semibold text-slate-900">{lang === 'my' ? 'ပြေစာ တွဲထားသည်' : 'Receipt attached'}</span>
            </div>
          )}
        </div>

        {splitRows.length > 0 && (
          <div className="mt-4 p-3 rounded-2xl bg-violet-50/70 border border-violet-200 space-y-1.5">
            <div className="text-[11px] font-bold text-violet-950 pb-1 border-b border-violet-200/80">
              {lang === 'my' ? `ခွဲထားသော ကဏ္ဍများ (${splitRows.length} မျိုး)` : `Split across ${splitRows.length} categories`}
            </div>
            {splitRows.map((slice, idx) => {
              const sliceCat = categories.find((c) => c.id === slice.categoryId);
              const sliceSub = slice.subCategoryId
                ? sliceCat?.subCategories?.find((s) => s.id === slice.subCategoryId)
                : undefined;
              return (
                <div key={idx} className="flex flex-wrap items-center justify-between gap-2 text-xs font-medium text-slate-800">
                  <span className="min-w-0 break-words">
                    {getCategoryDisplayName(slice.categoryId, categories, lang)}
                    {sliceSub && <span className="text-slate-500"> · <CategoryIcon name={resolveSubCategoryIconValue(sliceSub, sliceCat)} className="w-3 h-3 shrink-0 inline-block align-[-2px]" /> {lang === 'my' ? sliceSub.name : sliceSub.nameEn}</span>}
                    {/* [v7.6.41] A row bought at a different shop than
                        the entry shop names that shop here; rows on
                        the entry shop show nothing extra (the shop is
                        already in the header above). */}
                    {slice.shopName && slice.shopName !== (tx.shopName || '').trim() && (
                      <span className="text-slate-500"> · 🏪 {slice.shopName}</span>
                    )}
                    {slice.note && <span className="text-slate-500 italic"> “{slice.note}”</span>}
                  </span>
                  <span className="font-bold font-mono text-slate-900 shrink-0 whitespace-nowrap" title={formatMMK(slice.amount)}>
                    {formatLakhs(slice.amount, lang)}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {tx.items && tx.items.length > 0 && (
          <div className="mt-4 p-3 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-1.5">
            <div className="text-[11px] font-bold text-amber-950 pb-1 border-b border-amber-200/80 flex items-center justify-between">
              <span>🛒 {lang === 'my' ? 'ဝယ်ယူခဲ့သည့် ပစ္စည်းအသေးစိတ်:' : 'Itemized Purchases:'}</span>
              <span className="font-mono text-amber-900">{tx.items.length} items</span>
            </div>
            {tx.items.map((item, idx) => (
              <div key={idx} className="flex flex-wrap items-center justify-between gap-2 text-xs font-medium text-slate-800">
                <span className="flex flex-1 flex-wrap items-center gap-1 min-w-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                  <span className="min-w-0 flex-1 break-words">{item.name}</span>
                  {item.serviceType && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                      {item.serviceType}
                    </span>
                  )}
                  <span className="text-[11px] text-slate-500 font-mono shrink-0 whitespace-nowrap">
                    ({formatMMK(item.price)} × {item.quantity}
                    {item.unit && item.unit.trim() ? ` ${displayMenuUnit(item.unit)}` : ''})
                  </span>
                </span>
                <span className="font-bold font-mono text-slate-900 shrink-0 whitespace-nowrap">{formatMMK(item.amount)}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 pt-5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 min-h-11 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition-colors cursor-pointer"
          >
            {lang === 'my' ? 'ပိတ်မည်' : 'Close'}
          </button>
          {canEdit ? (
            <button
              type="button"
              onClick={handleEdit}
              className="flex-1 min-h-11 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Edit2 className="w-4 h-4" />
              {lang === 'my' ? 'ပြင်ဆင်မည်' : 'Edit'}
            </button>
          ) : (
            <span className="flex-1 min-h-11 px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 font-semibold text-xs flex items-center justify-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              {lang === 'my' ? 'Wallet ပိုင်ရှင်မှ ပြင်ဆင်ခွင့် ပိတ်ထားပါသည်' : 'Edit disabled by the wallet owner'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
