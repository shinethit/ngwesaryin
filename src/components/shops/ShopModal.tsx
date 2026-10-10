import React, { useState, useEffect } from 'react';
import { X, Store, Phone, MapPin, Plus, Globe, Lock, AlertTriangle, Check } from 'lucide-react';
import { ShopContact, PublicShop } from '../../types';
import { MYANMAR_REGIONS, PRESET_TAGS } from './shopConstants';

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
  const [formCustomCategory, setFormCustomCategory] = useState('');
  const [formPhones, setFormPhones] = useState<string[]>(['']);
  const [formAddresses, setFormAddresses] = useState<string[]>(['']);
  const [formStateRegion, setFormStateRegion] = useState('ရန်ကုန်တိုင်းဒေသကြီး');
  const [formTownship, setFormTownship] = useState('လသာ');
  const [formCustomTownship, setFormCustomTownship] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formWard, setFormWard] = useState('');
  const [formKpayNumber, setFormKpayNumber] = useState('');
  const [formGeneralNotes, setFormGeneralNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

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

      const region = editingShop.stateRegion || 'ရန်ကုန်တိုင်းဒေသကြီး';
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
        setFormTownship(foundRegion?.townships[0]?.nameMy || 'လသာ');
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
      setFormPhones(['']);
      setFormAddresses(['']);
      setFormStateRegion('ရန်ကုန်တိုင်းဒေသကြီး');
      setFormTownship('လသာ');
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
    const cleanPhone = testPhone.replace(/[^0-9]/g, '');

    if (cleanPhone.length >= 7) {
      const dupPhone = existingShops.find((s) => {
        if (currentId && s.id === currentId) return false;
        const sPhones = (s.phones && s.phones.length > 0 ? s.phones : [s.phone]).map((p) =>
          p.replace(/[^0-9]/g, '')
        );
        return sPhones.some((p) => p === cleanPhone);
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

    if (testName.trim().length >= 3 && testTs) {
      const dupName = existingShops.find((s) => {
        if (currentId && s.id === currentId) return false;
        return (
          s.name.trim().toLowerCase() === testName.trim().toLowerCase() &&
          s.township === testTs
        );
      });
      if (dupName) {
        setDuplicateWarning(
          lang === 'my'
            ? `သတိပေးချက်: "${testTs}" တွင် "${testName}" အမည်တူ ဆိုင်ရှိနေပါသည်။`
            : `Warning: A shop named "${testName}" already exists in ${testTs}.`
        );
        return;
      }
    }

    setDuplicateWarning(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const cleanedPhones = formPhones.map((p) => p.trim()).filter(Boolean);
    if (cleanedPhones.length === 0) {
      alert(lang === 'my' ? 'ဖုန်းနံပါတ် အနည်းဆုံး တစ်ခု ထည့်သွင်းပေးပါ' : 'Please provide at least one phone number');
      return;
    }

    const finalCategory = formCategory === 'custom' ? formCustomCategory.trim() || 'အခြား' : formCategory;
    const finalTownship = formTownship === 'custom' ? formCustomTownship.trim() || 'အခြား' : formTownship;
    const cleanedAddresses = formAddresses.map((a) => a.trim()).filter(Boolean);

    setIsSubmitting(true);
    const success = await onSave({
      name: formName.trim(),
      note: finalCategory,
      phones: cleanedPhones,
      addresses: cleanedAddresses,
      stateRegion: formStateRegion,
      township: finalTownship,
      city: formCity.trim() || finalTownship,
      ward: formWard.trim(),
      kpayNumber: formKpayNumber.trim(),
      generalNotes: formGeneralNotes.trim(),
      targetDirectory: formDirectoryType,
    });
    setIsSubmitting(false);

    if (success) {
      onClose();
    }
  };

  const currentRegionObj = MYANMAR_REGIONS.find((r) => r.nameMy === formStateRegion) || MYANMAR_REGIONS[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xl w-full max-w-xl my-8 overflow-hidden">
        {/* MODAL HEADER */}
        <div className="p-5 border-b border-slate-150 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Store className="w-5 h-5" />
            </div>
            <div>
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
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY FORM */}
        <form onSubmit={handleSubmit} className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* DIRECTORY TARGET SELECTOR (Only when creating new) */}
          {!editingShop && (
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
                    <span className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                      <Globe className="w-4 h-4 text-emerald-600" />
                      <span>{lang === 'my' ? 'ပြည်သူ့လမ်းညွှန်' : 'Public Directory'}</span>
                    </span>
                    {formDirectoryType === 'public' && <Check className="w-4 h-4 text-emerald-600" />}
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
                      alert(
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
                    <span className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                      <Lock className="w-4 h-4 text-amber-600" />
                      <span>{lang === 'my' ? 'ကိုယ်ပိုင်စာရင်း ⭐️' : 'Private List ⭐️'}</span>
                    </span>
                    {formDirectoryType === 'private' && <Check className="w-4 h-4 text-amber-600" />}
                  </div>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    {lang === 'my' ? 'မိမိတစ်ဦးတည်းသာ လုံခြုံစွာ သီးသန့်သိမ်းဆည်းမည့်စာရင်း' : 'Visible only to your account'}
                  </p>
                </button>
              </div>
            </div>
          )}

          {/* DUPLICATE WARNING BANNER */}
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
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl text-sm font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400"
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
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl text-xs text-slate-900 outline-none transition-all"
                  />
                </div>
              )}
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
                      setFormCity(regionObj.townships[0].nameMy);
                      checkDuplicates(formPhones[0] || '', formName, regionObj.townships[0].nameMy);
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:bg-white cursor-pointer"
                >
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
                  onChange={(e) => {
                    setFormTownship(e.target.value);
                    if (e.target.value !== 'custom') {
                      setFormCity(e.target.value);
                      checkDuplicates(formPhones[0] || '', formName, e.target.value);
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:bg-white cursor-pointer"
                >
                  {currentRegionObj.townships.map((t) => (
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
                    setFormCity(e.target.value);
                    checkDuplicates(formPhones[0] || '', formName, e.target.value);
                  }}
                  placeholder={lang === 'my' ? 'ဥပမာ - နောင်ချို' : 'e.g. Naungcho'}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:bg-white"
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
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:bg-white"
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
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:bg-white"
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
                    className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl text-xs text-slate-900 outline-none transition-all"
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
                  className="w-full pl-14 pr-3 py-2 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-xs text-slate-900 outline-none transition-all"
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
                    className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl text-xs text-slate-900 outline-none transition-all"
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
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl text-xs text-slate-900 outline-none transition-all resize-none"
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
