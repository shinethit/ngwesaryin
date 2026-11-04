import React, { useState, useEffect } from 'react';
import { X, Store, Phone, MapPin, Plus, Globe, Lock, AlertTriangle, Check } from 'lucide-react';
import { ShopContact, PublicShop } from '../../types';
import { MYANMAR_REGIONS, PRESET_TAGS } from './shopConstants';
import { toLatinDigits } from '../../utils/myanmarDigits';

// [v7.5.55 C16] Normalize a Myanmar phone number before storing and
// before building tel: links: Myanmar digits → Latin, strip spaces/dashes,
// unify +95 / 95 / 09 to one 09… form.
export function normalizeMyanmarPhone(raw: string | null | undefined): string {
  if (!raw) return '';
  const cleaned = toLatinDigits(String(raw)).replace(/[^0-9+]/g, '');
  if (cleaned.startsWith('+95')) return '0' + cleaned.slice(3);
  if (cleaned.startsWith('95') && cleaned.length >= 11) return '0' + cleaned.slice(2);
  if (cleaned.startsWith('0')) return cleaned;
  if (cleaned.startsWith('9')) return '0' + cleaned;
  return cleaned;
}

export function isValidMyanmarPhone(raw: string | null | undefined): boolean {
  const n = normalizeMyanmarPhone(raw);
  return /^09\d{7,9}$/.test(n);
}

interface ShopModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingShop: ShopContact | PublicShop | null;
  isEditingPublic: boolean;
  directoryType: 'public' | 'private';
  plan?: string;
  lang: 'my' | 'en';
  onOpenUpgradeModal?: () => void;
  onSave: (shopData: {
    name: string;
    note: string;
    phones: string[];
    addresses: string[];
    stateRegion: string;
    township: string;
    city: string;
    ward: string;
    kpayNumber: string;
    generalNotes: string;
    subCategory: string;
    targetDirectory: 'public' | 'private';
  }) => Promise<boolean>;
  existingShops: (ShopContact | PublicShop)[];
}

export const ShopModal: React.FC<ShopModalProps> = ({
  isOpen,
  onClose,
  editingShop,
  isEditingPublic,
  directoryType,
  plan,
  lang,
  onOpenUpgradeModal,
  onSave,
  existingShops,
}) => {
  const [formDirectoryType, setFormDirectoryType] = useState<'public' | 'private'>(directoryType);
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('grocery');
  const [formSubCategory, setFormSubCategory] = useState('');
  const [formCustomCategory, setFormCustomCategory] = useState('');
  const [formPhones, setFormPhones] = useState<string[]>(['']);
  const [formAddresses, setFormAddresses] = useState<string[]>(['']);
  const [formStateRegion, setFormStateRegion] = useState('');
  const [formTownship, setFormTownship] = useState('');
  const [formCustomTownship, setFormCustomTownship] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formWard, setFormWard] = useState('');
  const [formKpayNumber, setFormKpayNumber] = useState('');
  const [formGeneralNotes, setFormGeneralNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  // [v7.5.60 E24] Validation errors show inline in the modal, not via
  // the browser's native alert().
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    if (editingShop) {
      setFormDirectoryType(isEditingPublic ? 'public' : 'private');
      setFormName(editingShop.name || '');

      const isPreset = PRESET_TAGS.some((t) => t.value === editingShop.note && t.value !== 'all');
      if (isPreset) {
        setFormCategory(editingShop.note || 'grocery');
        setFormCustomCategory('');
      } else if (editingShop.note) {
        setFormCategory('custom');
        setFormCustomCategory(editingShop.note);
      } else {
        setFormCategory('grocery');
        setFormCustomCategory('');
      }

      // [v7.5.55 C3] Restore the sub-category on edit (it was collected
      // but never restored, so editing silently dropped it).
      setFormSubCategory(editingShop.subCategory || '');

      const pList =
        editingShop.phones && editingShop.phones.length > 0
          ? editingShop.phones
          : editingShop.phone
          ? [editingShop.phone]
          : [''];
      setFormPhones(pList);

      const aList =
        editingShop.addresses && editingShop.addresses.length > 0
          ? editingShop.addresses
          : editingShop.address
          ? [editingShop.address]
          : [''];
      setFormAddresses(aList);

      const region = editingShop.stateRegion || '';
      setFormStateRegion(region);

      const foundRegion = MYANMAR_REGIONS.find((r) => r.nameMy === region);
      const isKnownTs = foundRegion?.townships.some((t) => t.nameMy === editingShop.township);
      if (isKnownTs) {
        setFormTownship(editingShop.township || (foundRegion?.townships[0]?.nameMy || ''));
        setFormCustomTownship('');
      } else if (editingShop.township) {
        setFormTownship('custom');
        setFormCustomTownship(editingShop.township);
      } else {
        // [v7.5.55 C27] No region/township default — the user must pick.
        setFormTownship('');
        setFormCustomTownship('');
      }

      setFormCity((editingShop as any).city || '');
      setFormWard(editingShop.ward || '');
      setFormKpayNumber(editingShop.kpayNumber || '');
      setFormGeneralNotes(editingShop.generalNotes || '');
    } else {
      setFormDirectoryType(directoryType);
      setFormName('');
      setFormCategory('grocery');
      setFormCustomCategory('');
      setFormSubCategory('');
      setFormPhones(['']);
      setFormAddresses(['']);
      // [v7.5.55 C27] New shops default to NO region/township (Yangon /
      // လသာ was wrong for most users) — the user must pick.
      setFormStateRegion('');
      setFormTownship('');
      setFormCustomTownship('');
      setFormCity('');
      setFormWard('');
      setFormKpayNumber('');
      setFormGeneralNotes('');
    }
    setDuplicateWarning(null);
  }, [isOpen, editingShop, isEditingPublic, directoryType]);

  if (!isOpen) return null;

  const handlePhoneChange = (idx: number, val: string) => {
    const updated = [...formPhones];
    updated[idx] = val;
    setFormPhones(updated);
    checkDuplicates(val, formName, formTownship);
  };

  const handleAddPhone = () => {
    setFormPhones([...formPhones, '']);
  };

  const handleRemovePhone = (idx: number) => {
    if (formPhones.length <= 1) return;
    setFormPhones(formPhones.filter((_, i) => i !== idx));
  };

  const handleAddressChange = (idx: number, val: string) => {
    const updated = [...formAddresses];
    updated[idx] = val;
    setFormAddresses(updated);
  };

  const handleAddAddress = () => {
    setFormAddresses([...formAddresses, '']);
  };

  const handleRemoveAddress = (idx: number) => {
    if (formAddresses.length <= 1) return;
    setFormAddresses(formAddresses.filter((_, i) => i !== idx));
  };

  const checkDuplicates = (testPhone: string, testName: string, testTs: string) => {
    const currentId = editingShop?.id;
    // [v7.5.55 C21] Resolve the REAL township — the literal string
    // 'custom' never matches a stored township, so name-dups were missed.
    const effectiveTs = testTs === 'custom' ? formCustomTownship.trim() : testTs;
    // [v7.5.55 C21/C16] Normalize phones before comparing (Myanmar digits
    // and +95/09 unification) — raw stripping turned Myanmar-digit phones
    // into '' so they never matched.
    const cleanPhone = normalizeMyanmarPhone(testPhone);

    if (cleanPhone.length >= 7) {
      const dupPhone = existingShops.find((s) => {
        if (currentId && s.id === currentId) return false;
        const sPhones = (s.phones && s.phones.length > 0 ? s.phones : [s.phone]).map((p) =>
          normalizeMyanmarPhone(p)
        );
        return sPhones.some((p) => p !== '' && p === cleanPhone);
      });

      if (dupPhone) {
        setDuplicateWarning(
          lang === 'my'
            ? `သတိပေးချက်: ဤဖုန်းနံပါတ် (${testPhone}) ဖြင့် "${dupPhone.name}" ဆိုင် မှတ်တမ်းတင်ထားပြီးဖြစ်ပါသည်။`
            : `Warning: A shop "${dupPhone.name}" already uses this phone number (${testPhone}).`
        );
        return;
      }
    }

    if (testName.trim().length >= 3 && effectiveTs) {
      const dupName = existingShops.find((s) => {
        if (currentId && s.id === currentId) return false;
        return (
          s.name.trim().toLowerCase() === testName.trim().toLowerCase() &&
          s.township === effectiveTs
        );
      });
      if (dupName) {
        setDuplicateWarning(
          lang === 'my'
            ? `သတိပေးချက်: "${effectiveTs}" တွင် "${testName}" အမည်တူ ဆိုင်ရှိနေပါသည်။`
            : `Warning: A shop named "${testName}" already exists in ${effectiveTs}.`
        );
        return;
      }
    }

    setDuplicateWarning(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!formName.trim()) return;

    // [v7.5.55 C16] Normalize phones (Myanmar digits → Latin, +95/09
    // unified) before storing, and validate — a bad number must not save.
    const cleanedPhones = formPhones
      .map((p) => normalizeMyanmarPhone(p.trim()))
      .filter(Boolean);
    if (cleanedPhones.length === 0) {
      setFormError(lang === 'my' ? 'ဖုန်းနံပါတ် အနည်းဆုံး တစ်ခု ထည့်သွင်းပေးပါ' : 'Please provide at least one phone number');
      return;
    }
    if (!cleanedPhones.every((p) => isValidMyanmarPhone(p))) {
      setFormError(
        lang === 'my'
          ? 'ဖုန်းနံပါတ် မမှန်ကန်ပါ — 09 ဖြင့် စပြီး ဂဏန်း ၉–၁၁ လုံး ဖြစ်ရပါမည် (ဥပမာ 09123456789)'
          : 'Invalid phone number — it must start with 09 and have 9–11 digits (e.g. 09123456789)'
      );
      return;
    }
    // [v7.5.60 E27/N-39] KPay is a payment number — validate it like the
    // phone number instead of saving any typo silently.
    const cleanKpay = normalizeMyanmarPhone(formKpayNumber.trim());
    if (cleanKpay && !isValidMyanmarPhone(cleanKpay)) {
      setFormError(
        lang === 'my'
          ? 'KPay နံပါတ် မမှန်ကန်ပါ — 09 ဖြင့် စပြီး ဂဏန်း ၉–၁၁ လုံး ဖြစ်ရပါမည်'
          : 'Invalid KPay number — it must start with 09 and have 9–11 digits'
      );
      return;
    }

    // [v7.5.55 C27] Region and township must be picked (no more Yangon/လသာ default).
    if (!formStateRegion || !formTownship) {
      setFormError(
        lang === 'my'
          ? 'ပြည်နယ်/တိုင်း နှင့် မြို့နယ် ရွေးချယ်ပေးပါ'
          : 'Please pick a state/region and a township'
      );
      return;
    }

    const finalCategory = formCategory === 'custom' ? formCustomCategory.trim() || 'အခြား' : formCategory;
    const finalTownship = formTownship === 'custom' ? formCustomTownship.trim() || 'အခြား' : formTownship;
    const cleanedAddresses = formAddresses.map((a) => a.trim()).filter(Boolean);

    setIsSubmitting(true);
    const success = await onSave({
      name: formName.trim(),
      note: finalCategory,
      subCategory: formSubCategory.trim(),
      phones: cleanedPhones,
      addresses: cleanedAddresses,
      stateRegion: formStateRegion,
      township: finalTownship,
      city: formCity.trim(),
      ward: formWard.trim(),
      kpayNumber: normalizeMyanmarPhone(formKpayNumber.trim()),
      generalNotes: formGeneralNotes.trim(),
      targetDirectory: formDirectoryType,
    });
    setIsSubmitting(false);

    if (success) {
      onClose();
    }
  };

  const currentRegionObj = MYANMAR_REGIONS.find((r) => r.nameMy === formStateRegion);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto overflow-x-hidden animate-fade-in">
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xl w-full max-w-xl my-8 overflow-hidden">
        {/* MODAL HEADER */}
        <div className="p-5 border-b border-slate-150 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <Store className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-extrabold text-slate-900 text-base">
                {editingShop
                  ? isEditingPublic
                    ? lang === 'my'
                      ? 'ပြည်သူ့လမ်းညွှန် ပြင်ဆင်ရန်'
                      : 'Edit Public Shop Contact'
                    : lang === 'my'
                    ? 'ကိုယ်ပိုင်ဆိုင် ပြင်ဆင်ရန်'
                    : 'Edit Private Shop Contact'
                  : lang === 'my'
                  ? 'ဆိုင်အချက်အလက် အသစ်ထည့်သွင်းရန်'
                  : 'Add New Shop Contact'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {formDirectoryType === 'public'
                  ? lang === 'my'
                    ? 'ပြည်သူလူထု အတူတကွ ရှာဖွေနိုင်ရန် ဝိုင်းဝန်းဖြည့်သွင်းပေးပါ'
                    : 'Share shop details with the community'
                  : lang === 'my'
                  ? 'သင်တစ်ဦးတည်းသာ မြင်တွေ့နိုင်မည့် သီးသန့်စာရင်းတွင် သိမ်းဆည်းမည်'
                  : 'Save privately for your personal reference'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 rounded-xl transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY FORM */}
        <form onSubmit={handleSubmit} className="p-5 space-y-5 max-h-[75vh] overflow-y-auto overflow-x-hidden">
          {/* DIRECTORY TARGET SELECTOR — shown for create AND edit so a shop
              can move between Public / Private (v7.5.55 C27). */}
          {(
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                {lang === 'my' ? 'သိမ်းဆည်းမည့် နေရာရွေးချယ်ရန် *' : 'Save Location *'}
              </label>
              <div className="grid grid-cols-2 gap-3">
                {/* Public Card */}
                <button
                  type="button"
                  onClick={() => setFormDirectoryType('public')}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    formDirectoryType === 'public'
                      ? 'bg-emerald-50/70 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="flex items-center gap-1.5 font-bold text-slate-900 text-xs min-w-0">
                      <Globe className="w-4 h-4 text-emerald-600" />
                      <span>{lang === 'my' ? 'ပြည်သူ့လမ်းညွှန်' : 'Public Directory'}</span>
                    </span>
                    {formDirectoryType === 'public' && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                  </div>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    {lang === 'my' ? 'လူတိုင်း ကြည့်ရှုအသုံးပြုနိုင်မည့် အများပိုင်စာရင်း' : 'Visible to all community users'}
                  </p>
                </button>

                {/* Private Card */}
                <button
                  type="button"
                  onClick={() => {
                    if (plan !== 'premium') {
                      setFormError(
                        lang === 'my'
                          ? 'ကိုယ်ပိုင်သီးသန့်ဆိုင်စာရင်းမှာ Premium အင်္ဂါရပ် ဖြစ်ပါသည်။ Premium သို့ အဆင့်မြှင့်တင်ပါ'
                          : 'Private list is a Premium VIP feature. Please upgrade to unlock.'
                      );
                      if (onOpenUpgradeModal) onOpenUpgradeModal();
                    } else {
                      setFormDirectoryType('private');
                    }
                  }}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    formDirectoryType === 'private'
                      ? 'bg-amber-50/70 border-amber-500 ring-2 ring-amber-500/20 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="flex items-center gap-1.5 font-bold text-slate-900 text-xs min-w-0">
                      <Lock className="w-4 h-4 text-amber-600" />
                      <span>{lang === 'my' ? 'ကိုယ်ပိုင်စာရင်း ⭐️' : 'Private List ⭐️'}</span>
                    </span>
                    {formDirectoryType === 'private' && <Check className="w-4 h-4 text-amber-600 shrink-0" />}
                  </div>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    {lang === 'my' ? 'မိမိတစ်ဦးတည်းသာ လုံခြုံစွာ သီးသန့်သိမ်းဆည်းမည့်စာရင်း' : 'Visible only to your account'}
                  </p>
                </button>
              </div>
            </div>
          )}

          {/* DUPLICATE WARNING BANNER */}
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 flex items-start gap-2 leading-relaxed">
              <span>⚠️ {formError}</span>
            </div>
          )}
          {duplicateWarning && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2 animate-fade-in leading-relaxed">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>{duplicateWarning}</span>
            </div>
          )}

          {/* SECTION 1: BASIC INFO */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5 text-emerald-600" />
                <span>{lang === 'my' ? 'အခြေခံ အချက်အလက်' : 'Basic Information'}</span>
              </span>
            </div>

            {/* Shop Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === 'my' ? 'ဆိုင်အမည် *' : 'Shop Name *'}
              </label>
              <input
                type="text"
                required
                value={formName}
                onChange={(e) => {
                  setFormName(e.target.value);
                  checkDuplicates(formPhones[0] || '', e.target.value, formTownship);
                }}
                placeholder={lang === 'my' ? 'ဥပမာ - ရွှေမန်း ကုန်စုံဆိုင်' : 'e.g. Shwe Man Grocery'}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl text-base font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400"
              />
            </div>

            {/* Shop Category Preset Chips */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {lang === 'my' ? 'ဆိုင်အမျိုးအစား *' : 'Shop Type *'}
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                {PRESET_TAGS.filter((t) => t.value !== 'all').map((tag) => {
                  const isSelected = formCategory === tag.value;
                  return (
                    <button
                      key={tag.value}
                      type="button"
                      onClick={() => setFormCategory(tag.value)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                        isSelected
                          ? 'bg-slate-900 border-slate-900 text-white shadow-2xs'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {lang === 'my' ? tag.labelMy : tag.labelEn}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setFormCategory('custom')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                    formCategory === 'custom'
                      ? 'bg-slate-900 border-slate-900 text-white shadow-2xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {lang === 'my' ? '+ စိတ်ကြိုက်' : '+ Custom'}
                </button>
              </div>

              {formCategory === 'custom' && (
                <div className="mt-2 animate-fade-in">
                  <input
                    type="text"
                    required
                    value={formCustomCategory}
                    onChange={(e) => setFormCustomCategory(e.target.value)}
                    placeholder={lang === 'my' ? 'ဥပမာ - စာအုပ်နှင့် စာရေးကိရိယာ' : 'e.g. Stationery & Books'}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl text-base text-slate-900 outline-none transition-all"
                  />
                </div>
              )}

            {/* Sub Category (Optional) */}
            <div className="mt-3">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === 'my' ? 'အောက်ထပ် အမျိုးအစား (ဥပမာ - bank, atm, clinic)' : 'Sub Category (e.g. bank, atm, clinic)'}
              </label>
              <input
                type="text"
                value={formSubCategory}
                onChange={(e) => setFormSubCategory(e.target.value)}
                placeholder={lang === 'my' ? 'ရွေးချယ်ရန် သို့မဟုတ် ရိုက်ထည့်ရန်' : 'Select or type'}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl text-base text-slate-900 outline-none transition-all"
              />
            </div>
            </div>
          </div>

          {/* SECTION 2: LOCATION */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                <span>{lang === 'my' ? 'တည်နေရာ အချက်အလက်များ' : 'Location Details'}</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* State/Region */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {lang === 'my' ? 'ပြည်နယ် / တိုင်း *' : 'State / Region *'}
                </label>
                <select
                  value={formStateRegion}
                  onChange={(e) => {
                    setFormStateRegion(e.target.value);
                    const regionObj = MYANMAR_REGIONS.find((r) => r.nameMy === e.target.value);
                    if (regionObj && regionObj.townships.length > 0) {
                      setFormTownship(regionObj.townships[0].nameMy);
                      checkDuplicates(formPhones[0] || '', formName, regionObj.townships[0].nameMy);
                    } else {
                      setFormTownship('');
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-base font-medium text-slate-900 outline-none focus:bg-white cursor-pointer"
                >
                  <option value="">{lang === 'my' ? '-- ပြည်နယ်/တိုင်း ရွေးပါ --' : '-- Pick a state / region --'}</option>
                  {MYANMAR_REGIONS.map((r) => (
                    <option key={r.id} value={r.nameMy}>
                      {lang === 'my' ? r.nameMy : r.nameEn}
                    </option>
                  ))}
                </select>
              </div>

              {/* Township */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {lang === 'my' ? 'မြို့နယ် *' : 'Township *'}
                </label>
                <select
                  value={formTownship}
                  disabled={!formStateRegion}
                  onChange={(e) => {
                    setFormTownship(e.target.value);
                    if (e.target.value !== 'custom') {
                      // [v7.5.55 C27] Never overwrite an already-typed city.
                      checkDuplicates(formPhones[0] || '', formName, e.target.value);
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-base font-medium text-slate-900 outline-none focus:bg-white cursor-pointer disabled:opacity-50"
                >
                  <option value="">{lang === 'my' ? '-- မြို့နယ် ရွေးပါ --' : '-- Pick a township --'}</option>
                  {(currentRegionObj?.townships || []).map((t) => (
                    <option key={t.id} value={t.nameMy}>
                      {lang === 'my' ? t.nameMy : t.nameEn}
                    </option>
                  ))}
                  <option value="custom">{lang === 'my' ? 'အခြား (စိတ်ကြိုက်ရေးရန်)' : 'Other (Custom)'}</option>
                </select>
              </div>
            </div>

            {formTownship === 'custom' && (
              <div className="animate-fade-in">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {lang === 'my' ? 'စိတ်ကြိုက် မြို့နယ်အမည် *' : 'Custom Township *'}
                </label>
                <input
                  type="text"
                  required
                  value={formCustomTownship}
                  onChange={(e) => {
                    setFormCustomTownship(e.target.value);
                    // [v7.5.55 C27] Never overwrite an already-typed city.
                    checkDuplicates(formPhones[0] || '', formName, e.target.value);
                  }}
                  placeholder={lang === 'my' ? 'ဥပမာ - နောင်ချို' : 'e.g. Naungcho'}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-base text-slate-900 outline-none focus:bg-white"
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {lang === 'my' ? 'ရပ်ကွက် / ကျေးရွာ' : 'Ward / Village'}
                </label>
                <input
                  type="text"
                  value={formWard}
                  onChange={(e) => setFormWard(e.target.value)}
                  placeholder={lang === 'my' ? 'ဥပမာ - ၁၂ ရပ်ကွက်' : 'e.g. Ward 12'}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-base text-slate-900 outline-none focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {lang === 'my' ? 'မြို့ / မြို့မ (ရှိလျှင်)' : 'City / Sub-town'}
                </label>
                <input
                  type="text"
                  value={formCity}
                  onChange={(e) => setFormCity(e.target.value)}
                  placeholder={lang === 'my' ? 'ဥပမာ - ရန်ကုန်' : 'e.g. Yangon'}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-base text-slate-900 outline-none focus:bg-white"
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: CONTACT & PAYMENT */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                <span>{lang === 'my' ? 'ဆက်သွယ်ရန်နှင့် ငွေပေးချေမှု' : 'Contact & Payment'}</span>
              </span>
            </div>

            {/* Phone Numbers */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700">
                  {lang === 'my' ? 'ဖုန်းနံပါတ်များ *' : 'Phone Numbers *'}
                </label>
                <button
                  type="button"
                  onClick={handleAddPhone}
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{lang === 'my' ? 'ဖုန်းထပ်ထည့်မည်' : 'Add Phone'}</span>
                </button>
              </div>

              {formPhones.map((ph, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="tel"
                    required={idx === 0}
                    value={ph}
                    onChange={(e) => handlePhoneChange(idx, e.target.value)}
                    placeholder={lang === 'my' ? `ဖုန်းနံပါတ် ${idx + 1} (ဥပမာ - ၀၉၁၂၃၄၅၆၇၈)` : `Phone number ${idx + 1}`}
                    className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl text-base text-slate-900 outline-none transition-all"
                  />
                  {formPhones.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemovePhone(idx)}
                      className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                      title={lang === 'my' ? 'ဖယ်ရှားမည်' : 'Remove'}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* KPay Number */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === 'my' ? 'KPay ဖုန်း / အကောင့်နံပါတ် (ရှိလျှင်)' : 'KPay Account / Phone (Optional)'}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formKpayNumber}
                  onChange={(e) => setFormKpayNumber(e.target.value)}
                  placeholder={lang === 'my' ? 'ဥပမာ - ၀၉၁၂၃၄၅၆၇၈၉' : 'e.g. 09123456789'}
                  className="w-full pl-14 pr-3 py-2 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-base text-slate-900 outline-none transition-all"
                />
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 bg-indigo-600 text-white rounded text-[9px] font-black pointer-events-none">
                  KPay
                </span>
              </div>
            </div>

            {/* Addresses */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700">
                  {lang === 'my' ? 'ဆိုင်လိပ်စာများ (လမ်း၊ အမှတ် စသဖြင့်)' : 'Physical Addresses'}
                </label>
                <button
                  type="button"
                  onClick={handleAddAddress}
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{lang === 'my' ? 'လိပ်စာထပ်ထည့်မည်' : 'Add Address'}</span>
                </button>
              </div>

              {formAddresses.map((addr, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={addr}
                    onChange={(e) => handleAddressChange(idx, e.target.value)}
                    placeholder={lang === 'my' ? `လိပ်စာ ${idx + 1} (ဥပမာ - ဗိုလ်ချုပ်လမ်း၊ အမှတ် ၄၅)` : `Address line ${idx + 1}`}
                    className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl text-base text-slate-900 outline-none transition-all"
                  />
                  {formAddresses.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveAddress(idx)}
                      className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 4: GENERAL NOTES */}
          <div className="space-y-2 pt-2">
            <label className="block text-xs font-semibold text-slate-700">
              {lang === 'my' ? 'အထွေထွေ မှတ်ချက်များ / အခြားအချက်အလက်' : 'Additional Notes (Optional)'}
            </label>
            <textarea
              rows={2}
              value={formGeneralNotes}
              onChange={(e) => setFormGeneralNotes(e.target.value)}
              placeholder={lang === 'my' ? 'ဥပမာ - အိမ်အရောက်ပို့ပေးသည်။ မနက် ၈ နာရီမှ ည ၈ နာရီအထိ ဖွင့်သည်။' : 'e.g. Delivery available. Open 8am - 8pm.'}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl text-base text-slate-900 outline-none transition-all resize-none"
            />
          </div>

          {/* MODAL ACTIONS FOOTER */}
          <div className="pt-4 border-t border-slate-150 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold transition-all cursor-pointer"
            >
              {lang === 'my' ? 'မလုပ်တော့ပါ' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>
                {isSubmitting
                  ? lang === 'my'
                    ? 'သိမ်းဆည်းနေပါသည်...'
                    : 'Saving...'
                  : editingShop
                  ? lang === 'my'
                    ? 'ပြင်ဆင်မှု သိမ်းဆည်းမည်'
                    : 'Update Shop'
                  : lang === 'my'
                  ? 'ဆိုင်အချက်အလက် သိမ်းဆည်းမည်'
                  : 'Save Shop'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
