import React, { useState, useEffect, useMemo } from 'react';
import {
  Store,
  Phone,
  MapPin,
  Search,
  Plus,
  Trash2,
  Edit2,
  Copy,
  ExternalLink,
  X,
  Sparkles,
  Info,
  Check,
  Globe,
  Lock,
  ThumbsUp,
  Map,
  User,
  AlertTriangle,
  LayoutGrid,
  List,
  ChevronDown,
  ChevronUp,
  Filter,
  RotateCcw,
  SlidersHorizontal,
} from 'lucide-react';
import { ShopContact, PublicShop } from '../types';
import { db, auth, handleFirestoreError, OperationType, safeSetDoc, safeDeleteDoc, safeUpdateDoc } from '../lib/firebase';
import {
  collection,
  onSnapshot,
  doc,
  query,
} from 'firebase/firestore';
import { MYANMAR_REGIONS, PRESET_TAGS, PresetTag } from './shops/shopConstants';
import { ShopCard } from './shops/ShopCard';
import { ShopModal } from './shops/ShopModal';

interface ShopsViewProps {
  shops: ShopContact[];
  lang: 'my' | 'en';
  plan?: string;
  onOpenUpgradeModal?: () => void;
  onAddShop: (shop: Omit<ShopContact, 'id' | 'userId' | 'createdAt'>) => void;
  onUpdateShop: (shop: ShopContact) => void;
  onDeleteShop: (id: string) => void;
}

export const ShopsView: React.FC<ShopsViewProps> = ({
  shops: privateShops,
  lang,
  plan = 'free',
  onOpenUpgradeModal,
  onAddShop: onAddPrivateShop,
  onUpdateShop: onUpdatePrivateShop,
  onDeleteShop: onDeletePrivateShop,
}) => {
  // Directory Type: 'public' (collaborative community) or 'private' (private directory)
  const [directoryType, setDirectoryType] = useState<'public' | 'private'>('public');

  // Community Collaborative Shops List from Firestore
  const [publicShops, setPublicShops] = useState<PublicShop[]>([]);
  const [loadingPublic, setLoadingPublic] = useState(true);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState('all');

  // Hierarchical Filter States
  const [selectedStateRegionFilter, setSelectedStateRegionFilter] = useState('all');
  const [selectedTownshipFilter, setSelectedTownshipFilter] = useState('all');
  const [selectedCityFilter, setSelectedCityFilter] = useState('all');
  const [selectedWardFilter, setSelectedWardFilter] = useState('all');
  const [isLocationFilterExpanded, setIsLocationFilterExpanded] = useState(false);

  // View Mode: 'grid' or 'compact'
  const [viewMode, setViewMode] = useState<'grid' | 'compact'>('grid');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingShop, setEditingShop] = useState<ShopContact | PublicShop | null>(null);
  const [isEditingPublic, setIsEditingPublic] = useState(false);

  // Upvotes
  const [votedIds, setVotedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('ngwe_shop_votes');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Policy Section Toggle
  const [isPolicyOpen, setIsPolicyOpen] = useState(false);

  // Real-time Firestore Subscription for Community Directory
  useEffect(() => {
    let unsubscribe = () => {};
    try {
      const q = query(collection(db, 'public_shops'));
      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const list = snapshot.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          })) as PublicShop[];
          list.sort((a, b) => b.createdAt - a.createdAt);
          setPublicShops(list);
          setLoadingPublic(false);
        },
        (err) => {
          handleFirestoreError(err, OperationType.LIST, 'public_shops');
          setLoadingPublic(false);
        }
      );
    } catch (e) {
      console.error(e);
      setLoadingPublic(false);
    }
    return () => unsubscribe();
  }, []);

  // Save voted IDs
  useEffect(() => {
    localStorage.setItem('ngwe_shop_votes', JSON.stringify(votedIds));
  }, [votedIds]);

  // Upvote / Helpful Vote
  const handleToggleVote = async (shop: PublicShop) => {
    const hasVoted = votedIds.includes(shop.id);
    const shopRef = doc(db, 'public_shops', shop.id);
    const currentVotes = (shop as any).helpfulCount || 0;

    try {
      if (hasVoted) {
        await safeUpdateDoc(shopRef, {
          helpfulCount: Math.max(0, currentVotes - 1),
        });
        setVotedIds((prev) => prev.filter((id) => id !== shop.id));
      } else {
        await safeUpdateDoc(shopRef, {
          helpfulCount: currentVotes + 1,
        });
        setVotedIds((prev) => [...prev, shop.id]);
      }
    } catch (err) {
      console.error('Failed to vote shop', err);
    }
  };

  // Open Add Modal
  const handleOpenAdd = () => {
    if (directoryType === 'private' && plan !== 'premium') {
      if (onOpenUpgradeModal) onOpenUpgradeModal();
      return;
    }
    setEditingShop(null);
    setIsEditingPublic(directoryType === 'public');
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (shop: ShopContact | PublicShop) => {
    const isPublic = 'addedBy' in shop;
    if (!isPublic && plan !== 'premium') {
      if (onOpenUpgradeModal) onOpenUpgradeModal();
      return;
    }
    setEditingShop(shop);
    setIsEditingPublic(isPublic);
    setIsModalOpen(true);
  };

  // Delete Handlers
  const handleDelete = async (id: string, name: string) => {
    if (directoryType === 'public') {
      const confirmMsg =
        lang === 'my'
          ? `"${name}" ကို ပြည်သူ့လမ်းညွှန်ထဲမှ ဖျက်ရန် သေချာပါသလား။`
          : `Are you sure you want to delete "${name}" from the Community Directory?`;
      if (!window.confirm(confirmMsg)) return;

      try {
        await safeDeleteDoc(doc(db, 'public_shops', id));
      } catch (err: any) {
        console.error('Failed to delete public shop', err);
        alert(`Error: ${err.message || err}`);
      }
    } else {
      const confirmMsg =
        lang === 'my'
          ? `"${name}" ဆိုင်လိပ်စာကို ကိုယ်ပိုင်လမ်းညွှန်ထဲမှ ဖျက်ရန် သေချာပါသလား။`
          : `Are you sure you want to delete "${name}" from your private list?`;
      if (window.confirm(confirmMsg)) {
        onDeletePrivateShop(id);
      }
    }
  };

  // Pricing Items (Live Wiki Prices)
  const handleAddPricingItem = async (
    shop: ShopContact | PublicShop,
    name: string,
    price: number
  ): Promise<boolean> => {
    const currentUser = auth.currentUser;
    const isPublic = 'addedBy' in shop;

    if (isPublic && !currentUser) {
      alert(
        lang === 'my'
          ? 'အကောင့်ဝင်ပြီးမှသာ ပြည်သူ့ဈေးနှုန်းများ တည်းဖြတ်နိုင်ပါမည်'
          : 'Please log in to contribute live prices'
      );
      return false;
    }

    const contributorName = currentUser
      ? currentUser.email || currentUser.displayName || 'အသုံးပြုသူ'
      : lang === 'my'
      ? 'ဧည့်သည်'
      : 'Guest';

    const newItem = {
      name,
      price,
      updatedAt: Date.now(),
      addedBy: contributorName,
    };

    const currentItems = shop.items || [];
    const existingIndex = currentItems.findIndex(
      (it) => it.name.toLowerCase() === newItem.name.toLowerCase()
    );
    let updatedItems = [...currentItems];
    if (existingIndex >= 0) {
      updatedItems[existingIndex] = newItem;
    } else {
      updatedItems = [newItem, ...updatedItems];
    }

    if (isPublic) {
      try {
        await safeUpdateDoc(doc(db, 'public_shops', shop.id), {
          items: updatedItems,
        });
        return true;
      } catch (err: any) {
        console.error('Failed to update pricing item', err);
        alert(`Error: ${err.message || err}`);
        return false;
      }
    } else {
      onUpdatePrivateShop({
        ...(shop as ShopContact),
        items: updatedItems,
      });
      return true;
    }
  };

  const handleDeletePricingItem = async (
    shop: ShopContact | PublicShop,
    indexToDelete: number
  ): Promise<boolean> => {
    const confirmMsg =
      lang === 'my'
        ? 'ဤပစ္စည်းကို ဈေးနှုန်းစာရင်းမှ ဖျက်ပစ်ရန် သေချာပါသလား။'
        : 'Are you sure you want to delete this price entry?';
    if (!window.confirm(confirmMsg)) return false;

    const isPublic = 'addedBy' in shop;
    const currentItems = shop.items || [];
    const updatedItems = currentItems.filter((_, i) => i !== indexToDelete);

    if (isPublic) {
      if (!auth.currentUser) {
        alert(
          lang === 'my'
            ? 'အကောင့်ဝင်ပြီးမှသာ ပြည်သူ့ဈေးနှုန်းများ ဖျက်နိုင်ပါမည်'
            : 'Please log in to manage prices'
        );
        return false;
      }
      try {
        await safeUpdateDoc(doc(db, 'public_shops', shop.id), {
          items: updatedItems,
        });
        return true;
      } catch (err: any) {
        console.error('Failed to delete pricing item', err);
        alert(`Error: ${err.message || err}`);
        return false;
      }
    } else {
      onUpdatePrivateShop({
        ...(shop as ShopContact),
        items: updatedItems,
      });
      return true;
    }
  };

  // Save Modal Data Handler
  const handleSaveModal = async (data: {
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
  }): Promise<boolean> => {
    const currentUser = auth.currentUser;

    if (data.targetDirectory === 'public') {
      if (!currentUser) {
        alert(
          lang === 'my'
            ? 'ပြည်သူ့ဆိုင်လမ်းညွှန်တွင် အချက်အလက်များ မျှဝေရန်အတွက် ဦးစွာ အကောင့်ဝင်ရန် လိုအပ်ပါသည်'
            : 'Please log in to contribute to the Community Directory'
        );
        return false;
      }

      try {
        if (editingShop && isEditingPublic) {
          const shopRef = doc(db, 'public_shops', editingShop.id);
          await safeUpdateDoc(shopRef, {
            name: data.name,
            phone: data.phones[0] || '',
            phones: data.phones,
            address: data.addresses[0] || '',
            addresses: data.addresses,
            note: data.note,
            stateRegion: data.stateRegion,
            township: data.township,
            city: data.city,
            ward: data.ward,
            kpayNumber: data.kpayNumber,
            generalNotes: data.generalNotes,
          });
        } else {
          const id = `pub_shop_${Date.now()}`;
          const shopRef = doc(db, 'public_shops', id);
          await safeSetDoc(shopRef, {
            id,
            name: data.name,
            phone: data.phones[0] || '',
            phones: data.phones,
            stateRegion: data.stateRegion,
            township: data.township,
            city: data.city,
            ward: data.ward,
            address: data.addresses[0] || '',
            addresses: data.addresses,
            note: data.note,
            addedBy: currentUser.email || currentUser.displayName || 'အသုံးပြုသူ',
            addedByUid: currentUser.uid,
            createdAt: Date.now(),
            helpfulCount: 0,
            kpayNumber: data.kpayNumber,
            generalNotes: data.generalNotes,
            items: [],
          });
        }
        return true;
      } catch (err: any) {
        console.error('Failed to save public shop', err);
        alert(`Error: ${err.message || err}`);
        return false;
      }
    } else {
      // Save Private Shop
      if (plan !== 'premium') {
        alert(
          lang === 'my'
            ? 'ကိုယ်ပိုင်ဆိုင်စာရင်း သုံးစွဲရန် Premium အသုံးပြုသူ ဖြစ်ရန် လိုအပ်ပါသည်'
            : 'Premium plan required for private lists'
        );
        if (onOpenUpgradeModal) onOpenUpgradeModal();
        return false;
      }

      if (editingShop && !isEditingPublic) {
        onUpdatePrivateShop({
          ...(editingShop as ShopContact),
          name: data.name,
          phone: data.phones[0] || '',
          phones: data.phones,
          address: data.addresses[0] || '',
          addresses: data.addresses,
          note: data.note,
          stateRegion: data.stateRegion,
          township: data.township,
          city: data.city,
          ward: data.ward,
          kpayNumber: data.kpayNumber,
          generalNotes: data.generalNotes,
        });
      } else {
        onAddPrivateShop({
          name: data.name,
          phone: data.phones[0] || '',
          phones: data.phones,
          address: data.addresses[0] || '',
          addresses: data.addresses,
          note: data.note,
          stateRegion: data.stateRegion,
          township: data.township,
          city: data.city,
          ward: data.ward,
          kpayNumber: data.kpayNumber,
          generalNotes: data.generalNotes,
          items: [],
        });
      }
      return true;
    }
  };

  // Determine active list & Filter
  const activeShopsList = directoryType === 'public' ? publicShops : privateShops;

  const filteredShops = useMemo(() => {
    return activeShopsList.filter((shop) => {
      // 1. Tag type filter
      if (selectedTagFilter !== 'all' && shop.note !== selectedTagFilter) {
        return false;
      }

      // 2. Hierarchical Location filters
      if (selectedStateRegionFilter !== 'all' && shop.stateRegion !== selectedStateRegionFilter) {
        return false;
      }
      if (selectedTownshipFilter !== 'all' && shop.township !== selectedTownshipFilter) {
        return false;
      }
      if (selectedCityFilter !== 'all' && (shop as any).city !== selectedCityFilter) {
        return false;
      }
      if (selectedWardFilter !== 'all' && (shop as any).ward !== selectedWardFilter) {
        return false;
      }

      // 3. Search query filter
      if (!searchQuery.trim()) return true;
      const queryStr = searchQuery.toLowerCase().trim();

      const nameMatch = shop.name.toLowerCase().includes(queryStr);
      const phonesList = shop.phones && shop.phones.length > 0 ? shop.phones : [shop.phone];
      const phoneMatch = phonesList.some((p) => p && p.toLowerCase().includes(queryStr));
      const addressesList = shop.addresses && shop.addresses.length > 0 ? shop.addresses : [shop.address || ''];
      const addressMatch = addressesList.some((a) => a && a.toLowerCase().includes(queryStr));
      const kpayMatch = (shop.kpayNumber || '').toLowerCase().includes(queryStr);
      const generalNotesMatch = (shop.generalNotes || '').toLowerCase().includes(queryStr);

      const locationMatch =
        ((shop as any).city || '').toLowerCase().includes(queryStr) ||
        (shop.stateRegion || '').toLowerCase().includes(queryStr) ||
        (shop.township || '').toLowerCase().includes(queryStr) ||
        (shop.ward || '').toLowerCase().includes(queryStr);

      const tagMeta = PRESET_TAGS.find((t) => t.value === shop.note);
      const tagMatch =
        (tagMeta &&
          (tagMeta.labelMy.toLowerCase().includes(queryStr) ||
            tagMeta.labelEn.toLowerCase().includes(queryStr))) ||
        (shop.note && shop.note.toLowerCase().includes(queryStr));

      const itemsMatch = (shop.items || []).some(
        (it) => it.name.toLowerCase().includes(queryStr) || String(it.price).includes(queryStr)
      );

      return (
        nameMatch ||
        phoneMatch ||
        addressMatch ||
        locationMatch ||
        tagMatch ||
        kpayMatch ||
        generalNotesMatch ||
        itemsMatch
      );
    });
  }, [
    activeShopsList,
    selectedTagFilter,
    selectedStateRegionFilter,
    selectedTownshipFilter,
    selectedCityFilter,
    selectedWardFilter,
    searchQuery,
  ]);

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedTagFilter !== 'all' ||
    selectedStateRegionFilter !== 'all' ||
    selectedTownshipFilter !== 'all' ||
    selectedCityFilter !== 'all' ||
    selectedWardFilter !== 'all';

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedTagFilter('all');
    setSelectedStateRegionFilter('all');
    setSelectedTownshipFilter('all');
    setSelectedCityFilter('all');
    setSelectedWardFilter('all');
  };

  const selectedRegionObj = MYANMAR_REGIONS.find((r) => r.nameMy === selectedStateRegionFilter);

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* --------------------------------------------------------------------- */}
      {/* 1. TOP HEADER & DIRECTORY SWITCHER                                    */}
      {/* --------------------------------------------------------------------- */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          {/* Title & Description */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <Store className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                  {lang === 'my' ? 'ပေါင်းစပ်ဆိုင်လမ်းညွှန်' : 'Community & Shop Directory'}
                </h1>
                <p className="text-xs font-semibold text-slate-500 mt-0.5">
                  {directoryType === 'public'
                    ? lang === 'my'
                      ? '👥 အများပြည်သူ ပူးပေါင်းပါဝင် ပြုပြင်နိုင်သော Wiki-style ဒေတာဘေ့စ်'
                      : '👥 Collaborative community Wiki directory'
                    : lang === 'my'
                    ? '🔒 သင့်တစ်ဦးတည်းသာ မြင်နိုင်သော သီးသန့်ဆိုင်စာရင်း (Premium)'
                    : '🔒 Private directory visible only to you (Premium)'}
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
              {lang === 'my'
                ? 'ဆိုင်လိပ်စာများ၊ ဖုန်းနံပါတ်မျိုးစုံ၊ KPay နှင့် ပစ္စည်းစာရင်း/ဈေးနှုန်းများကို မြို့အလိုက် စုပေါင်းရှာဖွေ၊ တည်းဖြတ်နိုင်ပါသည်။'
                : 'Search & contribute shop contacts, multiple phone numbers, KPay details, and real-time item prices across townships.'}
            </p>
          </div>

          {/* Top Actions: Add Shop Button */}
          <div className="flex items-center gap-2.5 shrink-0 self-start lg:self-center">
            <button
              type="button"
              onClick={handleOpenAdd}
              className="flex items-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold shadow-sm shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>
                {directoryType === 'public'
                  ? lang === 'my'
                    ? 'ဆိုင်အချက်အလက် မျှဝေမည်'
                    : 'Contribute Shop'
                  : lang === 'my'
                  ? 'ဆိုင်အသစ် ထည့်သွင်းမည်'
                  : 'Add New Shop'}
              </span>
            </button>
          </div>
        </div>

        {/* DIRECTORY SEGMENT SWITCHER */}
        <div className="mt-5 pt-5 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex p-1 bg-slate-100/90 rounded-2xl max-w-md border border-slate-200/60">
            <button
              type="button"
              onClick={() => {
                setDirectoryType('public');
                handleResetFilters();
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                directoryType === 'public'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Globe className="w-4 h-4 text-emerald-600" />
              <span>{lang === 'my' ? 'ပြည်သူ့လမ်းညွှန်' : 'Public Directory'}</span>
              <span className="px-1.5 py-0.2 rounded-full bg-slate-100 text-[10px] text-slate-600 font-extrabold border border-slate-200/60">
                {publicShops.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setDirectoryType('private');
                handleResetFilters();
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                directoryType === 'private'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Lock className="w-4 h-4 text-amber-500" />
              <span>{lang === 'my' ? 'ကိုယ်ပိုင်ဆိုင်များ' : 'Private List'}</span>
              <span className="px-1.5 py-0.2 rounded-full bg-slate-100 text-[10px] text-slate-600 font-extrabold border border-slate-200/60">
                {privateShops.length}
              </span>
            </button>
          </div>

          {/* VIEW MODE TOGGLE (Grid vs Compact List) */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/60 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'grid'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title={lang === 'my' ? 'ကတ်ပြကွက်' : 'Card Grid View'}
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="text-[11px] hidden sm:inline">{lang === 'my' ? 'ကတ်' : 'Cards'}</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('compact')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'compact'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title={lang === 'my' ? 'ကျစ်ကျစ်လစ်လစ် စာရင်းပြကွက်' : 'Compact List View'}
            >
              <List className="w-4 h-4" />
              <span className="text-[11px] hidden sm:inline">{lang === 'my' ? 'စာရင်း' : 'List'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* 2. LOCKED SCREEN FOR PRIVATE LIST (IF FREE USER)                      */}
      {/* --------------------------------------------------------------------- */}
      {directoryType === 'private' && plan !== 'premium' ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 text-center max-w-lg mx-auto shadow-xs space-y-4">
          <div className="w-14 h-14 bg-amber-50 rounded-2xl border border-amber-200 flex items-center justify-center mx-auto text-amber-600 shadow-2xs">
            <Lock className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <h3 className="font-extrabold text-slate-900 text-base">
              {lang === 'my' ? 'ကိုယ်ပိုင်ဆိုင်လမ်းညွှန် (Private Shop List)' : 'Private Shop Directory'}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
              {lang === 'my'
                ? 'ကိုယ်ပိုင်ဆိုင်လိပ်စာနှင့် ဖုန်းနံပါတ်များကို သီးသန့်သိမ်းဆည်းနိုင်သည့် အင်္ဂါရပ်မှာ Premium အသုံးပြုသူများအတွက်သာ ဖြစ်ပါသည်။'
                : 'Keeping a private list of shops and contacts is an exclusive VIP feature for Premium subscribers.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenUpgradeModal}
            className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-xs active:scale-95 transition-all cursor-pointer"
          >
            {lang === 'my' ? 'Premium သို့ အဆင့်မြှင့်တင်မည်' : 'Upgrade to Premium'}
          </button>
        </div>
      ) : (
        <>
          {/* ----------------------------------------------------------------- */}
          {/* 3. SEARCH & REFINED FILTER TOOLBAR (The user's key pain point)   */}
          {/* ----------------------------------------------------------------- */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-4 sm:p-5 shadow-xs space-y-4">
            {/* Primary Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    lang === 'my'
                      ? 'ဆိုင်အမည်၊ ဖုန်းနံပါတ်၊ KPay၊ တည်နေရာ သို့မဟုတ် ရောင်းချသည့်ပစ္စည်း ရှာရန်...'
                      : 'Search by shop name, phone, KPay, township, or item price...'
                  }
                  className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-2xl text-xs sm:text-sm font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 rounded-md cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Location Filter Toggle Button */}
              <button
                type="button"
                onClick={() => setIsLocationFilterExpanded(!isLocationFilterExpanded)}
                className={`flex items-center justify-between sm:justify-center gap-2 px-4 py-2.5 rounded-2xl border text-xs font-bold transition-all cursor-pointer shrink-0 ${
                  selectedStateRegionFilter !== 'all' || isLocationFilterExpanded
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                  <span>
                    {selectedStateRegionFilter !== 'all'
                      ? selectedTownshipFilter !== 'all'
                        ? `${selectedTownshipFilter} • ${selectedStateRegionFilter.replace('တိုင်းဒေသကြီး', '').replace('ပြည်နယ်', '')}`
                        : selectedStateRegionFilter
                      : lang === 'my'
                      ? 'မြို့နယ်အလိုက် စစ်ထုတ်ရန်'
                      : 'Filter by Location'}
                  </span>
                </div>
                {isLocationFilterExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {/* Reset All Filters if Active */}
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-2xl text-xs font-bold transition-colors cursor-pointer shrink-0"
                  title={lang === 'my' ? 'စစ်ထုတ်မှုအားလုံး ပယ်ဖျက်မည်' : 'Reset all filters'}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{lang === 'my' ? 'ရှင်းမည်' : 'Reset'}</span>
                </button>
              )}
            </div>

            {/* EXPANDABLE HIERARCHICAL LOCATION PANEL (Drop Down format as requested) */}
            {isLocationFilterExpanded && (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 animate-fade-in">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span className="flex items-center gap-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{lang === 'my' ? 'တည်နေရာ အဆင့်ဆင့် စစ်ထုတ်ခြင်း' : 'Hierarchical Location Filters'}</span>
                  </span>
                  <span className="text-[11px] text-slate-400 font-normal">
                    {lang === 'my' ? 'ပြည်နယ်/တိုင်း > မြို့နယ် > မြို့ > ရပ်ကွက်' : 'State/Region > Township > City > Ward'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                  {/* 1. State / Region */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      {lang === 'my' ? '၁။ ပြည်နယ် / တိုင်း' : '1. State / Region'}
                    </label>
                    <select
                      value={selectedStateRegionFilter}
                      onChange={(e) => {
                        setSelectedStateRegionFilter(e.target.value);
                        setSelectedTownshipFilter('all');
                        setSelectedCityFilter('all');
                        setSelectedWardFilter('all');
                      }}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none cursor-pointer"
                    >
                      <option value="all">{lang === 'my' ? 'အားလုံး (တစ်နိုင်ငံလုံး)' : 'All Regions'}</option>
                      {MYANMAR_REGIONS.map((r) => (
                        <option key={r.id} value={r.nameMy}>
                          {lang === 'my' ? r.nameMy : r.nameEn}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 2. Township */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      {lang === 'my' ? '၂။ မြို့နယ်' : '2. Township'}
                    </label>
                    <select
                      value={selectedTownshipFilter}
                      disabled={selectedStateRegionFilter === 'all'}
                      onChange={(e) => {
                        setSelectedTownshipFilter(e.target.value);
                        setSelectedCityFilter('all');
                        setSelectedWardFilter('all');
                      }}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none disabled:opacity-50 cursor-pointer"
                    >
                      <option value="all">{lang === 'my' ? 'မြို့နယ်အားလုံး' : 'All Townships'}</option>
                      {selectedRegionObj?.townships.map((t) => (
                        <option key={t.id} value={t.nameMy}>
                          {lang === 'my' ? t.nameMy : t.nameEn}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 3. City / Sub-town */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      {lang === 'my' ? '၃။ မြို့ / မြို့မ' : '3. City'}
                    </label>
                    <select
                      value={selectedCityFilter}
                      disabled={selectedTownshipFilter === 'all'}
                      onChange={(e) => setSelectedCityFilter(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none disabled:opacity-50 cursor-pointer"
                    >
                      <option value="all">{lang === 'my' ? 'မြို့အားလုံး' : 'All Cities'}</option>
                      {Array.from(
                        new Set(
                          activeShopsList
                            .filter(
                              (s) =>
                                s.stateRegion === selectedStateRegionFilter &&
                                s.township === selectedTownshipFilter &&
                                (s as any).city
                            )
                            .map((s) => (s as any).city)
                        )
                      ).map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 4. Ward */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      {lang === 'my' ? '၄။ ရပ်ကွက်' : '4. Ward'}
                    </label>
                    <select
                      value={selectedWardFilter}
                      disabled={selectedTownshipFilter === 'all'}
                      onChange={(e) => setSelectedWardFilter(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none disabled:opacity-50 cursor-pointer"
                    >
                      <option value="all">{lang === 'my' ? 'ရပ်ကွက်အားလုံး' : 'All Wards'}</option>
                      {Array.from(
                        new Set(
                          activeShopsList
                            .filter(
                              (s) =>
                                s.stateRegion === selectedStateRegionFilter &&
                                s.township === selectedTownshipFilter &&
                                (s as any).ward
                            )
                            .map((s) => (s as any).ward)
                        )
                      ).map((w) => (
                        <option key={w} value={w}>
                          {w}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* CATEGORY TAG PILLS CAROUSEL */}
            <div className="flex flex-wrap items-center gap-1.5">
              {PRESET_TAGS.map((tag) => {
                const isSelected = selectedTagFilter === tag.value;
                return (
                  <button
                    key={tag.value}
                    type="button"
                    onClick={() => setSelectedTagFilter(tag.value)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 border cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 border-slate-900 text-white shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span>{lang === 'my' ? tag.labelMy : tag.labelEn}</span>
                  </button>
                );
              })}
            </div>

            {/* ACTIVE FILTERS SUMMARY & COUNT */}
            <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-slate-800">
                  {lang === 'my'
                    ? `တွေ့ရှိသောဆိုင် (${filteredShops.length}) ဆိုင်`
                    : `Showing ${filteredShops.length} shops`}
                </span>
                {selectedStateRegionFilter !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded-md text-[10px] font-bold border border-emerald-100">
                    📍 {selectedStateRegionFilter}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedStateRegionFilter('all');
                        setSelectedTownshipFilter('all');
                      }}
                      className="hover:text-emerald-950"
                    >
                      ✕
                    </button>
                  </span>
                )}
                {selectedTownshipFilter !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded-md text-[10px] font-bold border border-emerald-100">
                    🏘️ {selectedTownshipFilter}
                    <button
                      type="button"
                      onClick={() => setSelectedTownshipFilter('all')}
                      className="hover:text-emerald-950"
                    >
                      ✕
                    </button>
                  </span>
                )}
                {selectedTagFilter !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-800 rounded-md text-[10px] font-bold border border-slate-200">
                    🏷️ {PRESET_TAGS.find((t) => t.value === selectedTagFilter)?.labelMy || selectedTagFilter}
                    <button
                      type="button"
                      onClick={() => setSelectedTagFilter('all')}
                      className="hover:text-black"
                    >
                      ✕
                    </button>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* ----------------------------------------------------------------- */}
          {/* 4. SHOPS LIST / GRID DISPLAY                                      */}
          {/* ----------------------------------------------------------------- */}
          {filteredShops.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Store className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-800 text-sm">
                {lang === 'my' ? 'ရှာဖွေမှုနှင့် ကိုက်ညီသော ဆိုင်မတွေ့ပါ' : 'No matching shops found'}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {lang === 'my'
                  ? 'အခြားမြို့နယ် သို့မဟုတ် ဆိုင်အမျိုးအစား ပြောင်းလဲရှာဖွေပါ၊ သို့မဟုတ် ဆိုင်အချက်အလက် အသစ် ထည့်သွင်းပေးနိုင်ပါသည်။'
                  : 'Try adjusting your search criteria or contribute this shop to the directory.'}
              </p>
              <div className="flex items-center justify-center gap-2 pt-2">
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    {lang === 'my' ? 'စစ်ထုတ်မှု အားလုံးရှင်းမည်' : 'Clear Filters'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleOpenAdd}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  {lang === 'my' ? '+ ဆိုင်အသစ် ထည့်သွင်းမည်' : '+ Add Shop'}
                </button>
              </div>
            </div>
          ) : viewMode === 'compact' ? (
            <div className="space-y-2.5">
              {filteredShops.map((shop) => (
                <ShopCard
                  key={shop.id}
                  shop={shop}
                  isPublic={directoryType === 'public'}
                  lang={lang}
                  viewMode="compact"
                  hasVoted={votedIds.includes(shop.id)}
                  onToggleVote={handleToggleVote}
                  onOpenEdit={handleOpenEdit}
                  onDelete={handleDelete}
                  onAddPricingItem={handleAddPricingItem}
                  onDeletePricingItem={handleDeletePricingItem}
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredShops.map((shop) => (
                <ShopCard
                  key={shop.id}
                  shop={shop}
                  isPublic={directoryType === 'public'}
                  lang={lang}
                  viewMode="grid"
                  hasVoted={votedIds.includes(shop.id)}
                  onToggleVote={handleToggleVote}
                  onOpenEdit={handleOpenEdit}
                  onDelete={handleDelete}
                  onAddPricingItem={handleAddPricingItem}
                  onDeletePricingItem={handleDeletePricingItem}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* 5. USAGE POLICY & GUIDELINES ACCORDION                                */}
      {/* --------------------------------------------------------------------- */}
      <div className="bg-slate-50 rounded-2xl border border-slate-200/80 overflow-hidden">
        <button
          type="button"
          onClick={() => setIsPolicyOpen(!isPolicyOpen)}
          className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50 transition-all text-left cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
              <Info className="w-4 h-4" />
            </span>
            <div>
              <span className="text-xs font-bold text-slate-800">
                {lang === 'my'
                  ? 'ပြည်သူ့လမ်းညွှန်၏ မူဝါဒနှင့် လမ်းညွှန်ချက်များ (Usage Policy & Guidelines)'
                  : 'Community Directory Policy & Guidelines'}
              </span>
              <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                {lang === 'my'
                  ? 'လုံခြုံစိတ်ချစွာ အတူတကွ အသုံးပြုနိုင်ရန် စည်းကမ်းချက်များနှင့် တာဝန်ယူမှု ရှင်းလင်းချက်'
                  : 'Read community rules, disclaimers, and 30-day auto-migration policy'}
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-indigo-600 flex items-center gap-1">
            {isPolicyOpen ? (
              <>
                <span>{lang === 'my' ? 'ပိတ်မည်' : 'Collapse'}</span>
                <ChevronUp className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                <span>{lang === 'my' ? 'ဖတ်ရှုရန်' : 'Expand'}</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </>
            )}
          </span>
        </button>

        {isPolicyOpen && (
          <div className="p-5 border-t border-slate-100 bg-white/70 text-slate-700 text-xs space-y-4 leading-relaxed animate-fade-in">
            {lang === 'my' ? (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <h4 className="font-extrabold text-slate-900 text-xs text-indigo-700">
                    ၁။ အခြေခံ မူဝါဒ (Core Policy)
                  </h4>
                  <ul className="list-disc list-inside pl-2 space-y-1 text-slate-600">
                    <li>
                      <strong>အများပြည်သူအတွက်သာ:</strong> ဤလမ်းညွှန်ရှိ ဆိုင်အချက်အလက်အားလုံးသည် အများပြည်သူ အလွယ်တကူ ဆက်သွယ်အသုံးပြုနိုင်ရန်အတွက်သာ ဖြစ်ပြီး အလွဲသုံးစားပြုလုပ်ရန် လုံးဝခွင့်မပြုပါ။
                    </li>
                    <li>
                      <strong>တာဝန်ယူမှု ရှင်းလင်းချက်:</strong> အချက်အလက်များကို ပြည်သူများမှ ဝိုင်းဝန်းပြင်ဆင်နိုင်သော (Wiki Style) ဖြစ်သောကြောင့် သတင်းအချက်အလက်နှင့် ဈေးနှုန်းများအတွက် ဆော့ဖ်ဝဲလ်မှ တာဝန်ယူမည်မဟုတ်ပါ။
                    </li>
                    <li>
                      <strong>တရားဝင်မှု:</strong> တရားမဝင်သော ပစ္စည်းများ ရောင်းချသည့်ဆိုင်များနှင့် လှည့်ဖြားသည့် ဖုန်းနံပါတ်များ တင်ခြင်းကို လုံးဝခွင့်မပြုပါ။
                    </li>
                  </ul>
                </div>

                <div className="space-y-1.5">
                  <h4 className="font-extrabold text-slate-900 text-xs text-emerald-700">
                    ၂။ မျှဝေခြင်း လမ်းညွှန်ချက်များ (Contribution Guidelines)
                  </h4>
                  <ul className="list-disc list-inside pl-2 space-y-1 text-slate-600">
                    <li>
                      <strong>တိကျစွာ ဖြည့်စွက်ပါ:</strong> ဆိုင်အမည်၊ ဖုန်းနံပါတ်မျိုးစုံ၊ KPay နှင့် သက်ဆိုင်ရာ မြို့နယ်၊ ရပ်ကွက်ကို စနစ်တကျ မှန်ကန်စွာ ဖြည့်သွင်းပါ။
                    </li>
                    <li>
                      <strong>ဝိုင်းဝန်းတည်းဖြတ်ပါ:</strong> အကယ်၍ ဆိုင်ဖုန်းနံပါတ် မှားယွင်းနေခြင်း သို့မဟုတ် ဆိုင်ပိတ်သွားခြင်းများ တွေ့ရှိပါက အကောင့်ဝင်၍ ပြင်ဆင်တည်းဖြတ်ပေးနိုင်ပါသည်။
                    </li>
                    <li>
                      <strong>ထောက်ခံမဲပေးပါ:</strong> ဆိုင်အချက်အလက် မှန်ကန်ပါက <strong className="text-emerald-700">"👍 မဲပေးမည်"</strong> ခလုတ်ကို နှိပ်ပေးခြင်းဖြင့် အခြားသူများကို ကူညီပါ။
                    </li>
                  </ul>
                </div>

                <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 space-y-2">
                  <div>
                    ⚠️ <strong>သတိပြုရန်:</strong> ပြည်သူ့လမ်းညွှန်တွင် မိမိမျှဝေလိုက်သော အချက်အလက်များကို အခြားအသုံးပြုသူများအားလုံး မြင်တွေ့နိုင်မည်ဖြစ်ပြီး ဝိုင်းဝန်းပြင်ဆင်နိုင်မည် ဖြစ်သည်။ လျှို့ဝှက်သော သို့မဟုတ် ကိုယ်ပိုင်သီးသန့် သိမ်းဆည်းလိုသော ဆိုင်များကို <strong>"ကိုယ်ပိုင်ဆိုင်များ"</strong> tab တွင်သာ သိမ်းဆည်းရန် တိုက်တွန်းအပ်ပါသည်။
                  </div>
                  <div className="text-rose-700 font-extrabold border-t border-amber-200/80 pt-2">
                    ⭐️ <strong>သီးသန့်ဆိုင်များ သတိပြုရန် မူဝါဒ:</strong> Premium သက်တမ်းကုန်ဆုံးပြီး ရက်ပေါင်း ၃၀ ကျော်သည်အထိ ပြန်လည်သက်တမ်းမတိုးပါက ကိုယ်ပိုင်စာရင်း (Private List) ထဲရှိ ဆိုင်များကို စနစ်မှ အများပြည်သူသုံး ပြည်သူ့လမ်းညွှန် (Public Directory) ထဲသို့ အလိုအလျောက် ပြောင်းရွှေ့ပေးသွားမည် ဖြစ်ပါသည်။
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <h4 className="font-extrabold text-slate-900 text-xs text-indigo-700">
                    1. Core Usage Policy
                  </h4>
                  <ul className="list-disc list-inside pl-2 space-y-1 text-slate-600">
                    <li>
                      <strong>Public Directory Only:</strong> All information shared here is exclusively for public contact and convenience. Spam and harassment are strictly forbidden.
                    </li>
                    <li>
                      <strong>Accuracy Disclaimer:</strong> Community Wiki directory. We do not assume liability for incorrect pricing or vendor errors.
                    </li>
                  </ul>
                </div>

                <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 space-y-2">
                  <div>
                    ⚠️ <strong>Privacy Note:</strong> Public shop listings are visible to and editable by all users. Keep sensitive contacts in your Private List.
                  </div>
                  <div className="text-rose-700 font-bold border-t border-amber-200/80 pt-2">
                    ⭐️ <strong>30-Day Auto-Migration Policy:</strong> If a Premium account expires and remains inactive for more than 30 days, private shops are automatically transitioned to the public directory.
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* 6. ADD / EDIT SHOP MODAL                                              */}
      {/* --------------------------------------------------------------------- */}
      <ShopModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editingShop={editingShop}
        isEditingPublic={isEditingPublic}
        directoryType={directoryType}
        plan={plan}
        lang={lang}
        onOpenUpgradeModal={onOpenUpgradeModal}
        onSave={handleSaveModal}
        existingShops={directoryType === 'public' ? publicShops : privateShops}
      />
    </div>
  );
};
export default ShopsView;
