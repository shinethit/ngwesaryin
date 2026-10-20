import React, { useState, useEffect, useMemo } from 'react';
import { Store, MapPin, Search, Plus, X, Info, Globe, Lock, LayoutGrid, List, ChevronDown, ChevronUp, Filter, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { ShopContact, PublicShop } from '../types';
import { db, auth, handleFirestoreError, OperationType, safeSetDoc, safeDeleteDoc, safeUpdateDoc } from '../lib/firebase';
import {
  collection,
  onSnapshot,
  doc,
  query,
} from 'firebase/firestore';
import { MYANMAR_REGIONS, PRESET_TAGS } from './shops/shopConstants';
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
  const [showUnknown, setShowUnknown] = useState(false);

  // Sort mode: 'newest' | 'name-asc' | 'name-desc' | 'helpful' | 'group-category'
  const [sortMode, setSortMode] = useState<'newest' | 'name-asc' | 'name-desc' | 'helpful' | 'group-category'>('group-category');

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

      // 1. Tag type filter (Category သို့မဟုတ် Sub Category နဲ့ ကိုက်ညီမှုရှာခြင်း)
      if (selectedTagFilter !== 'all') {
        const isUnknown = shop.name.startsWith('Unknown ');
        const shopCat = isUnknown ? 'unknown' : (shop.note || 'other');
        const shopSubCat = shop.subCategory || '';
        
        if (shopCat !== selectedTagFilter && shopSubCat !== selectedTagFilter) {
          return false;
        }
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
        (shop.note && shop.note.toLowerCase().includes(queryStr)) ||
        (shop.subCategory && shop.subCategory.toLowerCase().includes(queryStr));

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

  // [v7.5.37] Sort + Group logic
  const sortedAndGrouped = useMemo(() => {
    // First sort the filtered shops
    const sorted = [...filteredShops].sort((a, b) => {
      const aName = (a.name || '').toLowerCase();
      const bName = (b.name || '').toLowerCase();
      const aCreated = (a as any).createdAt || 0;
      const bCreated = (b as any).createdAt || 0;
      const aHelpful = (a as any).helpfulCount || 0;
      const bHelpful = (b as any).helpfulCount || 0;

      if (sortMode === 'name-asc') return aName.localeCompare(bName);
      if (sortMode === 'name-desc') return bName.localeCompare(aName);
      if (sortMode === 'helpful') return bHelpful - aHelpful;
      // newest (default)
      return bCreated - aCreated;
    });

    // If not grouping, return flat
    if (sortMode !== 'group-category') {
      return { flat: sorted, groups: null };
    }

    // Group by category (note field)
    const groupMap = new Map<string, (ShopContact | PublicShop)[]>();
    sorted.forEach((shop) => {
      const isUnknown = shop.name.startsWith('Unknown ');
      
      // Unknown ဖြစ်ပြီး Toggle က ပိတ်ထားရင် ဒီ Group ထဲ ထည့်မှာ မဟုတ်ပါဘူး
      if (isUnknown && !showUnknown) return; 
      
      const cat = isUnknown ? 'unknown' : (shop.note || 'other');
      if (!groupMap.has(cat)) groupMap.set(cat, []);
      groupMap.get(cat)!.push(shop);
    });

    // Sort groups by PRESET_TAGS order
    const orderedGroups: Array<{ key: string; label: string; shops: (ShopContact | PublicShop)[] }> = [];
    PRESET_TAGS.filter((t) => t.value !== 'all').forEach((tag) => {
      const shops = groupMap.get(tag.value);
      if (shops && shops.length > 0) {
        orderedGroups.push({
          key: tag.value,
          label: lang === 'my' ? tag.labelMy : tag.labelEn,
          shops,
        });
        groupMap.delete(tag.value);
      }
    });
    // Any custom categories not in PRESET_TAGS
    groupMap.forEach((shops, key) => {
      if (shops.length > 0) {
        orderedGroups.push({ key, label: key, shops });
      }
    });

    return { flat: null, groups: orderedGroups };
  }, [filteredShops, sortMode, lang, showUnknown]);

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
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* --------------------------------------------------------------------- */}
      {/* 1. COMPACT HEADER                                                     */}
      {/* --------------------------------------------------------------------- */}
      <div className="bg-white rounded-2xl border border-slate-200/80 px-4 py-3 shadow-xs">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {/* Left: Title */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <Store className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-extrabold text-slate-900 truncate">
                {lang === 'my' ? 'ပေါင်းစပ်ဆိုင်လမ်းညွှန်' : 'Shop Directory'}
              </h1>
              <p className="text-[10px] font-semibold text-slate-500 truncate">
                {directoryType === 'public'
                  ? (lang === 'my' ? '👥 ပြည်သူ့လမ်းညွှန်' : '👥 Public')
                  : (lang === 'my' ? '🔒 ကိုယ်ပိုင်' : '🔒 Private')}
              </p>
            </div>
          </div>

          {/* Right: Add button */}
          <button
            type="button"
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{lang === 'my' ? 'ဆိုင်အသစ်' : 'Add Shop'}</span>
          </button>
        </div>

        {/* Directory Switcher + View Mode — SAME ROW */}
        <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
          {/* Directory Tabs */}
          <div className="flex p-0.5 bg-slate-100 rounded-xl border border-slate-200/60 flex-1 min-w-0 max-w-xs">
            <button
              type="button"
              onClick={() => { setDirectoryType('public'); handleResetFilters(); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${directoryType === 'public' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'}`}
            >
              <Globe className="w-3.5 h-3.5 text-emerald-600" />
              <span>{lang === 'my' ? 'ပြည်သူ့' : 'Public'}</span>
              <span className="px-1 py-0.2 rounded-full bg-slate-100 text-[9px] text-slate-600 font-extrabold border border-slate-200/60">
                {publicShops.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => { setDirectoryType('private'); handleResetFilters(); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${directoryType === 'private' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'}`}
            >
              <Lock className="w-3.5 h-3.5 text-amber-500" />
              <span>{lang === 'my' ? 'ကိုယ်ပိုင်' : 'Private'}</span>
              <span className="px-1 py-0.2 rounded-full bg-slate-100 text-[9px] text-slate-600 font-extrabold border border-slate-200/60">
                {privateShops.length}
              </span>
            </button>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200/60 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-all cursor-pointer ${viewMode === 'grid' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'}`}
              title={lang === 'my' ? 'ကတ်ပြကွက်' : 'Grid'}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('compact')}
              className={`p-1.5 rounded-md transition-all cursor-pointer ${viewMode === 'compact' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'}`}
              title={lang === 'my' ? 'စာရင်း' : 'List'}
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* 2. LOCKED SCREEN FOR PRIVATE LIST                                     */}
      {/* --------------------------------------------------------------------- */}
      {directoryType === 'private' && plan !== 'premium' ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center max-w-lg mx-auto shadow-xs space-y-4">
          <div className="w-14 h-14 bg-amber-50 rounded-2xl border border-amber-200 flex items-center justify-center mx-auto text-amber-600 shadow-2xs">
            <Lock className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <h3 className="font-extrabold text-slate-900 text-base">
              {lang === 'my' ? 'ကိုယ်ပိုင်ဆိုင်လမ်းညွှန်' : 'Private Shop Directory'}
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
          {/* 3. COMPACT SEARCH + FILTER BAR                                    */}
          {/* ----------------------------------------------------------------- */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-3 shadow-xs space-y-2.5">
            {/* Row 1: Search + Location toggle + Reset + Count */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1 min-w-0">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    lang === 'my'
                      ? 'ဆိုင်အမည်၊ ဖုန်း၊ KPay၊ မြို့နယ် ရှာရန်...'
                      : 'Search shops, phone, KPay, township...'
                  }
                  className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl text-xs font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 rounded-md cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Sort Dropdown */}
              <div className="relative shrink-0">
                <select
                  value={sortMode}
                  onChange={(e) => setSortMode(e.target.value as any)}
                  className="appearance-none pl-2.5 pr-7 py-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-xl text-[11px] font-bold text-slate-700 outline-none cursor-pointer"
                  title={lang === 'my' ? 'စီစဥ်ရန်' : 'Sort'}
                >
                  <option value="group-category">{lang === 'my' ? '📁 အုပ်စုခွဲ (အမျိုးအစား)' : '📁 Group by Category'}</option>
                  <option value="newest">{lang === 'my' ? '🆕 အသစ်ဆုံး' : '🆕 Newest'}</option>
                  <option value="name-asc">{lang === 'my' ? '🔤 အမည် A→Z' : '🔤 Name A→Z'}</option>
                  <option value="name-desc">{lang === 'my' ? '🔤 အမည် Z→A' : '🔤 Name Z→A'}</option>
                  <option value="helpful">{lang === 'my' ? '👍 မဲအများဆုံး' : '👍 Most Helpful'}</option>
                </select>
                <ChevronDown className="w-3 h-3 text-slate-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Location Filter Icon Button */}
              <button
                type="button"
                onClick={() => setIsLocationFilterExpanded(!isLocationFilterExpanded)}
                className={`flex items-center gap-1 px-2.5 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer shrink-0 ${selectedStateRegionFilter !== 'all' || isLocationFilterExpanded ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                title={lang === 'my' ? 'မြို့နယ်အလိုက် စစ်ထုတ်ရန်' : 'Filter by Location'}
              >
                <MapPin className="w-3.5 h-3.5" />
                {selectedStateRegionFilter !== 'all' && (
                  <span className="text-[10px] font-black">
                    {selectedTownshipFilter !== 'all' ? selectedTownshipFilter : selectedStateRegionFilter.replace('တိုင်းဒေသကြီး', '').replace('ပြည်နယ်', '').trim()}
                  </span>
                )}
              </button>

              {/* Unknown Toggle */}
              <button
                type="button"
                onClick={() => setShowUnknown(!showUnknown)}
                className={`w-8 h-8 flex items-center justify-center rounded-xl border transition-all cursor-pointer shrink-0 ${showUnknown ? 'bg-slate-800 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                title={lang === 'my' ? 'အမည်မသိ ဆိုင်များ ပြ/မပြ' : 'Toggle Unknown Shops'}
              >
                <span className="text-xs">
                  {showUnknown ? '👁️' : '🫣'}
                </span>
              </button>

              {/* Reset (icon only) */}
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl transition-colors cursor-pointer shrink-0"
                  title={lang === 'my' ? 'စစ်ထုတ်မှုအားလုံး ပယ်ဖျက်မည်' : 'Reset all filters'}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Row 2: Category Pills (flex-wrap, NO horizontal scroll) */}
            <div className="flex flex-wrap items-center gap-1.5">
              {PRESET_TAGS.map((tag) => {
                const isSelected = selectedTagFilter === tag.value;
                return (
                  <button
                    key={tag.value}
                    type="button"
                    onClick={() => setSelectedTagFilter(tag.value)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shrink-0 border cursor-pointer ${isSelected ? 'bg-slate-900 border-slate-900 text-white shadow-2xs' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                  >
                    {lang === 'my' ? tag.labelMy : tag.labelEn}
                  </button>
                );
              })}
            </div>

            {/* Row 3: Expandable Location Panel */}
            {isLocationFilterExpanded && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 animate-fade-in">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {/* State */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">
                      {lang === 'my' ? 'ပြည်နယ်/တိုင်း' : 'Region'}
                    </label>
                    <select
                      value={selectedStateRegionFilter}
                      onChange={(e) => {
                        setSelectedStateRegionFilter(e.target.value);
                        setSelectedTownshipFilter('all');
                        setSelectedCityFilter('all');
                        setSelectedWardFilter('all');
                      }}
                      className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-medium text-slate-800 outline-none cursor-pointer"
                    >
                      <option value="all">{lang === 'my' ? 'အားလုံး' : 'All'}</option>
                      {MYANMAR_REGIONS.map((r) => (
                        <option key={r.id} value={r.nameMy}>
                          {lang === 'my' ? r.nameMy : r.nameEn}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Township */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">
                      {lang === 'my' ? 'မြို့နယ်' : 'Township'}
                    </label>
                    <select
                      value={selectedTownshipFilter}
                      disabled={selectedStateRegionFilter === 'all'}
                      onChange={(e) => {
                        setSelectedTownshipFilter(e.target.value);
                        setSelectedCityFilter('all');
                        setSelectedWardFilter('all');
                      }}
                      className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-medium text-slate-800 outline-none disabled:opacity-50 cursor-pointer"
                    >
                      <option value="all">{lang === 'my' ? 'အားလုံး' : 'All'}</option>
                      {selectedRegionObj?.townships.map((t) => (
                        <option key={t.id} value={t.nameMy}>
                          {lang === 'my' ? t.nameMy : t.nameEn}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* City */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">
                      {lang === 'my' ? 'မြို့' : 'City'}
                    </label>
                    <select
                      value={selectedCityFilter}
                      disabled={selectedTownshipFilter === 'all'}
                      onChange={(e) => setSelectedCityFilter(e.target.value)}
                      className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-medium text-slate-800 outline-none disabled:opacity-50 cursor-pointer"
                    >
                      <option value="all">{lang === 'my' ? 'အားလုံး' : 'All'}</option>
                      {Array.from(
                        new Set(
                          activeShopsList
                            .filter((s) => s.stateRegion === selectedStateRegionFilter && s.township === selectedTownshipFilter && (s as any).city)
                            .map((s) => (s as any).city)
                        )
                      ).map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  {/* Ward */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">
                      {lang === 'my' ? 'ရပ်ကွက်' : 'Ward'}
                    </label>
                    <select
                      value={selectedWardFilter}
                      disabled={selectedTownshipFilter === 'all'}
                      onChange={(e) => setSelectedWardFilter(e.target.value)}
                      className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-medium text-slate-800 outline-none disabled:opacity-50 cursor-pointer"
                    >
                      <option value="all">{lang === 'my' ? 'အားလုံး' : 'All'}</option>
                      {Array.from(
                        new Set(
                          activeShopsList
                            .filter((s) => s.stateRegion === selectedStateRegionFilter && s.township === selectedTownshipFilter && (s as any).ward)
                            .map((s) => (s as any).ward)
                        )
                      ).map((w) => (
                        <option key={w} value={w}>{w}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Row 4: Count + Active Filter Chips */}
            <div className="flex items-center justify-between gap-2 text-[11px]">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-slate-800">
                  {lang === 'my' ? `တွေ့ရှိ ${filteredShops.length} ဆိုင်` : `${filteredShops.length} shops`}
                </span>
                {selectedStateRegionFilter !== 'all' && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-50 text-emerald-800 rounded text-[10px] font-bold border border-emerald-100">
                    📍 {selectedStateRegionFilter.replace('တိုင်းဒေသကြီး', '').replace('ပြည်နယ်', '').trim()}
                    <button type="button" onClick={() => { setSelectedStateRegionFilter('all'); setSelectedTownshipFilter('all'); setSelectedCityFilter('all'); setSelectedWardFilter('all'); }} className="hover:text-emerald-950 ml-0.5">✕</button>
                  </span>
                )}
                {selectedTownshipFilter !== 'all' && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-50 text-emerald-800 rounded text-[10px] font-bold border border-emerald-100">
                    🏘️ {selectedTownshipFilter}
                    <button type="button" onClick={() => { setSelectedTownshipFilter('all'); setSelectedCityFilter('all'); setSelectedWardFilter('all'); }} className="hover:text-emerald-950 ml-0.5">✕</button>
                  </span>
                )}
                {selectedTagFilter !== 'all' && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-slate-100 text-slate-800 rounded text-[10px] font-bold border border-slate-200">
                    🏷️ {PRESET_TAGS.find((t) => t.value === selectedTagFilter)?.labelMy || selectedTagFilter}
                    <button type="button" onClick={() => setSelectedTagFilter('all')} className="hover:text-black ml-0.5">✕</button>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* ----------------------------------------------------------------- */}
          {/* 4. SHOPS LIST / GRID DISPLAY (with sort + group)                  */}
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
          ) : sortMode === 'group-category' && sortedAndGrouped.groups ? (
            // GROUPED VIEW
            <div className="space-y-5">
              {sortedAndGrouped.groups.map((group) => (
                <div key={group.key} className="space-y-2.5">
                  {/* Group Header */}
                  <div className="flex items-center gap-2 px-1">
                    <div className="h-px flex-1 bg-slate-200" />
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-lg border border-slate-200/60">
                      <span className="text-[11px] font-black text-slate-700">
                        {group.label}
                      </span>
                      <span className="px-1.5 py-0.2 rounded-full bg-white text-[9px] font-bold text-slate-600 border border-slate-200">
                        {group.shops.length}
                      </span>
                    </div>
                    <div className="h-px flex-1 bg-slate-200" />
                  </div>

                  {/* Group Shops */}
                  {viewMode === 'compact' ? (
                    <div className="space-y-2.5">
                      {group.shops.map((shop) => (
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
                      {group.shops.map((shop) => (
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
                </div>
              ))}
            </div>
          ) : sortedAndGrouped.flat ? (
            // FLAT VIEW (sorted)
            viewMode === 'compact' ? (
              <div className="space-y-2.5">
                {sortedAndGrouped.flat.map((shop) => (
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
                {sortedAndGrouped.flat.map((shop) => (
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
            )
          ) : null}
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
