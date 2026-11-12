import React, { useState } from 'react';
import { Store, Phone, MapPin, Edit2, Trash2, Copy, ExternalLink, Sparkles, Check, ThumbsUp, User, AlertTriangle, Plus, X, CreditCard, ChevronDown, ChevronUp, ShoppingBag, Pill, Utensils, Wrench, Package } from 'lucide-react';
import { ShopContact, PublicShop } from '../../types';
import { PRESET_TAGS } from './shopConstants';
import { auth } from '../../lib/firebase';
import { parseMyanmarNumber } from '../../utils/myanmarDigits';
import { normalizeMyanmarPhone } from './ShopModal';

interface ShopCardProps {
  shop: ShopContact | PublicShop;
  isPublic: boolean;
  lang: 'my' | 'en';
  viewMode?: 'grid' | 'compact';
  hasVoted: boolean;
  onToggleVote: (shop: PublicShop) => void;
  onOpenEdit: (shop: ShopContact | PublicShop) => void;
  onDelete: (id: string, name: string) => void;
  onAddPricingItem: (shop: ShopContact | PublicShop, name: string, price: number) => Promise<boolean>;
  onDeletePricingItem: (shop: ShopContact | PublicShop, itemIndex: number) => Promise<boolean>;
}

export const ShopCard: React.FC<ShopCardProps> = ({
  shop,
  isPublic,
  lang,
  viewMode = 'grid',
  hasVoted,
  onToggleVote,
  onOpenEdit,
  onDelete,
  onAddPricingItem,
  onDeletePricingItem,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isItemsExpanded, setIsItemsExpanded] = useState(false);
  const [showAllPhones, setShowAllPhones] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [isSubmittingItem, setIsSubmittingItem] = useState(false);

  const pub = isPublic ? (shop as PublicShop) : null;
  const votesCount = pub ? (pub as any).helpfulCount || 0 : 0;

  // Resolve Tag
  const isUnknown = shop.name.startsWith('Unknown ');
  const tagMeta = PRESET_TAGS.find((t) => t.value === (isUnknown ? 'unknown' : shop.note));
  const tagLabel = isUnknown
    ? (lang === 'my' ? 'အမည်မသိ' : 'Unknown')
    : tagMeta
    ? (lang === 'my' ? tagMeta.labelMy : tagMeta.labelEn)
    : shop.note || (lang === 'my' ? 'ဆိုင်' : 'Store');

  const phonesList = shop.phones && shop.phones.length > 0 ? shop.phones : (shop.phone ? [shop.phone] : []);
  const addressesList =
    shop.addresses && shop.addresses.length > 0
      ? shop.addresses
      : shop.address
      ? [shop.address]
      : [];
  // [v7.5.55 C16] Normalize before tel: links — spaces/dashes/Myanmar
  // digits in the raw string break dialling.
  const primaryPhone = normalizeMyanmarPhone(phonesList[0] || '');
  const secondaryPhones = phonesList.slice(1).map((p) => normalizeMyanmarPhone(p)).filter(Boolean);
  const primaryAddress = addressesList[0] || '';
  const normalizedKpay = normalizeMyanmarPhone(shop.kpayNumber || '');

  const locationSegments = [shop.stateRegion, shop.township, (shop as any).city, (shop as any).ward].filter(
    Boolean
  );
  const locationString = locationSegments.length > 0 ? locationSegments.join(' • ') : '';

  // [v7.5.55 C26] Await the clipboard write and show ✓ ONLY on success;
  // fall back to a textarea + execCommand for non-secure contexts, and
  // show an error when copying really fails.
  const handleCopyText = async (id: string, text: string) => {
    const markCopied = () => {
      setCopiedId(id);
      setTimeout(() => {
        setCopiedId((prev) => (prev === id ? null : prev));
      }, 2000);
    };
    try {
      await navigator.clipboard.writeText(text);
      markCopied();
      return;
    } catch {
      // Fallback for non-secure contexts / denied clipboard permission.
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(ta);
        if (ok) {
          markCopied();
          return;
        }
      } catch {
        // fall through to the error alert below
      }
      alert(lang === 'my' ? 'ကူးယူ၍ မရပါ — ဘရောက်ဆာ ခွင့်ပြုချက် စစ်ပေးပါ' : 'Could not copy — please check browser permissions');
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || !newItemPrice.trim()) return;
    // [v7.5.55 C16] Myanmar-digit prices must work — parseMyanmarNumber,
    // not a digit-strip that silently turns ၅၀၀၀ into nothing.
    const priceNum = parseMyanmarNumber(newItemPrice);
    if (isNaN(priceNum) || priceNum <= 0) return;

    setIsSubmittingItem(true);
    const success = await onAddPricingItem(shop, newItemName.trim(), priceNum);
    setIsSubmittingItem(false);
    if (success) {
      setNewItemName('');
      setNewItemPrice('');
    }
  };

  const renderCategoryIcon = () => {
    const iconName = tagMeta?.iconName || 'other';
    const className = "w-4 h-4";
    switch (iconName) {
      case 'grocery':
        return <ShoppingBag className={className} />;
      case 'pharmacy':
        return <Pill className={className} />;
      case 'restaurant':
        return <Utensils className={className} />;
      case 'workshop':
        return <Wrench className={className} />;
      case 'wholesale':
        return <Package className={className} />;
      default:
        return <Store className={className} />;
    }
  };

  // [v7.5.55 C4] Firestore rules allow public-shop updates only by the
  // adder or an admin. [v7.5.60 E21] Vote / edit buttons stay tappable
  // for everyone else — tapping one shows the reason in-app instead of
  // sitting dead (phone tooltips never appear). Private shops are the
  // user's own list, so they are always manageable.
  const isShopOwner = isPublic && auth.currentUser?.uid === pub?.addedByUid;
  const isShopAdmin = auth.currentUser?.email === 'khunthanshwe@gmail.com';
  const canManage = !isPublic || isShopOwner || isShopAdmin;

  const canDelete =
    !isPublic ||
    auth.currentUser?.uid === pub?.addedByUid ||
    auth.currentUser?.email === 'khunthanshwe@gmail.com';

  // ---------------------------------------------------------------------------
  // COMPACT LIST VIEW
  // ---------------------------------------------------------------------------
  if (viewMode === 'compact') {
    return (
      <div className="bg-white border border-slate-200/80 hover:border-slate-300 rounded-2xl p-4 transition-all hover:shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Shop identity */}
          <div className="flex items-start gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tagMeta?.bgColor || 'bg-slate-100'} ${tagMeta?.textColor || 'text-slate-700'}`}>
              {renderCategoryIcon()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-bold text-slate-900 text-sm truncate min-w-0">{shop.name}</h4>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${tagMeta?.bgColor || 'bg-slate-100'} ${tagMeta?.textColor || 'text-slate-700'}`}>
                  {tagLabel}
                  {shop.subCategory && <span className="opacity-70 ml-1">({shop.subCategory})</span>}
                </span>
                {shop.kpayNumber && (
                  <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded-md flex items-center gap-1 border border-indigo-100">
                    <CreditCard className="w-2.5 h-2.5" /> KPay
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                {locationString && (
                  <span className="flex items-center gap-1 min-w-0">
                    <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate min-w-0">{locationString}</span>
                  </span>
                )}
                {isPublic && pub?.addedBy && (
                  <span className="text-[11px] text-slate-400 break-all">
                    👤 {pub.addedBy.split('@')[0]}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions & Phones */}
          <div className="flex items-center gap-2 self-end sm:self-center shrink-0 flex-wrap justify-end">
            {primaryPhone && (
              <a
                href={`tel:${primaryPhone}`}
                className="flex items-center gap-1.5 px-3 py-2.5 min-h-[44px] bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold transition-all border border-emerald-200/60"
                title={lang === 'my' ? 'ဖုန်းခေါ်မည်' : 'Call'}
              >
                <Phone className="w-3.5 h-3.5" />
                <span>{primaryPhone}</span>
              </a>
            )}

            {isPublic && pub && (
              <button
                type="button"
                onClick={() => onToggleVote(pub)}
                className={`flex items-center gap-1 px-3 py-2.5 min-h-[44px] rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  hasVoted
                    ? 'bg-emerald-500 border-emerald-500 text-white shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
                title={lang === 'my' ? 'အသုံးဝင်ကြောင်း မဲပေးမည်' : 'Helpful Vote'}
              >
                <ThumbsUp className="w-3 h-3" />
                <span>{votesCount}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsItemsExpanded(!isItemsExpanded)}
              className="px-2.5 py-2.5 min-h-[44px] bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200 text-xs font-semibold flex items-center gap-1 cursor-pointer"
              title={lang === 'my' ? 'ပစ္စည်းစာရင်း ကြည့်မည်' : 'View Items'}
            >
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>{(shop.items || []).length}</span>
              {isItemsExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            <button
              type="button"
              onClick={() => onOpenEdit(shop)}
              className="min-h-[44px] min-w-[44px] p-2.5 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-xl transition-all cursor-pointer flex items-center justify-center"
              title={lang === 'my' ? 'ပြင်ဆင်မည်' : 'Edit'}
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>

            {canDelete && (
              <button
                type="button"
                onClick={() => onDelete(shop.id, shop.name)}
                className="min-h-[44px] min-w-[44px] p-2.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition-all cursor-pointer flex items-center justify-center"
                title={lang === 'my' ? 'ဖျက်မည်' : 'Delete'}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}

            {/* [v7.5.55 C32] Compact view gets the same Map + Copy-all
                actions as the grid view. */}
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                `${shop.name} ${shop.stateRegion || ''} ${shop.township || ''} ${primaryAddress}`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[44px] min-w-[44px] p-2.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 flex items-center justify-center gap-1"
              title={lang === 'my' ? 'Google Maps တွင်ကြည့်ရန်' : 'View on Maps'}
            >
              <MapPin className="w-3 h-3 text-slate-400" />
              <span className="text-[10px] font-semibold hidden sm:inline">{lang === 'my' ? 'မြေပုံ' : 'Map'}</span>
              <ExternalLink className="w-2.5 h-2.5 opacity-60" />
            </a>
            <button
              type="button"
              onClick={() =>
                handleCopyText(
                  `full-${shop.id}`,
                  `${shop.name}\n${phonesList.length > 0 ? `${lang === 'my' ? 'ဖုန်း' : 'Phone'}: ${phonesList.join(', ')}\n` : ''}${
                    locationString ? `${lang === 'my' ? 'တည်နေရာ' : 'Location'}: ${locationString}\n` : ''
                  }${primaryAddress ? `${lang === 'my' ? 'လိပ်စာ' : 'Address'}: ${addressesList.join(' | ')}\n` : ''}${
                    shop.kpayNumber ? `KPay: ${normalizedKpay || shop.kpayNumber}\n` : ''
                  }${shop.generalNotes ? `Note: ${shop.generalNotes}` : ''}`
                )
              }
              className="min-h-[44px] min-w-[44px] p-2.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 flex items-center justify-center gap-1 cursor-pointer"
              title={lang === 'my' ? 'အပြည့်အစုံ ကူးယူမည်' : 'Copy all info'}
            >
              {copiedId === `full-${shop.id}` ? (
                <>
                  <Check className="w-3 h-3 text-emerald-600" />
                  <span className="text-[10px] font-bold text-emerald-700">{lang === 'my' ? 'ကူးပြီး' : 'Copied'}</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 text-slate-400" />
                  <span className="text-[10px] font-semibold hidden sm:inline">{lang === 'my' ? 'ကူးမည်' : 'Copy'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* [v7.5.55 C32] Compact view: address, secondary phones, KPay —
            same info as the grid view. */}
        {(primaryAddress || secondaryPhones.length > 0 || shop.kpayNumber) && (
          <div className="mt-3 space-y-1.5">
            {primaryAddress && (
              <div className="text-xs text-slate-600 flex items-start gap-1.5 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-150">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <span className="line-clamp-2 min-w-0 break-words">{primaryAddress}</span>
              </div>
            )}
            {secondaryPhones.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setShowAllPhones(!showAllPhones)}
                  className="text-[11px] font-bold text-slate-500 hover:text-slate-800 cursor-pointer min-h-[44px] px-1 py-2 inline-flex items-center"
                >
                  {showAllPhones
                    ? lang === 'my'
                      ? 'အခြားဖုန်းများ ဝှက်မည် ▲'
                      : 'Hide extra phones ▲'
                    : lang === 'my'
                    ? `+ အခြားဖုန်း (${secondaryPhones.length}) ခု ကြည့်မည် ▼`
                    : `+${secondaryPhones.length} more phones ▼`}
                </button>
                {showAllPhones &&
                  secondaryPhones.map((ph, idx) => (
                    <span key={idx} className="flex items-center gap-1 text-xs">
                      <a href={`tel:${ph}`} className="text-emerald-700 font-bold hover:underline">
                        {ph}
                      </a>
                      <button
                        type="button"
                        onClick={() => handleCopyText(`ph-${shop.id}-${idx + 1}`, ph)}
                        className="text-slate-400 hover:text-slate-600 min-h-[44px] min-w-[44px] p-2.5 flex items-center justify-center"
                      >
                        {copiedId === `ph-${shop.id}-${idx + 1}` ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </span>
                  ))}
              </div>
            )}
            {shop.kpayNumber && (
              <div className="px-3 py-1.5 bg-indigo-50/70 border border-indigo-100 rounded-xl flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs text-indigo-950 font-semibold min-w-0">
                  <span className="px-1.5 py-0.2 bg-indigo-600 text-white rounded text-[10px] font-black shrink-0">
                    KPay
                  </span>
                  <span className="truncate">{normalizedKpay || shop.kpayNumber}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyText(`kpay-${shop.id}`, normalizedKpay || shop.kpayNumber || '')}
                  className="min-h-[44px] min-w-[44px] p-2.5 hover:bg-indigo-100 text-indigo-600 rounded-md transition-colors cursor-pointer shrink-0 flex items-center justify-center"
                  title={lang === 'my' ? 'KPay နံပါတ်ကူးမည်' : 'Copy KPay'}
                >
                  {copiedId === `kpay-${shop.id}` ? (
                    <Check className="w-3.5 h-3.5 text-indigo-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Compact View Items expansion */}
        {isItemsExpanded && (
          <div className="mt-3 pt-3 border-t border-slate-150 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span className="font-bold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>{lang === 'my' ? '🛒 ဈေးနှုန်း နှိုင်းယှဉ်' : '🛒 Compare Price'}</span>
              </span>
              <span className="text-[11px] text-slate-400 italic">
                {lang === 'my' ? 'ထည့်သွင်းသူ၏ တာဝန်သာ ဖြစ်ပါသည်' : 'User-contributed'}
              </span>
            </div>

            {(shop.items || []).length === 0 ? (
              <div className="text-xs text-slate-400 italic py-2">
                {lang === 'my' ? 'ပစ္စည်းစာရင်း မရှိသေးပါ။' : 'No items added yet.'}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {(shop.items || []).map((item, idx) => (
                  <div key={idx} className="p-2 bg-slate-50 rounded-xl border border-slate-150 flex items-center justify-between">
                    <div className="min-w-0">
                      <span className="font-bold text-slate-800 text-xs block truncate">{item.name}</span>
                      <span className="text-[10px] text-slate-400 break-all">{item.addedBy ? item.addedBy.split('@')[0] : 'User'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-xs font-black text-emerald-700 bg-white px-2 py-0.5 rounded-lg border border-slate-200">
                        {item.price.toLocaleString()} Ks
                      </span>
                      {/* [v7.5.55 C32] Compact view: per-item delete, like grid. */}
                      {canManage && (
                        <button
                          type="button"
                          onClick={() => onDeletePricingItem(shop, idx)}
                          className="min-h-[44px] min-w-[44px] p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer flex items-center justify-center"
                          title={lang === 'my' ? 'ပစ္စည်းဖျက်မည်' : 'Delete item'}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* [v7.5.55 C32] Compact view: add-price form, like grid. */}
            {canManage ? (
              <form onSubmit={handleAddItem} className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  {lang === 'my' ? '+ ပစ္စည်းနှင့် ဈေးနှုန်း ဖြည့်စွက်ရန်' : '+ Add Item & Price'}
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder={lang === 'my' ? 'ပစ္စည်းအမည်' : 'Item name'}
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    className="w-full px-2.5 py-2.5 min-h-[44px] bg-slate-50 text-base border border-slate-200 rounded-lg outline-none text-slate-800 focus:bg-white"
                  />
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder={lang === 'my' ? 'ဈေးနှုန်း (Ks)' : 'Price (Ks)'}
                    value={newItemPrice}
                    onChange={(e) => setNewItemPrice(e.target.value)}
                    className="w-full px-2.5 py-2.5 min-h-[44px] bg-slate-50 text-base border border-slate-200 rounded-lg outline-none text-slate-800 focus:bg-white"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmittingItem || !newItemName.trim() || !newItemPrice.trim()}
                  className="w-full py-2.5 min-h-[44px] bg-slate-900 hover:bg-black disabled:opacity-50 text-white text-[11px] font-bold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>{lang === 'my' ? 'ဈေးနှုန်းအသစ် ထည့်သွင်းမည်' : 'Save Price'}</span>
                </button>
              </form>
            ) : (
              <p className="text-[11px] text-slate-400 italic">
                {lang === 'my' ? 'ဈေးနှုန်း ထည့်သွင်းရန် ဆိုင်ထည့်သူ သို့မဟုတ် admin ဖြစ်ရပါမည်။' : 'Only the shop adder or an admin can add prices.'}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // GRID CARD VIEW (Modern, balanced, high-craft editorial card)
  // ---------------------------------------------------------------------------
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 hover:border-slate-300 hover:shadow-md transition-all flex flex-col justify-between overflow-hidden">
      {/* CARD TOP HEADER */}
      <div className="p-5 pb-3">
        <div className="flex items-start justify-between gap-2 mb-3">
          {/* Category Pill with Icon */}
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${
                tagMeta?.bgColor || 'bg-slate-100'
              } ${tagMeta?.textColor || 'text-slate-800'} border ${tagMeta?.borderColor || 'border-slate-200'}`}
            >
              {renderCategoryIcon()}
              <span>{tagLabel}</span>
              {shop.subCategory && (
                <span className="px-1.5 py-0.2 bg-white/50 rounded text-[10px] ml-0.5 border border-black/5">
                  {shop.subCategory}
                </span>
              )}
            </span>

            {/* Public vs Private indicator badge */}
            {isPublic ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                🌐 {lang === 'my' ? 'ပြည်သူ့' : 'Public'}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                🔒 {lang === 'my' ? 'သီးသန့်' : 'Private'}
              </span>
            )}
          </div>

          {/* Upvote & Action Menu */}
          <div className="flex items-center gap-1.5 shrink-0">
            {isPublic && pub && (
              <button
                type="button"
                onClick={() => onToggleVote(pub)}
                className={`flex items-center gap-1 px-3 py-2.5 min-h-[44px] rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                  hasVoted
                    ? 'bg-emerald-500 border-emerald-500 text-white shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
                title={lang === 'my' ? 'အသုံးဝင်ကြောင်း မဲပေးမည်' : 'Helpful Vote'}
              >
                <ThumbsUp className={`w-3 h-3 ${hasVoted ? 'fill-white' : ''}`} />
                <span>{votesCount > 0 ? votesCount : ''}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onOpenEdit(shop)}
              className="min-h-[44px] min-w-[44px] p-2.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer flex items-center justify-center"
              title={lang === 'my' ? 'ပြင်ဆင်မည်' : 'Edit'}
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>

            {canDelete && (
              <button
                type="button"
                onClick={() => onDelete(shop.id, shop.name)}
                className="min-h-[44px] min-w-[44px] p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer flex items-center justify-center"
                title={lang === 'my' ? 'ဖျက်မည်' : 'Delete'}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Shop Name */}
        <h3 className="font-extrabold text-slate-900 text-base tracking-tight leading-normal break-words">
          {shop.name}
        </h3>

        {/* Location Subtext */}
        {locationString && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1 font-medium">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate min-w-0">{locationString}</span>
          </div>
        )}

        {/* PRIMARY PHONE CALL BAR */}
        {primaryPhone && (
          <div className="mt-3.5 p-2 bg-emerald-50/60 rounded-xl border border-emerald-100 flex items-center justify-between gap-2">
            <a
              href={`tel:${primaryPhone}`}
              className="flex items-center gap-2 text-emerald-800 hover:text-emerald-950 font-bold text-xs transition-colors min-w-0 min-h-[44px] py-1"
            >
              <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <Phone className="w-3 h-3" />
              </span>
              <span className="tracking-wide text-xs sm:text-sm font-black truncate">{primaryPhone}</span>
            </a>

            <div className="flex items-center gap-1 shrink-0">
              <a
                href={`tel:${primaryPhone}`}
                className="min-h-[44px] px-3 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-[11px] font-bold rounded-lg transition-all flex items-center"
              >
                {lang === 'my' ? 'ခေါ်မည်' : 'Call'}
              </a>
              <button
                type="button"
                onClick={() => handleCopyText(`ph-${shop.id}-0`, primaryPhone)}
                className="min-h-[44px] min-w-[44px] p-2.5 text-emerald-700 hover:text-emerald-950 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer flex items-center justify-center"
                title={lang === 'my' ? 'ဖုန်းကူးမည်' : 'Copy'}
              >
                {copiedId === `ph-${shop.id}-0` ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        )}

        {/* Secondary phones dropdown/expander if available */}
        {secondaryPhones.length > 0 && (
          <div className="mt-1.5">
            <button
              type="button"
              onClick={() => setShowAllPhones(!showAllPhones)}
              className="text-[11px] font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer min-h-[44px] px-1 py-2"
            >
              <span>
                {showAllPhones
                  ? lang === 'my'
                    ? 'အခြားဖုန်းများ ဝှက်မည် ▲'
                    : 'Hide extra phones ▲'
                  : lang === 'my'
                  ? `+ အခြားဖုန်း (${secondaryPhones.length}) ခု ကြည့်မည် ▼`
                  : `+${secondaryPhones.length} more phones ▼`}
              </span>
            </button>
            {showAllPhones && (
              <div className="mt-1.5 space-y-1 pl-2 border-l-2 border-slate-200">
                {secondaryPhones.map((ph, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs py-0.5">
                    <a href={`tel:${ph}`} className="text-emerald-700 font-bold hover:underline">
                      {ph}
                    </a>
                    <button
                      type="button"
                      onClick={() => handleCopyText(`ph-${shop.id}-${idx + 1}`, ph)}
                      className="text-slate-400 hover:text-slate-600 min-h-[44px] min-w-[44px] p-2.5 flex items-center justify-center"
                    >
                      {copiedId === `ph-${shop.id}-${idx + 1}` ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* KPAY INFORMATION PILL */}
        {shop.kpayNumber && (
          <div className="mt-2.5 px-3 py-1.5 bg-indigo-50/70 border border-indigo-100 rounded-xl flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-indigo-950 font-semibold min-w-0">
              <span className="px-1.5 py-0.2 bg-indigo-600 text-white rounded text-[10px] font-black shrink-0">
                KPay
              </span>
              <span className="truncate">{normalizedKpay || shop.kpayNumber}</span>
            </div>
            <button
              type="button"
              onClick={() => handleCopyText(`kpay-${shop.id}`, normalizedKpay || shop.kpayNumber || '')}
              className="min-h-[44px] min-w-[44px] p-2.5 hover:bg-indigo-100 text-indigo-600 rounded-md transition-colors cursor-pointer shrink-0 flex items-center justify-center"
              title={lang === 'my' ? 'KPay နံပါတ်ကူးမည်' : 'Copy KPay'}
            >
              {copiedId === `kpay-${shop.id}` ? (
                <Check className="w-3.5 h-3.5 text-indigo-600" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        )}

        {/* ADDRESS */}
        {primaryAddress && (
          <div className="mt-2.5 text-xs text-slate-600 flex items-start gap-1.5 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-150">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
            <span className="line-clamp-2 min-w-0 break-words">{primaryAddress}</span>
          </div>
        )}

        {/* GENERAL NOTES */}
        {shop.generalNotes && (
          <div className="mt-2 text-xs text-slate-600 bg-amber-50/40 p-2 rounded-xl border border-amber-100/60 italic line-clamp-2">
            📝 {shop.generalNotes}
          </div>
        )}
      </div>

      {/* ITEMS & LIVE PRICES ACCORDION */}
      <div className="border-t border-slate-100 bg-slate-50/50">
        <button
          type="button"
          onClick={() => setIsItemsExpanded(!isItemsExpanded)}
          className="w-full px-5 py-2.5 min-h-[44px] flex items-center justify-between text-xs font-bold text-slate-700 hover:bg-slate-100/70 transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>{lang === 'my' ? '🛒 ဈေးနှုန်း နှိုင်းယှဉ်' : '🛒 Compare Price'}</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 text-[10px] font-black">
              {(shop.items || []).length}
            </span>
          </span>
          <span className="text-slate-400 text-[11px] flex items-center gap-0.5">
            {isItemsExpanded ? (
              <>
                <span>{lang === 'my' ? 'ပိတ်မည်' : 'Hide'}</span>
                <ChevronUp className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                <span>{lang === 'my' ? 'ကြည့်မည်' : 'View'}</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </>
            )}
          </span>
        </button>

        {isItemsExpanded && (
          <div className="p-4 pt-1 space-y-3">
            {/* Disclaimer */}
            <div className="p-2 bg-rose-50 border border-rose-100 rounded-xl text-[10px] text-rose-800 flex items-start gap-1.5 leading-relaxed">
              <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0 mt-0.5" />
              <span>
                {lang === 'my'
                  ? 'အသုံးပြုသူများ ဖြည့်စွက်ချက်ဖြစ်ပြီး ဆော့ဖ်ဝဲလ်မှ တာဝန်မယူပါ။ ထည့်သွင်းသူ၏ တာဝန်သာ ဖြစ်ပါသည်။'
                  : 'Contributed voluntarily by users. App assumes no responsibility for accuracy.'}
              </span>
            </div>

            {/* List of items */}
            {(shop.items || []).length === 0 ? (
              <div className="text-center py-3 text-slate-400 text-xs italic">
                {lang === 'my' ? 'ပစ္စည်းစာရင်း မထည့်ရသေးပါ။ အောက်တွင် ထည့်သွင်းနိုင်ပါသည်။' : 'No items listed yet. Add one below.'}
              </div>
            ) : (
              <div className="space-y-1.5 max-h-44 overflow-y-auto overflow-x-hidden pr-1">
                {(shop.items || []).map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2 bg-white rounded-xl border border-slate-200/80 flex items-center justify-between text-xs"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="font-bold text-slate-900 truncate">{item.name}</div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                        <span className="truncate min-w-0">👤 {item.addedBy ? item.addedBy.split('@')[0] : 'User'}</span>
                        <span>•</span>
                        <span>{new Date(item.updatedAt).toLocaleDateString('en-GB')}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100 text-xs">
                        {item.price.toLocaleString()} Ks
                      </span>
                      {canManage && (
                        <button
                          type="button"
                          onClick={() => onDeletePricingItem(shop, idx)}
                          className="min-h-[44px] min-w-[44px] p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer flex items-center justify-center"
                          title={lang === 'my' ? 'ပစ္စည်းဖျက်မည်' : 'Delete item'}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add Price Item Form */}
            {canManage ? (
              <form onSubmit={handleAddItem} className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  {lang === 'my' ? '+ ပစ္စည်းနှင့် ဈေးနှုန်း ဖြည့်စွက်ရန်' : '+ Add Item & Price'}
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder={lang === 'my' ? 'ပစ္စည်းအမည်' : 'Item name'}
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    className="w-full px-2.5 py-2.5 min-h-[44px] bg-slate-50 text-base border border-slate-200 rounded-lg outline-none text-slate-800 focus:bg-white"
                  />
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder={lang === 'my' ? 'ဈေးနှုန်း (Ks)' : 'Price (Ks)'}
                    value={newItemPrice}
                    onChange={(e) => setNewItemPrice(e.target.value)}
                    className="w-full px-2.5 py-2.5 min-h-[44px] bg-slate-50 text-base border border-slate-200 rounded-lg outline-none text-slate-800 focus:bg-white"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmittingItem || !newItemName.trim() || !newItemPrice.trim()}
                  className="w-full py-2.5 min-h-[44px] bg-slate-900 hover:bg-black disabled:opacity-50 text-white text-[11px] font-bold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>{lang === 'my' ? 'ဈေးနှုန်းအသစ် ထည့်သွင်းမည်' : 'Save Price'}</span>
                </button>
              </form>
            ) : (
              <p className="text-[11px] text-slate-400 italic">
                {lang === 'my' ? 'ဈေးနှုန်း ထည့်သွင်းရန် ဆိုင်ထည့်သူ သို့မဟုတ် admin ဖြစ်ရပါမည်။' : 'Only the shop adder or an admin can add prices.'}
              </p>
            )}
          </div>
        )}
      </div>

      {/* CARD FOOTER ACTIONS */}
      <div className="p-3 bg-white border-t border-slate-150 flex items-center justify-between gap-2 text-xs">
        {/* Contributor Attribution */}
        {isPublic && pub && (
          <div className="flex items-center gap-1 text-[11px] text-slate-400 truncate max-w-[130px]" title={pub.addedBy}>
            <User className="w-3 h-3 shrink-0" />
            <span className="truncate">{pub.addedBy.split('@')[0]}</span>
          </div>
        )}

        {!isPublic && (
          <div className="text-[11px] text-amber-700 font-medium">
            ⭐️ {lang === 'my' ? 'ကိုယ်ပိုင်မှတ်တမ်း' : 'Private'}
          </div>
        )}

        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
          {/* Maps Button */}
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              `${shop.name} ${shop.stateRegion || ''} ${shop.township || ''} ${primaryAddress}`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[44px] min-w-[44px] p-2.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 flex items-center justify-center gap-1"
            title={lang === 'my' ? 'Google Maps တွင်ကြည့်ရန်' : 'View on Maps'}
          >
            <MapPin className="w-3 h-3 text-slate-400" />
            <span className="text-[10px] font-semibold hidden sm:inline">{lang === 'my' ? 'မြေပုံ' : 'Map'}</span>
            <ExternalLink className="w-2.5 h-2.5 opacity-60" />
          </a>

          {/* Copy Full Info Button */}
          <button
            type="button"
            onClick={() =>
              handleCopyText(
                `full-${shop.id}`,
                `${shop.name}\n${phonesList.length > 0 ? `${lang === 'my' ? 'ဖုန်း' : 'Phone'}: ${phonesList.join(', ')}\n` : ''}${
                  locationString ? `${lang === 'my' ? 'တည်နေရာ' : 'Location'}: ${locationString}\n` : ''
                }${primaryAddress ? `${lang === 'my' ? 'လိပ်စာ' : 'Address'}: ${addressesList.join(' | ')}\n` : ''}${
                  shop.kpayNumber ? `KPay: ${normalizedKpay || shop.kpayNumber}\n` : ''
                }${shop.generalNotes ? `Note: ${shop.generalNotes}` : ''}`
              )
            }
            className="min-h-[44px] min-w-[44px] p-2.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 flex items-center justify-center gap-1 cursor-pointer"
            title={lang === 'my' ? 'အပြည့်အစုံ ကူးယူမည်' : 'Copy all info'}
          >
            {copiedId === `full-${shop.id}` ? (
              <>
                <Check className="w-3 h-3 text-emerald-600" />
                <span className="text-[10px] font-bold text-emerald-700">{lang === 'my' ? 'ကူးပြီး' : 'Copied'}</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 text-slate-400" />
                <span className="text-[10px] font-semibold hidden sm:inline">{lang === 'my' ? 'ကူးမည်' : 'Copy'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
