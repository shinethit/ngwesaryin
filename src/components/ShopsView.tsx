import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Store, MapPin, Search, Plus, X, Info, Globe, Lock, LayoutGrid, List, ChevronDown, ChevronUp, Filter, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { ShopContact, PublicShop } from '../types';
import { db, auth, handleFirestoreError, OperationType, safeSetDoc, safeDeleteDoc, safeUpdateDoc } from '../lib/firebase';
import {
  collection,
  onSnapshot,
  doc,
  query,
  updateDoc,
  increment,
} from 'firebase/firestore';
import { MYANMAR_REGIONS, PRESET_TAGS } from './shops/shopConstants';
import { ShopCard } from './shops/ShopCard';
import { ShopModal } from './shops/ShopModal';
import { ShopReportModal } from './shops/ShopReportModal';
import type { SubmitShopReportResult } from '../utils/shopReports';
import { useSearchSeed } from '../hooks/useSearchSeed';
import { resolveShopDetailReminder, normalizeShopName, dispatchShopDetailsSaved } from '../utils/shopDetailsReminders';
import { buildMyShopsList, findShopByName } from '../utils/myShops';
import {
  isDuplicateShopName,
  findCounterpartShop,
  moveShopWithDestinationCheck,
  buildPublicShopFields,
  buildPrivateShopFields,
  buildCounterpartUpdateFields,
} from '../utils/shopSave';
import {
  searchShopMenus,
  getMenuItemNameSuggestions,
  collectMenuItemNames,
  type ShopItemSearchResult,
} from '../utils/shopItemSearch';
import {
  applyShopMenuItems,
  buildUpdatedMenuItems,
  computeMenuDiff,
  type ShopMenuStore,
} from '../utils/shopMenuUpdate';

interface ShopsViewProps {
  shops: ShopContact[];
  lang: 'my' | 'en';
  plan?: string;
  onOpenUpgradeModal?: () => void;
  // [v7.5.60 S-81] Opens the sign-in modal so a guest tapping "Add Shop"
  // gets a sign-in button, not just a notice.
  onOpenSignIn?: () => void;
  onAddShop: (shop: Omit<ShopContact, 'id' | 'userId' | 'createdAt'>) => Promise<boolean>;
  onUpdateShop: (shop: ShopContact) => Promise<boolean>;
  onDeleteShop: (id: string) => Promise<boolean>;
}

export const ShopsView: React.FC<ShopsViewProps> = ({
  shops: privateShops,
  lang,
  plan = 'free',
  onOpenUpgradeModal,
  onOpenSignIn,
  onAddShop: onAddPrivateShop,
  onUpdateShop: onUpdatePrivateShop,
  onDeleteShop: onDeletePrivateShop,
}) => {
  // Directory Type: 'public' (collaborative community) or 'private' (private directory)
  const [directoryType, setDirectoryType] = useState<'public' | 'private'>('public');

  // Community Collaborative Shops List from Firestore
  const [publicShops, setPublicShops] = useState<PublicShop[]>([]);
  const [loadingPublic, setLoadingPublic] = useState(true);

  // [v7.5.85 FIX 1] "ကိုယ်ပိုင်" = MY shops — the Private tab shows the
  // user's private shops PLUS the public shops they added (a shop moved
  // private → public keeps its addedByUid, so it appears in both tabs).
  // Guests (no uid) see only their private list. The PUBLIC tab is
  // unchanged (all publicShops). Memoised on the two source lists and
  // the signed-in uid.
  const myShopsList = useMemo(
    () => buildMyShopsList(privateShops, publicShops, auth.currentUser?.uid),
    [privateShops, publicShops, auth.currentUser?.uid]
  );

  // [v7.5.89 B2] The modal's duplicate warning must see BOTH tabs: a
  // rename colliding with a same-named shop on the OTHER tab warns
  // too. Deduped by id — the user's own public shops appear in both
  // source lists.
  const allExistingShops = useMemo(() => {
    const seen = new Set<string>();
    const out: (ShopContact | PublicShop)[] = [];
    for (const s of [...publicShops, ...myShopsList]) {
      if (seen.has(s.id)) continue;
      seen.add(s.id);
      out.push(s);
    }
    return out;
  }, [publicShops, myShopsList]);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  // [v7.5.55 E15] A global-search "View all" tap seeds this search box.
  // [v7.5.87] The seed may also carry a mode — Price Compare taps
  // through with mode 'item' so the Shops ITEM search opens with that
  // item pre-filled. Only the two known modes are honoured; anything
  // else is ignored (the search box still gets the query).
  const handleSearchSeedMode = useCallback((m: string) => {
    if (m === 'item') setSearchMode('item');
    else if (m === 'shop') setSearchMode('shop');
  }, []);
  useSearchSeed('shops', setSearchQuery, handleSearchSeedMode);

  // [v7.5.86] Search mode — 'shop' (default, shop names: unchanged) or
  // 'item' (စျေးစုံစမ်းခြင်း: item names across every shop's menu).
  const [searchMode, setSearchMode] = useState<'shop' | 'item'>('shop');
  // Debounced item query — the search runs client-side over in-memory
  // menus (no fetch at all), but the debounce keeps typing smooth on
  // slow phones by not re-filtering ~1,000 shops' menus per keystroke.
  const [debouncedItemQuery, setDebouncedItemQuery] = useState('');
  useEffect(() => {
    if (searchMode !== 'item') return;
    const t = setTimeout(() => setDebouncedItemQuery(searchQuery), 150);
    return () => clearTimeout(t);
  }, [searchQuery, searchMode]);
  // [v7.5.86] How many item rows to show (Load-more appends 20, like shops).
  const [itemVisibleCount, setItemVisibleCount] = useState(20);

  // [v7.5.78 C] Deep-link from the transaction shop-details prompt and
  // the notification centre: open the shop form pre-filled with the name.
  // Plan-aware: Premium saves to the private list; Free / guest saves to
  // the public directory (private save is Premium-gated).
  // [v7.5.89 B1] Search MY shops first (own record → edit in place),
  // then the FULL public directory — a public shop added by someone
  // else, or one of the 874 imports, must open THAT record for editing
  // instead of minting a `__prefill_` duplicate with an empty menu
  // while the old doc keeps the menu. Only when NO record exists
  // anywhere is a prefill minted (so the sentinel still routes to
  // CREATE at save time). When a record IS found, the directory type
  // follows the RECORD (public → 'public', private → 'private'), not
  // the plan.
  useEffect(() => {
    const onOpenForm = (e: Event) => {
      const shopName = (e as CustomEvent<{ shopName?: string }>).detail?.shopName?.trim();
      if (!shopName) return;
      const existing =
        findShopByName(myShopsList, shopName) ?? findShopByName(publicShops, shopName);
      if (existing) {
        const isPublic = 'addedBy' in existing;
        setDirectoryType(isPublic ? 'public' : 'private');
        setEditingShop(existing);
        setIsEditingPublic(isPublic);
      } else {
        setDirectoryType(plan === 'premium' ? 'private' : 'public');
        setIsEditingPublic(false);
        setEditingShop({ id: `__prefill_${Date.now()}`, name: shopName, phone: '', userId: '', createdAt: Date.now() } as ShopContact);
      }
      setIsModalOpen(true);
    };
    window.addEventListener('ngwe:open-shop-form', onOpenForm);
    return () => window.removeEventListener('ngwe:open-shop-form', onOpenForm);
  }, [myShopsList, publicShops, plan]);
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

  // [v7.5.80] Render batching — entry renders ALL ~970 ShopCards at once,
  // which made the Shops tab slow/heavy on phones. Render the first batch
  // only; the "ပိုပြမည်" button below the list appends the next batch.
  // 20 = a phone-friendly first paint at 390px (a few cards visible at
  // once without scrolling, without a long first render).
  const SHOPS_BATCH_SIZE = 20;
  const [visibleCount, setVisibleCount] = useState(SHOPS_BATCH_SIZE);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingShop, setEditingShop] = useState<ShopContact | PublicShop | null>(null);
  const [isEditingPublic, setIsEditingPublic] = useState(false);

  // [v7.5.81] Report modal state — lives HERE, not in ShopCard, so the
  // modal survives list re-renders (same reason the details prompt is
  // hosted by App, not by TransactionModal).
  const [reportShop, setReportShop] = useState<ShopContact | PublicShop | null>(null);

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

  // [v7.5.60 E24/N-36] In-app notice / confirm dialogs — the browser's
  // native showNotice()/confirm() popups do not match the app design and show
  // English OK/Cancel buttons on phones.
  const [noticeMsg, setNoticeMsg] = useState<string | null>(null);
  const showNotice = (msg: string) => setNoticeMsg(msg);
  // [v7.5.60 S-81] Guest "Add Shop" prompt with a real sign-in button —
  // a toast alone never let the guest sign in from here.
  const [showGuestPrompt, setShowGuestPrompt] = useState(false);
  const [confirmState, setConfirmState] = useState<{ message: string; resolve: (v: boolean) => void } | null>(null);
  const askConfirm = (message: string) =>
    new Promise<boolean>((resolve) => setConfirmState({ message, resolve }));

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
  // [v7.5.55 C28] Atomic increment — the old read-then-write (count ± 1)
  // lost concurrent votes. NOTE: FieldValue.increment() cannot go through
  // safeUpdateDoc (its cleanForFirestore mangles the sentinel into a plain
  // object), so this uses updateDoc directly with try/catch instead.
  // [v7.5.55 C4] Only the shop's adder or an admin may vote (Firestore
  // rules allow update by owner-or-admin only) — the return is checked and
  // a failed vote never flips local state or claims success.
  const handleToggleVote = async (shop: PublicShop) => {
    const hasVoted = votedIds.includes(shop.id);
    const shopRef = doc(db, 'public_shops', shop.id);

    try {
      await updateDoc(shopRef, {
        helpfulCount: increment(hasVoted ? -1 : 1),
      });
      if (hasVoted) {
        setVotedIds((prev) => prev.filter((id) => id !== shop.id));
      } else {
        setVotedIds((prev) => [...prev, shop.id]);
      }
    } catch (err) {
      console.error('Failed to vote shop', err);
      showNotice(
        lang === 'my'
          ? 'မဲပေး၍ မရပါ — ဆိုင်ထည့်သူနှင့် admin သာ မဲပေးနိုင်ပါသည်'
          : 'Could not vote — only the shop adder and admins can vote'
      );
    }
  };

  // Open Add Modal
  const handleOpenAdd = () => {
    // [v7.5.55 C15] Stop guests at form open — show the sign-in prompt
    // immediately instead of letting them fill the whole form first.
    // [v7.5.60 S-81] The prompt has a sign-in button (via onOpenSignIn)
    // so the guest can actually sign in from here.
    if (!auth.currentUser) {
      setShowGuestPrompt(true);
      return;
    }
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
    // [v7.5.55 C15] Stop guests at form open.
    if (!auth.currentUser) {
      showNotice(
        lang === 'my'
          ? 'ဆိုင်အချက်အလက် ပြင်ဆင်ရန် ဦးစွာ အကောင့်ဝင်ရန် လိုအပ်ပါသည်'
          : 'Please sign in first to edit a shop'
      );
      return;
    }
    const isPublic = 'addedBy' in shop;
    // [v7.5.55 C4] Only the shop's adder and admins may edit a public
    // shop (Firestore rules enforce this too) — stop here, not at save.
    if (isPublic) {
      const isOwner = auth.currentUser.uid === (shop as PublicShop).addedByUid;
      const isAdmin = auth.currentUser.email === 'khunthanshwe@gmail.com';
      if (!isOwner && !isAdmin) {
        showNotice(
          lang === 'my'
            ? 'ဤဆိုင်ကို ထည့်သူနှင့် admin သာ ပြင်ဆင်နိုင်ပါသည်'
            : 'Only the shop adder and admins can edit this shop'
        );
        return;
      }
    }
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
    // [v7.5.85 FIX 1] Delete by the RECORD's own type, not the tab: the
    // Private tab now also shows the user's PUBLIC shops, and a public
    // copy's id is a public_shops doc id — deleting it via the private
    // handler would silently do nothing. (Falls back to the tab when
    // the id is not in the shown list, e.g. a stale card.)
    const shown = directoryType === 'public' ? publicShops : myShopsList;
    const target = shown.find((s) => s.id === id);
    const isPublicRecord = target ? 'addedBy' in target : directoryType === 'public';
    if (isPublicRecord) {
      const confirmMsg =
        lang === 'my'
          ? `"${name}" ကို ပြည်သူ့လမ်းညွှန်ထဲမှ ဖျက်ရန် သေချာပါသလား။`
          : `Are you sure you want to delete "${name}" from the Community Directory?`;
      if (!(await askConfirm(confirmMsg))) return;

      // [v7.5.55] Check the safe* return — a permission-denied delete
      // must not look like success.
      const ok = await safeDeleteDoc(doc(db, 'public_shops', id));
      if (!ok) {
        showNotice(
          lang === 'my'
            ? 'ဆိုင်ကို ဖျက်၍ မရပါ — ဆိုင်ထည့်သူနှင့် admin သာ ဖျက်နိုင်ပါသည်'
            : 'Could not delete this shop — only the shop adder and admins can delete it'
        );
      } else {
        // [v7.5.78 C] Deleted shop — drop any pending details reminder.
        resolveShopDetailReminder(name);
      }
    } else {
      const confirmMsg =
        lang === 'my'
          ? `"${name}" ဆိုင်လိပ်စာကို ကိုယ်ပိုင်လမ်းညွှန်ထဲမှ ဖျက်ရန် သေချာပါသလား။`
          : `Are you sure you want to delete "${name}" from your private list?`;
      if (await askConfirm(confirmMsg)) {
        // [v7.5.55 C5] Await the delete — the handler toasts on failure and
        // the shop stays in the list when the cloud write fails.
        const deleted = await onDeletePrivateShop(id);
        // [v7.5.78 C] Deleted shop — drop any pending details reminder.
        if (deleted) resolveShopDetailReminder(name);
      }
    }
  };

  // [v7.5.81] Report a public shop. The button stays visible to guests
  // (ShopCard gating) and tapping it shows the sign-in notice here —
  // the modal never opens for a guest. Signed-in users get the modal.
  const handleReportShop = (shop: ShopContact | PublicShop) => {
    if (!auth.currentUser) {
      showNotice(
        lang === 'my'
          ? 'အကောင့်ဝင်ပြီးမှ Report တင်နိုင်ပါမည်'
          : 'Please sign in to report'
      );
      return;
    }
    setReportShop(shop);
  };

  // [v7.5.81] Report result — the modal closes in every case and the
  // notice tells the truth: success only on a confirmed write, a
  // distinct message for an already-pending report, an error otherwise.
  const handleReportDone = (result: SubmitShopReportResult) => {
    setReportShop(null);
    if (result === 'submitted') {
      showNotice(
        lang === 'my'
          ? 'Report တင်ပြီးပါပြီ — စစ်ဆေးပေးပါမယ်'
          : 'Report submitted — it will be checked'
      );
    } else if (result === 'already_reported') {
      showNotice(
        lang === 'my'
          ? 'ဒီဆိုင်ကို Report တင်ပြီးသားပါ — စစ်ဆေးနေပါတယ်'
          : 'You already reported this shop — it is being checked'
      );
    } else {
      showNotice(
        lang === 'my'
          ? 'Report တင်၍ မရပါ — နောက်မှ ထပ်ကြိုးစားပေးပါ'
          : 'Could not submit the report — please try again later'
      );
    }
  };

  // Pricing Items (Live Wiki Prices)
  const handleAddPricingItem = async (
    shop: ShopContact | PublicShop,
    name: string,
    price: number,
    unit?: string
  ): Promise<boolean> => {
    const currentUser = auth.currentUser;
    const isPublic = 'addedBy' in shop;

    if (isPublic && !currentUser) {
      showNotice(
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

    // [v7.5.82] Match by name AND unit (shopMenuUpdate): the same item
    // at a different unit is a separate menu line, never an overwrite.
    // A re-entered identical name+unit+price changes nothing, so there
    // is nothing to write — report success without a pointless write.
    const currentItems = shop.items || [];
    const rows = computeMenuDiff(currentItems, [{ name, price, quantity: 1, unit }]);
    if (rows.length === 0) return true;
    const updatedItems = buildUpdatedMenuItems(currentItems, rows, contributorName);

    // [v7.5.82] The write goes through applyShopMenuItems with an
    // explicit store: public shops via Firestore, private shops via the
    // App's onUpdatePrivateShop prop (the util's default store cannot
    // reach it, so it must never be relied on for private shops).
    const store: ShopMenuStore = {
      updatePublicShopItems: async (shopId, items) =>
        safeUpdateDoc(doc(db, 'public_shops', shopId), { items }),
      updatePrivateShopItems: async (s, items) =>
        onUpdatePrivateShop({
          ...(s as ShopContact),
          items: items as ShopContact['items'],
        }),
    };
    const ok = await applyShopMenuItems(shop, isPublic, updatedItems, store);
    if (!ok && isPublic) {
      // [v7.5.55 C4] Check the safe* return — only the shop's adder/admin
      // may update (rules), so a denied write must show an error instead
      // of fake success.
      showNotice(
        lang === 'my'
          ? 'ဈေးနှုန်း ထည့်၍ မရပါ — ဆိုင်ထည့်သူနှင့် admin သာ ပြင်နိုင်ပါသည်'
          : 'Could not add the price — only the shop adder and admins can edit prices'
      );
      return false;
    }
    return ok;
  };

  const handleDeletePricingItem = async (
    shop: ShopContact | PublicShop,
    indexToDelete: number
  ): Promise<boolean> => {
    const confirmMsg =
      lang === 'my'
        ? 'ဤပစ္စည်းကို ဈေးနှုန်းစာရင်းမှ ဖျက်ပစ်ရန် သေချာပါသလား။'
        : 'Are you sure you want to delete this price entry?';
    if (!(await askConfirm(confirmMsg))) return false;

    const isPublic = 'addedBy' in shop;
    const currentItems = shop.items || [];
    const updatedItems = currentItems.filter((_, i) => i !== indexToDelete);

    if (isPublic) {
      if (!auth.currentUser) {
        showNotice(
          lang === 'my'
            ? 'အကောင့်ဝင်ပြီးမှသာ ပြည်သူ့ဈေးနှုန်းများ ဖျက်နိုင်ပါမည်'
            : 'Please log in to manage prices'
        );
        return false;
      }
      // [v7.5.55 C4] Check the safe* return — see handleAddPricingItem.
      const ok = await safeUpdateDoc(doc(db, 'public_shops', shop.id), {
        items: updatedItems,
      });
      if (!ok) {
        showNotice(
          lang === 'my'
            ? 'ပစ္စည်းကို ဖျက်၍ မရပါ — ဆိုင်ထည့်သူနှင့် admin သာ ပြင်နိုင်ပါသည်'
            : 'Could not delete the item — only the shop adder and admins can edit prices'
        );
        return false;
      }
      return true;
    } else {
      // [v7.5.55 C5] Await the private save — see handleAddPricingItem.
      return await onUpdatePrivateShop({
        ...(shop as ShopContact),
        items: updatedItems,
      });
    }
  };

  // [v7.5.89 B5] Clear the details reminder for the SAVED name, and
  // for the OLD name too when the shop was renamed — a reminder keyed
  // by the old name would otherwise never clear (rename orphan). The
  // private-update path goes through onUpdatePrivateShop, whose
  // handler resolves the old name itself; this helper covers the
  // public-side saves in this file.
  const clearDetailReminders = (savedName: string, previousName?: string) => {
    resolveShopDetailReminder(savedName);
    if (previousName && normalizeShopName(previousName) !== normalizeShopName(savedName)) {
      resolveShopDetailReminder(previousName);
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
    // [v7.5.55 C3] subCategory is collected by the modal — save it.
    subCategory: string;
    targetDirectory: 'public' | 'private' | 'both';
  }): Promise<boolean> => {
    const currentUser = auth.currentUser;
    // [v7.5.90 F2] Name the form was OPENED with — captured once, before
    // any save branch runs. A stashed menu candidate still carries this
    // name; when the form saves under a DIFFERENT name, App must move
    // the stash to the saved name or the menu update never happens.
    const formOldName = editingShop?.name;
    // [v7.5.90 F2] Tell App a details-fill save landed. Called ONLY on
    // the `return true` paths below — never on a failed save (the modal
    // stays open) and never with the OLD record's id on a move (the new
    // copy has a different id, or none visible here — see each site).
    const notifyDetailsSaved = (shopId: string | undefined, isPublic: boolean) => {
      dispatchShopDetailsSaved({ oldName: formOldName, savedName: data.name, shopId, isPublic });
    };

    // [v7.5.89 B3] Save to BOTH places — a COPY, never a move: two
    // docs, one per collection, with DIFFERENT ids and the same
    // content. Later edits of one copy diverge by default (the form
    // says so under the Both card); no silent cross-copy sync.
    if (data.targetDirectory === 'both') {
      // Both requires sign-in (like Public) and Premium (like Private).
      if (!currentUser) {
        showNotice(
          lang === 'my'
            ? 'နှစ်နေရာလုံးမှာ သိမ်းဆည်းရန် ဦးစွာ အကောင့်ဝင်ရန် လိုအပ်ပါသည်'
            : 'Please sign in first to save in both places'
        );
        return false;
      }
      if (plan !== 'premium') {
        showNotice(
          lang === 'my'
            ? 'နှစ်နေရာလုံးမှာ သိမ်းဆည်းရန် Premium အသုံးပြုသူ ဖြစ်ရန် လိုအပ်ပါသည်'
            : 'Premium plan required to save in both places'
        );
        if (onOpenUpgradeModal) onOpenUpgradeModal();
        return false;
      }
      const isEdit = !!editingShop && !editingShop.id.startsWith('__prefill_');
      const oldName = isEdit ? editingShop!.name : undefined;
      const addedBy = currentUser.email || currentUser.displayName || 'အသုံးပြုသူ';

      if (!isEdit) {
        // CREATE + both: hard-block when the name exists in EITHER
        // list, before writing anything.
        if (isDuplicateShopName(data.name, [publicShops, privateShops])) {
          showNotice(
            lang === 'my'
              ? `သတိပေးချက်: "${data.name}" အမည်တူ ဆိုင် ရှိနေပါပြီ — အမည်တူ ဆိုင်အသစ် ထပ်ထည့်၍ မရပါ`
              : `A shop named "${data.name}" already exists — a duplicate cannot be added`
          );
          return false;
        }
        // A new shop has no menu yet — items: [] on BOTH copies.
        const pubId = `pub_shop_${Date.now()}`;
        const okPub = await safeSetDoc(
          doc(db, 'public_shops', pubId),
          buildPublicShopFields(data, addedBy, currentUser.uid, pubId, [])
        );
        if (!okPub) {
          showNotice(
            lang === 'my'
              ? 'ဆိုင်ကို သိမ်း၍ မရပါ — အင်တာနက်/ခွင့်ပြုချက် စစ်ပေးပါ'
              : 'Could not save the shop — please check your connection and permissions'
          );
          return false;
        }
        const okPriv = await onAddPrivateShop(buildPrivateShopFields(data, []));
        if (!okPriv) {
          // The public copy already landed — roll it back so a retry
          // does not leave a half-saved pair (the hard block above
          // would then refuse the retry as a "duplicate").
          await safeDeleteDoc(doc(db, 'public_shops', pubId));
          return false;
        }
        clearDetailReminders(data.name, oldName);
        // [v7.5.90 F2] Public copy's id is known; the private copy's
        // id is minted inside onAddPrivateShop, so the public id is
        // the one the stash retry resolves by (public-first, as usual).
        notifyDetailsSaved(pubId, true);
        return true;
      }

      // EDIT + both: update the record being edited, and the same-name
      // record on the other side — updating its non-menu fields and
      // keeping ITS own items, or creating it as a copy INCLUDING the
      // edited record's menu when no counterpart exists.
      const editedItems = (editingShop as ShopContact | PublicShop).items || [];
      if (isEditingPublic) {
        const okPub = await safeUpdateDoc(
          doc(db, 'public_shops', editingShop!.id),
          buildCounterpartUpdateFields(data)
        );
        if (!okPub) {
          showNotice(
            lang === 'my'
              ? 'ဆိုင်ကို သိမ်း၍ မရပါ — ဆိုင်ထည့်သူနှင့် admin သာ ပြင်နိုင်ပါသည် (သို့မဟုတ် အင်တာနက် စစ်ပေးပါ)'
              : 'Could not save the shop — only the shop adder and admins can edit it (or check your connection)'
          );
          return false;
        }
        const counterpart = findCounterpartShop(oldName!, data.name, privateShops);
        if (counterpart) {
          // Spread over the counterpart record: its own items survive.
          const okPriv = await onUpdatePrivateShop({
            ...(counterpart as ShopContact),
            ...buildCounterpartUpdateFields(data),
          });
          if (!okPriv) return false;
        } else {
          const okPriv = await onAddPrivateShop(buildPrivateShopFields(data, editedItems));
          if (!okPriv) return false;
        }
      } else {
        // Spread over the edited record: its own items survive.
        const okPriv = await onUpdatePrivateShop({
          ...(editingShop as ShopContact),
          ...buildCounterpartUpdateFields(data),
        });
        if (!okPriv) return false;
        const counterpart = findCounterpartShop(oldName!, data.name, publicShops);
        if (counterpart) {
          const okPub = await safeUpdateDoc(
            doc(db, 'public_shops', counterpart.id),
            buildCounterpartUpdateFields(data)
          );
          if (!okPub) {
            showNotice(
              lang === 'my'
                ? 'ဆိုင်ကို သိမ်း၍ မရပါ — ဆိုင်ထည့်သူနှင့် admin သာ ပြင်နိုင်ပါသည် (သို့မဟုတ် အင်တာနက် စစ်ပေးပါ)'
                : 'Could not save the shop — only the shop adder and admins can edit it (or check your connection)'
            );
            return false;
          }
        } else {
          const pubId = `pub_shop_${Date.now()}`;
          const okPub = await safeSetDoc(
            doc(db, 'public_shops', pubId),
            buildPublicShopFields(data, addedBy, currentUser.uid, pubId, editedItems)
          );
          if (!okPub) {
            showNotice(
              lang === 'my'
                ? 'ဆိုင်ကို သိမ်း၍ မရပါ — အင်တာနက်/ခွင့်ပြုချက် စစ်ပေးပါ'
                : 'Could not save the shop — please check your connection and permissions'
            );
            return false;
          }
        }
      }
      clearDetailReminders(data.name, oldName);
      // [v7.5.90 F2] The EDITED record's id and side — the counterpart
      // copy (if one was created / updated on the other side) keeps
      // its own id; the retry resolves the record the user edited.
      notifyDetailsSaved(editingShop.id, isEditingPublic);
      return true;
    }

    if (data.targetDirectory === 'public') {
      if (!currentUser) {
        showNotice(
          lang === 'my'
            ? 'ပြည်သူ့ဆိုင်လမ်းညွှန်တွင် အချက်အလက်များ မျှဝေရန်အတွက် ဦးစွာ အကောင့်ဝင်ရန် လိုအပ်ပါသည်'
            : 'Please log in to contribute to the Community Directory'
        );
        return false;
      }

      // [v7.5.55 C27] Moving a PRIVATE shop to Public: create the public
      // copy first (checked); only then remove the private original.
      // [v7.5.78 C] A `__prefill_` sentinel is not a real private shop —
      // it must fall through to the create path, not the move path (the
      // move would try to delete a shop that never existed).
      if (editingShop && !isEditingPublic && !editingShop.id.startsWith('__prefill_')) {
        // [v7.5.90 F1] MOVE hard block: a same folded name already in
        // the DESTINATION list (public directory) refuses the move —
        // the same wording as the v7.5.89 create hard block. The
        // check is destination-side only; the private original being
        // moved never blocks itself. Blocked = nothing created,
        // nothing deleted, modal stays open.
        // [v7.5.90 F2] The new public id is minted inside the create
        // callback below, so it is captured here for the success path
        // (the stash retry resolves the NEW copy by this id).
        let movedPublicId: string | undefined;
        const moved = await moveShopWithDestinationCheck(
          data.name,
          publicShops,
          () => {
            const id = `pub_shop_${Date.now()}`;
            movedPublicId = id;
            return safeSetDoc(doc(db, 'public_shops', id), {
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
              subCategory: data.subCategory,
              addedBy: currentUser.email || currentUser.displayName || 'အသုံးပြုသူ',
              addedByUid: currentUser.uid,
              createdAt: Date.now(),
              helpfulCount: 0,
              kpayNumber: data.kpayNumber,
              generalNotes: data.generalNotes,
              items: (editingShop as ShopContact).items || [],
            });
          },
          () => onDeletePrivateShop(editingShop.id)
        );
        if (moved.blocked) {
          showNotice(
            lang === 'my'
              ? `သတိပေးချက်: "${data.name}" အမည်တူ ဆိုင် ရှိနေပါပြီ — အမည်တူ ဆိုင်အသစ် ထပ်ထည့်၍ မရပါ`
              : `A shop named "${data.name}" already exists — a duplicate cannot be added`
          );
          return false;
        }
        if (!moved.moved) {
          showNotice(
            lang === 'my'
              ? 'ပြည်သူ့လမ်းညွှန်သို့ ရွှေ့၍ မရပါ — အင်တာနက်/ခွင့်ပြုချက် စစ်ပေးပါ'
              : 'Could not move the shop to the public directory — please check your connection and permissions'
          );
          return false;
        }
        // [v7.5.55 C5] The public copy is safely created at this point, so
        // the move reports success even if removing the private original
        // fails — the handler toasts that failure and the user can remove
        // the private copy by hand. Returning false here would re-run the
        // create on retry and duplicate the public shop.
        // (The delete already ran inside the move helper above; its
        // result is ignored here exactly as before.)
        // [v7.5.78 C] Details filled via the public directory — clear
        // any pending reminder for this shop.
        // [v7.5.89 B5] Also clear the OLD name on a rename.
        clearDetailReminders(data.name, editingShop.name);
        // [v7.5.90 F2] The OLD private id must NOT be reported — the
        // new public copy has a different id (movedPublicId).
        notifyDetailsSaved(movedPublicId, true);
        return true;
      }

      // [v7.5.55 C5] Check the safe* returns — a rejected write must show
      // an error and keep the modal open (ShopModal closes only on true).
      // [v7.5.90 F2] The saved public id: the edited record's id, or
      // the id minted by the create branch below.
      let savedPublicId: string | undefined;
      if (editingShop && isEditingPublic) {
        savedPublicId = editingShop.id;
        const shopRef = doc(db, 'public_shops', editingShop.id);
        const ok = await safeUpdateDoc(shopRef, {
          name: data.name,
          phone: data.phones[0] || '',
          phones: data.phones,
          address: data.addresses[0] || '',
          addresses: data.addresses,
          note: data.note,
          subCategory: data.subCategory,
          stateRegion: data.stateRegion,
          township: data.township,
          city: data.city,
          ward: data.ward,
          kpayNumber: data.kpayNumber,
          generalNotes: data.generalNotes,
        });
        if (!ok) {
          showNotice(
            lang === 'my'
              ? 'ဆိုင်ကို သိမ်း၍ မရပါ — ဆိုင်ထည့်သူနှင့် admin သာ ပြင်နိုင်ပါသည် (သို့မဟုတ် အင်တာနက် စစ်ပေးပါ)'
              : 'Could not save the shop — only the shop adder and admins can edit it (or check your connection)'
          );
          return false;
        }
      } else {
        // [v7.5.89 B3] CREATE hard block: a same-name record in EITHER
        // list refuses the save — a warning is not enough. The modal
        // stays open so the user can pick a different name or edit the
        // existing shop instead.
        if (isDuplicateShopName(data.name, [publicShops, privateShops])) {
          showNotice(
            lang === 'my'
              ? `သတိပေးချက်: "${data.name}" အမည်တူ ဆိုင် ရှိနေပါပြီ — အမည်တူ ဆိုင်အသစ် ထပ်ထည့်၍ မရပါ`
              : `A shop named "${data.name}" already exists — a duplicate cannot be added`
          );
          return false;
        }
        const id = `pub_shop_${Date.now()}`;
        savedPublicId = id;
        const shopRef = doc(db, 'public_shops', id);
        const ok = await safeSetDoc(shopRef, {
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
          subCategory: data.subCategory,
          addedBy: currentUser.email || currentUser.displayName || 'အသုံးပြုသူ',
          addedByUid: currentUser.uid,
          createdAt: Date.now(),
          helpfulCount: 0,
          kpayNumber: data.kpayNumber,
          generalNotes: data.generalNotes,
          items: [],
        });
        if (!ok) {
          showNotice(
            lang === 'my'
              ? 'ဆိုင်ကို သိမ်း၍ မရပါ — အင်တာနက်/ခွင့်ပြုချက် စစ်ပေးပါ'
              : 'Could not save the shop — please check your connection and permissions'
          );
          return false;
        }
      }
      // [v7.5.78 C] Public save landed (create or update) — the shop now
      // has details, so clear any pending reminder for this name.
      // [v7.5.89 B5] Also clear the OLD name when the shop was renamed
      // (or when a prefill was saved under a new name).
      clearDetailReminders(data.name, editingShop?.name);
      // [v7.5.90 F2] savedPublicId is the edited id or the minted id.
      notifyDetailsSaved(savedPublicId, true);
      return true;
    } else {
      // Save Private Shop
      if (plan !== 'premium') {
        showNotice(
          lang === 'my'
            ? 'ကိုယ်ပိုင်ဆိုင်စာရင်း သုံးစွဲရန် Premium အသုံးပြုသူ ဖြစ်ရန် လိုအပ်ပါသည်'
            : 'Premium plan required for private lists'
        );
        if (onOpenUpgradeModal) onOpenUpgradeModal();
        return false;
      }

      // [v7.5.55 C27] Moving a PUBLIC shop to Private: create the
      // private copy FIRST (checked); only then remove the public
      // original.
      // [v7.5.89 B3] This used to delete first — if the private save
      // then failed, the menu was gone together with the public doc.
      // Create-then-delete (like private → public): a failed private
      // save leaves the public original untouched and the modal open
      // for retry. A failed delete after a landed private copy still
      // reports success — retrying the create would duplicate the
      // private copy — and the user is told to remove the leftover
      // public copy by hand.
      if (editingShop && isEditingPublic) {
        // [v7.5.90 F1] MOVE hard block: a same folded name already in
        // the DESTINATION list (private list) refuses the move — the
        // same wording as the v7.5.89 create hard block. The check is
        // destination-side only; the public original being moved never
        // blocks itself. Blocked = nothing created, nothing deleted,
        // modal stays open.
        const moved = await moveShopWithDestinationCheck(
          data.name,
          privateShops,
          () =>
            onAddPrivateShop(
              buildPrivateShopFields(data, (editingShop as PublicShop).items || [])
            ),
          () => safeDeleteDoc(doc(db, 'public_shops', editingShop.id))
        );
        if (moved.blocked) {
          showNotice(
            lang === 'my'
              ? `သတိပေးချက်: "${data.name}" အမည်တူ ဆိုင် ရှိနေပါပြီ — အမည်တူ ဆိုင်အသစ် ထပ်ထည့်၍ မရပါ`
              : `A shop named "${data.name}" already exists — a duplicate cannot be added`
          );
          return false;
        }
        if (!moved.moved) {
          showNotice(
            lang === 'my'
              ? 'ကိုယ်ပိုင်စာရင်းသို့ ရွှေ့၍ မရပါ — အင်တာနက်/ခွင့်ပြုချက် စစ်ပေးပါ'
              : 'Could not move the shop to your private list — please check your connection and permissions'
          );
          return false;
        }
        if (!moved.deleteOk) {
          showNotice(
            lang === 'my'
              ? 'ကိုယ်ပိုင်စာရင်းသို့ ရွှေ့ပြီးပါပြီ — ပြည်သူ့လမ်းညွှန်မှ မိတ္တူဟောင်းကို ဖျက်၍ မရပါ၊ ကိုယ်တိုင် ဖျက်ပေးပါ'
              : 'Moved to your private list — the old public copy could not be removed, please delete it by hand'
          );
        }
        // [v7.5.78 C] Details filled via the private list — clear any
        // pending reminder for this shop (and the old name on a rename).
        clearDetailReminders(data.name, editingShop.name);
        // [v7.5.90 F2] The new private id is minted inside
        // onAddPrivateShop (App) and not visible here — the stash is
        // still rewritten by NAME, which is what the rename fix needs.
        // The OLD public id must NOT be reported: that doc is deleted.
        notifyDetailsSaved(undefined, false);
        return true;
      }

      // [v7.5.55 C5, private half] The private-shop callbacks are async and
      // return false when the cloud write fails — return that result so the
      // modal stays open for retry instead of claiming success.
      // [v7.5.78 C] A `__prefill_` sentinel is a NEW shop, not an update —
      // it falls through to the ADD path below.
      if (editingShop && !isEditingPublic && !editingShop.id.startsWith('__prefill_')) {
        const ok = await onUpdatePrivateShop({
          ...(editingShop as ShopContact),
          name: data.name,
          phone: data.phones[0] || '',
          phones: data.phones,
          address: data.addresses[0] || '',
          addresses: data.addresses,
          note: data.note,
          subCategory: data.subCategory,
          stateRegion: data.stateRegion,
          township: data.township,
          city: data.city,
          ward: data.ward,
          kpayNumber: data.kpayNumber,
          generalNotes: data.generalNotes,
        });
        // [v7.5.90 F2] Only on success — a false return keeps the
        // modal open for retry, so no event fires.
        if (ok) notifyDetailsSaved(editingShop.id, false);
        return ok;
      }
      // [v7.5.89 B3] CREATE hard block (private side): a same-name
      // record in EITHER list refuses the save — a warning is not
      // enough. The modal stays open so the user can pick a different
      // name or edit the existing shop instead.
      if (isDuplicateShopName(data.name, [publicShops, privateShops])) {
        showNotice(
          lang === 'my'
            ? `သတိပေးချက်: "${data.name}" အမည်တူ ဆိုင် ရှိနေပါပြီ — အမည်တူ ဆိုင်အသစ် ထပ်ထည့်၍ မရပါ`
            : `A shop named "${data.name}" already exists — a duplicate cannot be added`
        );
        return false;
      }
      const ok = await onAddPrivateShop({
        name: data.name,
        phone: data.phones[0] || '',
        phones: data.phones,
        address: data.addresses[0] || '',
        addresses: data.addresses,
        note: data.note,
        subCategory: data.subCategory,
        stateRegion: data.stateRegion,
        township: data.township,
        city: data.city,
        ward: data.ward,
        kpayNumber: data.kpayNumber,
        generalNotes: data.generalNotes,
        items: [],
      });
      // [v7.5.90 F2] The new private id is minted inside
      // onAddPrivateShop (App) and not visible here — the stash is
      // still rewritten by NAME. Only on success.
      if (ok) notifyDetailsSaved(undefined, false);
      return ok;
    }
  };

  // Determine active list & Filter
  // [v7.5.85 FIX 1] Private tab = MY shops (private + my public);
  // Public tab unchanged.
  const activeShopsList = directoryType === 'public' ? publicShops : myShopsList;

  // [v7.5.86] Item search runs over the SAME list the tab already shows
  // (public menus on the Public tab, my shops on the Private tab) — the
  // menus are already in memory from the live onSnapshot, so there is no
  // extra fetch and no per-keystroke network call. Guests see public
  // menus (what they can already view) + their own local private shops;
  // another user's private shops are never in this list, so they can
  // never appear in results. Category/location/sort filters do NOT apply
  // here — the point is EVERY shop's price for the item, cheapest first.
  const itemResults = useMemo(
    () => (searchMode === 'item' ? searchShopMenus(activeShopsList, debouncedItemQuery) : []),
    [searchMode, activeShopsList, debouncedItemQuery]
  );
  const itemSuggestions = useMemo(
    () =>
      searchMode === 'item'
        ? getMenuItemNameSuggestions(activeShopsList, debouncedItemQuery, 8)
        : [],
    [searchMode, activeShopsList, debouncedItemQuery]
  );
  // All distinct menu item names in the WHOLE database — every public
  // menu plus the user's own private menus — passed to every ShopCard
  // so its add-price form can suggest names from the database. NOT
  // tab-scoped on purpose: the form adds an item to THIS shop, so a
  // name that exists in another shop's menu must appear while typing
  // (that is the user's 2026-11-15 correction — 'Panfor' typed in the
  // form showed nothing). The SEARCH box suggestions stay tab-scoped
  // (activeShopsList below) so a suggestion always leads to results.
  const allMenuItemNames = useMemo(
    () => collectMenuItemNames([...publicShops, ...myShopsList]),
    [publicShops, myShopsList]
  );
  useEffect(() => {
    setItemVisibleCount(20);
  }, [debouncedItemQuery, searchMode, directoryType]);

  // [v7.5.86] Tapping an item row OPENS that shop: back to shop mode
  // with the shop's name in the (shared) search box, so the list filters
  // to that one shop. Same list, same tab — no navigation needed.
  const handleOpenShopFromItem = (row: ShopItemSearchResult) => {
    setSearchMode('shop');
    setSearchQuery(row.shopName);
  };

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

  // [v7.5.55 C22] The "Unknown shops" toggle applies in ALL sort modes —
  // filter hidden Unknown shops once here so the header count and the
  // empty state always match the VISIBLE cards.
  const visibleShops = useMemo(
    () => filteredShops.filter((s) => showUnknown || !s.name.startsWith('Unknown ')),
    [filteredShops, showUnknown]
  );

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

    // If not grouping, return flat — [v7.5.55 C22] the Unknown toggle
    // applies here too, not only in the grouped branch.
    if (sortMode !== 'group-category') {
      return {
        flat: sorted.filter((s) => showUnknown || !s.name.startsWith('Unknown ')),
        groups: null,
      };
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

  // [v7.5.80] Batched display — the first `visibleCount` shops in display
  // order. Grouped: walk the groups in order, keep only groups that contain
  // a visible shop, with only the visible shops inside; a group header's
  // count is the count VISIBLE in that group (the full filtered total stays
  // in the "တွေ့ရှိ N ဆိုင်" header, from visibleShops.length). Flat: a
  // plain slice. Sort/filter results, group order and ShopCard are
  // unchanged — only how many render at once.
  const batchedGroups = useMemo(() => {
    if (!sortedAndGrouped.groups) return null;
    let remaining = visibleCount;
    const out: Array<{ key: string; label: string; shops: (ShopContact | PublicShop)[] }> = [];
    for (const group of sortedAndGrouped.groups) {
      if (remaining <= 0) break;
      const shops = group.shops.slice(0, remaining);
      remaining -= shops.length;
      out.push({ key: group.key, label: group.label, shops });
    }
    return out;
  }, [sortedAndGrouped, visibleCount]);

  const batchedFlat = useMemo(
    () => (sortedAndGrouped.flat ? sortedAndGrouped.flat.slice(0, visibleCount) : null),
    [sortedAndGrouped, visibleCount]
  );

  // [v7.5.80] Any filter change restarts the list at batch 1. One effect
  // covers every path: search (incl. the global-search seed), category,
  // sort, all four location filters, the Unknown toggle, the Public/Private
  // tab switch (directoryType), and the reset button (it clears the filter
  // states listed here).
  useEffect(() => {
    setVisibleCount(SHOPS_BATCH_SIZE);
  }, [searchQuery, selectedTagFilter, sortMode, selectedStateRegionFilter, selectedTownshipFilter, selectedCityFilter, selectedWardFilter, showUnknown, directoryType]);

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
            className="flex items-center gap-1.5 px-3.5 py-2.5 min-h-[44px] bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer shrink-0"
            title={!auth.currentUser ? (lang === 'my' ? 'အကောင့်ဝင်ပြီးမှ ဆိုင်ထည့်နိုင်ပါသည်' : 'Sign in to add a shop') : undefined}
          >
            {!auth.currentUser ? <Lock className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            <span>{lang === 'my' ? 'ဆိုင်အသစ်' : 'Add Shop'}</span>
            {!auth.currentUser && (
              <span className="text-[10px] font-bold opacity-80">{lang === 'my' ? '(Sign in မှ ထည့်နိုင်မည်)' : '(Sign in to add)'}</span>
            )}
          </button>
        </div>

        {/* Directory Switcher + View Mode — SAME ROW */}
        <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
          {/* Directory Tabs */}
          <div className="flex p-0.5 bg-slate-100 rounded-xl border border-slate-200/60 flex-1 min-w-0 max-w-xs">
            <button
              type="button"
              onClick={() => { setDirectoryType('public'); handleResetFilters(); }}
              className={`flex-1 flex items-center justify-center gap-1.5 min-h-[44px] py-2 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${directoryType === 'public' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'}`}
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
              className={`flex-1 flex items-center justify-center gap-1.5 min-h-[44px] py-2 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${directoryType === 'private' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'}`}
            >
              <Lock className="w-3.5 h-3.5 text-amber-500" />
              <span>{lang === 'my' ? 'ကိုယ်ပိုင်' : 'Private'}</span>
              <span className="px-1 py-0.2 rounded-full bg-slate-100 text-[9px] text-slate-600 font-extrabold border border-slate-200/60">
                {myShopsList.length}
              </span>
            </button>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200/60 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`min-h-[44px] min-w-[44px] p-2.5 rounded-md transition-all cursor-pointer flex items-center justify-center ${viewMode === 'grid' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'}`}
              title={lang === 'my' ? 'ကတ်ပြကွက်' : 'Grid'}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('compact')}
              className={`min-h-[44px] min-w-[44px] p-2.5 rounded-md transition-all cursor-pointer flex items-center justify-center ${viewMode === 'compact' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'}`}
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
            className="px-6 py-2.5 min-h-[44px] bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-xs active:scale-95 transition-all cursor-pointer"
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
            {/* [v7.5.86] Search-mode toggle — shop names (default, unchanged)
                or item names across every shop's menu (စျေးစုံစမ်းခြင်း:
                everyone's prices in one place, cheapest first). */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSearchMode('shop')}
                className={`flex-1 min-h-[44px] px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${searchMode === 'shop' ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
              >
                {lang === 'my' ? '🏪 ဆိုင်နဲ့ ရှာ' : '🏪 By shop'}
              </button>
              <button
                type="button"
                onClick={() => { setSearchMode('item'); setDebouncedItemQuery(searchQuery); }}
                className={`flex-1 min-h-[44px] px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${searchMode === 'item' ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
              >
                {lang === 'my' ? '🛒 ပစ္စည်းနဲ့ ရှာ' : '🛒 By item'}
              </button>
            </div>
            {/* Row 1: Search + Location toggle + Reset + Count */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[160px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  // [v7.5.86] In item mode the box suggests item names
                  // from the shared menus (datalist below); in shop mode
                  // it is the unchanged shop-name search.
                  list={searchMode === 'item' ? 'db-shop-item-suggestions' : undefined}
                  autoComplete="off"
                  placeholder={
                    // [v7.5.81] Shop placeholders are short on purpose
                    // (the input's usable text area at 390px is only
                    // ~106px in shop mode). In item mode the row's other
                    // controls are hidden, so the input is full-width and
                    // the longer item placeholder fits.
                    searchMode === 'item'
                      ? (lang === 'my' ? 'ပစ္စည်းအမည် ရှာရန်...' : 'Search items...')
                      : lang === 'my'
                      ? 'ဆိုင်ရှာရန်...'
                      : 'Search...'
                  }
                  className="w-full pl-9 pr-8 py-2.5 min-h-[44px] bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl text-base font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400"
                />
                {searchMode === 'item' && (
                  <datalist id="db-shop-item-suggestions">
                    {itemSuggestions.map((name) => (
                      <option key={name} value={name} />
                    ))}
                  </datalist>
                )}
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 min-h-[36px] min-w-[36px] p-2 text-slate-400 hover:text-slate-700 rounded-md cursor-pointer flex items-center justify-center"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {searchMode === 'shop' && (<>
              {/* Sort Dropdown */}
              <div className="relative shrink-0">
                <select
                  value={sortMode}
                  onChange={(e) => setSortMode(e.target.value as any)}
                  className="appearance-none pl-2.5 pr-7 py-2.5 min-h-[44px] bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer max-w-[150px]"
                  title={lang === 'my' ? 'စီစဥ်ရန်' : 'Sort'}
                >
                  {/* [v7.5.80] Shortened: "📁 အုပ်စုခွဲ (အမျိုးအစား)" is 172px
                      wide but the select is 150px, so it truncated to
                      "အုပ်စု (...)". The short label fits with room to spare. */}
                  <option value="group-category">{lang === 'my' ? '📁 အုပ်စုခွဲ' : '📁 Grouped'}</option>
                  <option value="newest">{lang === 'my' ? '🆕 အသစ်ဆုံး' : '🆕 Newest'}</option>
                  <option value="name-asc">{lang === 'my' ? '🔤 အမည် A→Z' : '🔤 Name A→Z'}</option>
                  <option value="name-desc">{lang === 'my' ? '🔤 အမည် Z→A' : '🔤 Name Z→A'}</option>
                  <option value="helpful">{lang === 'my' ? '👍 မဲအများဆုံး' : '👍 Most Helpful'}</option>
                </select>
                <ChevronDown className="w-3 h-3 text-slate-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              </>)}

              {searchMode === 'shop' && (<>
              {/* Location Filter Icon Button */}
              <button
                type="button"
                onClick={() => setIsLocationFilterExpanded(!isLocationFilterExpanded)}
                className={`flex items-center gap-1 px-2.5 py-2.5 min-h-[44px] rounded-xl border text-xs font-bold transition-all cursor-pointer shrink-0 ${selectedStateRegionFilter !== 'all' || isLocationFilterExpanded ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                title={lang === 'my' ? 'မြို့နယ်အလိုက် စစ်ထုတ်ရန်' : 'Filter by Location'}
              >
                <MapPin className="w-3.5 h-3.5" />
                {selectedStateRegionFilter !== 'all' && (
                  <span className="text-[10px] font-black truncate max-w-[110px]">
                    {selectedTownshipFilter !== 'all' ? selectedTownshipFilter : selectedStateRegionFilter.replace('တိုင်းဒေသကြီး', '').replace('ပြည်နယ်', '').trim()}
                  </span>
                )}
              </button>
              </>)}

              {searchMode === 'shop' && (<>
              {/* Unknown Toggle */}
              <button
                type="button"
                onClick={() => setShowUnknown(!showUnknown)}
                className={`h-11 px-2.5 flex items-center justify-center gap-1 rounded-xl border text-xs font-bold transition-all cursor-pointer shrink-0 ${showUnknown ? 'bg-slate-800 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                title={lang === 'my' ? 'အမည်မသိ ဆိုင်များ ပြ/မပြ' : 'Toggle Unknown Shops'}
              >
                <span>{showUnknown ? '👁️' : '🫣'}</span>
                <span>{lang === 'my' ? 'အမည်မသိ' : 'Unknown'}</span>
              </button>
              </>)}

              {/* Reset (icon only) */}
              {searchMode === 'shop' && hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="min-h-[44px] min-w-[44px] p-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl transition-colors cursor-pointer shrink-0 flex items-center justify-center"
                  title={lang === 'my' ? 'စစ်ထုတ်မှုအားလုံး ပယ်ဖျက်မည်' : 'Reset all filters'}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Row 2: Category filter (dropdown) — [v7.5.80] the 17 pill
                buttons wrapped to ~7 rows at 390px and filled ~40% of the
                screen before the first shop card. A native <select> shows
                the selected category name, reaches every category in 2 taps
                (open + pick), and costs one 44px row. Same state
                (selectedTagFilter) and same filter logic — only the control
                changed; no category removed or renamed, no horizontal scroll.
                "အားလုံး" is the first option, and the ✕ chip in the count
                row below clears the category in 1 tap. */}
            <div className={searchMode === 'item' ? 'hidden' : 'flex items-center gap-2'}>
              {/* [v7.5.80] Icon-only prefix: the longest category label
                  ("အမည်မသိ / Import လုပ်ထားသော", 245px) must fit inside
                  the select with its padding — a text label ("အမျိုးအစား")
                  left only 259px for the select and the longest label
                  truncated. The select always shows the selected category
                  name, so it stays self-explanatory. */}
              <span aria-hidden="true" className="shrink-0 text-sm leading-none">🏷️</span>
              <div className="relative flex-1 min-w-0">
                <select
                  id="shop-category-filter"
                  data-testid="category-filter"
                  value={selectedTagFilter}
                  onChange={(e) => setSelectedTagFilter(e.target.value)}
                  className="w-full appearance-none pl-3 pr-8 py-2.5 min-h-[44px] bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer"
                  title={lang === 'my' ? 'ဆိုင်အမျိုးအစား ရွေးရန်' : 'Choose a shop category'}
                >
                  {PRESET_TAGS.map((tag) => (
                    <option key={tag.value} value={tag.value}>
                      {lang === 'my' ? tag.labelMy : tag.labelEn}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Row 3: Expandable Location Panel */}
            {searchMode === 'shop' && isLocationFilterExpanded && (
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
                      className="w-full px-2 py-2.5 min-h-[44px] bg-white border border-slate-200 rounded-lg text-[11px] font-medium text-slate-800 outline-none cursor-pointer"
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
                      className="w-full px-2 py-2.5 min-h-[44px] bg-white border border-slate-200 rounded-lg text-[11px] font-medium text-slate-800 outline-none disabled:opacity-50 cursor-pointer"
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
                      className="w-full px-2 py-2.5 min-h-[44px] bg-white border border-slate-200 rounded-lg text-[11px] font-medium text-slate-800 outline-none disabled:opacity-50 cursor-pointer"
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
                      className="w-full px-2 py-2.5 min-h-[44px] bg-white border border-slate-200 rounded-lg text-[11px] font-medium text-slate-800 outline-none disabled:opacity-50 cursor-pointer"
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
            <div className={searchMode === 'item' ? 'hidden' : 'flex items-center justify-between gap-2 text-[11px]'}>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-slate-800">
                  {loadingPublic && directoryType === 'public'
                    ? lang === 'my'
                      ? 'ဆိုင်များ ရှာဖွေနေပါသည်…'
                      : 'Loading shops…'
                    : lang === 'my'
                    ? `တွေ့ရှိ ${visibleShops.length} ဆိုင်`
                    : `${visibleShops.length} shops`}
                </span>
                {selectedStateRegionFilter !== 'all' && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-50 text-emerald-800 rounded text-[10px] font-bold border border-emerald-100">
                    📍 {selectedStateRegionFilter.replace('တိုင်းဒေသကြီး', '').replace('ပြည်နယ်', '').trim()}
                    <button type="button" onClick={() => { setSelectedStateRegionFilter('all'); setSelectedTownshipFilter('all'); setSelectedCityFilter('all'); setSelectedWardFilter('all'); }} className="hover:text-emerald-950 ml-0.5 min-h-[28px] min-w-[28px] p-1 flex items-center justify-center">✕</button>
                  </span>
                )}
                {selectedTownshipFilter !== 'all' && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-50 text-emerald-800 rounded text-[10px] font-bold border border-emerald-100">
                    🏘️ {selectedTownshipFilter}
                    <button type="button" onClick={() => { setSelectedTownshipFilter('all'); setSelectedCityFilter('all'); setSelectedWardFilter('all'); }} className="hover:text-emerald-950 ml-0.5 min-h-[28px] min-w-[28px] p-1 flex items-center justify-center">✕</button>
                  </span>
                )}
                {selectedTagFilter !== 'all' && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-slate-100 text-slate-800 rounded text-[10px] font-bold border border-slate-200">
                    🏷️ {PRESET_TAGS.find((t) => t.value === selectedTagFilter)?.labelMy || selectedTagFilter}
                    <button type="button" onClick={() => setSelectedTagFilter('all')} className="hover:text-black ml-0.5 min-h-[28px] min-w-[28px] p-1 flex items-center justify-center">✕</button>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* ----------------------------------------------------------------- */}
          {/* 4. SHOPS LIST / GRID DISPLAY (with sort + group)                  */}
          {/* ----------------------------------------------------------------- */}
          {/* [v7.5.55 C30] While the first onSnapshot has not returned, show
              a loading state — never the empty-state card when shops exist. */}
          {searchMode === 'item' ? (
            // [v7.5.86] ITEM RESULTS — every shop's price for the item,
            // cheapest first. Tap a row to open that shop. The shop list
            // (with its category/location/sort filters) is replaced here;
            // switching back to shop mode restores it unchanged.
            <div className="space-y-2.5">
              <p className="text-[11px] font-bold text-slate-800 px-1">
                {loadingPublic && directoryType === 'public'
                  ? lang === 'my'
                    ? 'ဆိုင်များ ရှာဖွေနေပါသည်…'
                    : 'Loading shops…'
                  : !debouncedItemQuery.trim()
                  ? lang === 'my'
                    ? 'ပစ္စည်းအမည် ရိုက်ပြီး ရှာပါ — ဆိုင်တိုင်းရဲ့ ဈေးတွေ ယှဉ်ပြပေးမယ်။'
                    : 'Type an item name — prices from every shop, cheapest first.'
                  : lang === 'my'
                  ? `တွေ့ရှိ ${itemResults.length} ခု`
                  : `${itemResults.length} results`}
              </p>
              {loadingPublic && directoryType === 'public' ? (
                <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto animate-pulse">
                    <Store className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-slate-800 text-sm">
                    {lang === 'my' ? 'ဆိုင်များ ရှာဖွေနေပါသည်…' : 'Loading shops…'}
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    {lang === 'my'
                      ? 'ပြည်သူ့လမ်းညွှန်မှ ဆိုင်စာရင်းများ ရယူနေပါသည်။ ခဏစောင့်ပေးပါ။'
                      : 'Fetching the community directory. Please wait a moment.'}
                  </p>
                </div>
              ) : !debouncedItemQuery.trim() ? (
                <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                    <Search className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-slate-800 text-sm">
                    {lang === 'my' ? 'ပစ္စည်းအမည်နဲ့ ရှာမယ်' : 'Search by item name'}
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    {lang === 'my'
                      ? 'ဆိုင်တိုင်းရဲ့ Menu ထဲက ပစ္စည်းဈေးတွေ ရှာပေးမယ် — စျေးအသက်သာဆုံးက အရင် ပြမယ်။ ဆိုင်ကို နှိပ်ရင် အဲဒီဆိုင်ကို ဖွင့်ပြမယ်။'
                      : 'Searches every shop’s menu — cheapest first. Tap a row to open that shop.'}
                  </p>
                </div>
              ) : itemResults.length === 0 ? (
                <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                    <Search className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-slate-800 text-sm">
                    {lang === 'my' ? 'ဒီပစ္စည်း ဘယ်ဆိုင်မှာမှ မရှိသေးပါ' : 'No shop has this item yet'}
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    {lang === 'my'
                      ? 'စာလုံးပေါင်း စစ်ကြည့်ပါ၊ သို့မဟုတ် ဆိုင်မှာ ဈေးနှုန်း ထည့်သွင်းပေးနိုင်ပါသည်။'
                      : 'Check the spelling, or add the price at a shop.'}
                  </p>
                </div>
              ) : (
                <>
                  {itemResults.slice(0, itemVisibleCount).map((row, i) => (
                    <button
                      key={`${row.shopId}|${row.itemName}|${row.unit}`}
                      type="button"
                      onClick={() => handleOpenShopFromItem(row)}
                      className="w-full min-h-[44px] p-3 bg-white hover:bg-emerald-50/60 border border-slate-200 rounded-xl flex items-center justify-between gap-2 text-left transition-colors cursor-pointer"
                    >
                      <span className="min-w-0">
                        <span className="block font-bold text-slate-900 text-sm truncate">
                          {row.itemName}
                          {row.unit ? <span className="font-medium text-slate-500"> ({row.unit})</span> : null}
                        </span>
                        <span className="block text-[11px] text-slate-500 truncate">
                          {row.shopName}
                          {row.isPublic ? '' : lang === 'my' ? ' • ကိုယ်ပိုင်' : ' • Private'}
                        </span>
                      </span>
                      <span className="shrink-0 flex flex-col items-end gap-0.5">
                        <span className="font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100 text-xs">
                          {row.price.toLocaleString()} Ks
                        </span>
                        {i === 0 && (
                          <span className="text-[10px] font-bold text-emerald-700">
                            {lang === 'my' ? '💰 အသက်သာဆုံး' : '💰 Cheapest'}
                          </span>
                        )}
                      </span>
                    </button>
                  ))}
                  {itemVisibleCount < itemResults.length ? (
                    <button
                      type="button"
                      onClick={() => setItemVisibleCount((c) => c + 20)}
                      className="w-full min-h-[48px] py-3 px-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-xs active:scale-[0.99] transition-all cursor-pointer"
                    >
                      {lang === 'my' ? 'ပိုပြမည် (နောက် 20 ခု)' : 'Load more (next 20)'}
                    </button>
                  ) : itemResults.length > 20 ? (
                    <p className="text-center text-[11px] font-bold text-slate-500 py-2">
                      {lang === 'my' ? `✓ အားလုံး ပြပြီးပါပြီ — ${itemResults.length} ခု` : `✓ All shown — ${itemResults.length} results`}
                    </p>
                  ) : null}
                </>
              )}
            </div>
          ) : loadingPublic && directoryType === 'public' ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto animate-pulse">
                <Store className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-800 text-sm">
                {lang === 'my' ? 'ဆိုင်များ ရှာဖွေနေပါသည်…' : 'Loading shops…'}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {lang === 'my'
                  ? 'ပြည်သူ့လမ်းညွှန်မှ ဆိုင်စာရင်းများ ရယူနေပါသည်။ ခဏစောင့်ပေးပါ။'
                  : 'Fetching the community directory. Please wait a moment.'}
              </p>
            </div>
          ) : visibleShops.length === 0 ? (
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
                    className="px-4 py-2.5 min-h-[44px] bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    {lang === 'my' ? 'စစ်ထုတ်မှု အားလုံးရှင်းမည်' : 'Clear Filters'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleOpenAdd}
                  className="px-4 py-2.5 min-h-[44px] bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  {lang === 'my' ? '+ ဆိုင်အသစ် ထည့်သွင်းမည်' : '+ Add Shop'}
                </button>
              </div>
            </div>
          ) : sortMode === 'group-category' && sortedAndGrouped.groups ? (
            // GROUPED VIEW
            <div className="space-y-5">
              {(batchedGroups ?? []).map((group) => (
                <div key={group.key} className="space-y-2.5">
                  {/* Group Header */}
                  <div className="flex items-center gap-2 px-1">
                    <div className="h-px flex-1 bg-slate-200" />
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-lg border border-slate-200/60">
                      <span className="text-[11px] font-black text-slate-700 truncate min-w-0 max-w-[220px]">
                        {group.label}
                      </span>
                      <span className="px-1.5 py-0.2 rounded-full bg-white text-[9px] font-bold text-slate-600 border border-slate-200 shrink-0">
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
                          isPublic={'addedBy' in shop}
                          lang={lang}
                          menuItemNames={allMenuItemNames}
                          viewMode="compact"
                          hasVoted={votedIds.includes(shop.id)}
                          onToggleVote={handleToggleVote}
                          onOpenEdit={handleOpenEdit}
                          onDelete={handleDelete}
                          onAddPricingItem={handleAddPricingItem}
                          onDeletePricingItem={handleDeletePricingItem}
                          onReport={handleReportShop}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {group.shops.map((shop) => (
                        <ShopCard
                          key={shop.id}
                          shop={shop}
                          isPublic={'addedBy' in shop}
                          lang={lang}
                          menuItemNames={allMenuItemNames}
                          viewMode="grid"
                          hasVoted={votedIds.includes(shop.id)}
                          onToggleVote={handleToggleVote}
                          onOpenEdit={handleOpenEdit}
                          onDelete={handleDelete}
                          onAddPricingItem={handleAddPricingItem}
                          onDeletePricingItem={handleDeletePricingItem}
                          onReport={handleReportShop}
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
                {(batchedFlat ?? []).map((shop) => (
                  <ShopCard
                    key={shop.id}
                    shop={shop}
                    isPublic={'addedBy' in shop}
                    lang={lang}
                    menuItemNames={allMenuItemNames}
                    viewMode="compact"
                    hasVoted={votedIds.includes(shop.id)}
                    onToggleVote={handleToggleVote}
                    onOpenEdit={handleOpenEdit}
                    onDelete={handleDelete}
                    onAddPricingItem={handleAddPricingItem}
                    onDeletePricingItem={handleDeletePricingItem}
                    onReport={handleReportShop}
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(batchedFlat ?? []).map((shop) => (
                  <ShopCard
                    key={shop.id}
                    shop={shop}
                    isPublic={'addedBy' in shop}
                    lang={lang}
                    menuItemNames={allMenuItemNames}
                    viewMode="grid"
                    hasVoted={votedIds.includes(shop.id)}
                    onToggleVote={handleToggleVote}
                    onOpenEdit={handleOpenEdit}
                    onDelete={handleDelete}
                    onAddPricingItem={handleAddPricingItem}
                    onDeletePricingItem={handleDeletePricingItem}
                    onReport={handleReportShop}
                  />
                ))}
              </div>
            )
          ) : null}

          {/* [v7.5.80] "ပိုပြမည်" — appends the next batch of 20 below the
              list without moving the scroll position (nothing above the
              button changes). Hidden once every filtered shop is shown, and
              nothing renders when the list fits in one batch or is empty
              (the empty state above handles that). The "တွေ့ရှိ N ဆိုင်"
              header above always shows the FULL filtered total. */}
          {searchMode === 'shop' && visibleShops.length > SHOPS_BATCH_SIZE && (
            <div className="pt-1">
              {visibleCount < visibleShops.length ? (
                <button
                  type="button"
                  onClick={() => setVisibleCount((c) => c + SHOPS_BATCH_SIZE)}
                  className="w-full min-h-[48px] py-3 px-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-xs active:scale-[0.99] transition-all cursor-pointer"
                >
                  {lang === 'my'
                    ? `ပိုပြမည် (နောက် ${SHOPS_BATCH_SIZE} ဆိုင်)`
                    : `Load more (next ${SHOPS_BATCH_SIZE})`}
                </button>
              ) : (
                <p className="text-center text-[11px] font-bold text-slate-500 py-2">
                  {lang === 'my'
                    ? `✓ အားလုံး ပြပြီးပါပြီ — ${visibleShops.length} ဆိုင်`
                    : `✓ All shown — ${visibleShops.length} shops`}
                </p>
              )}
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
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100 shrink-0">
              <Info className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <span className="text-xs font-bold text-slate-800">
                {lang === 'my'
                  ? 'ပြည်သူ့လမ်းညွှန်၏ မူဝါဒနှင့် လမ်းညွှန်ချက်များ (Usage Policy & Guidelines)'
                  : 'Community Directory Policy & Guidelines'}
              </span>
              <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                {lang === 'my'
                  ? 'လုံခြုံစိတ်ချစွာ အတူတကွ အသုံးပြုနိုင်ရန် စည်းကမ်းချက်များနှင့် တာဝန်ယူမှု ရှင်းလင်းချက်'
                  : 'Read community rules and disclaimers'}
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-indigo-600 flex items-center gap-1 shrink-0">
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
        existingShops={allExistingShops}
      />

      {/* [v7.5.81] Report modal — hosted here in ShopsView, not in ShopCard. */}
      <ShopReportModal
        isOpen={reportShop !== null}
        shop={reportShop}
        lang={lang}
        onClose={() => setReportShop(null)}
        onDone={handleReportDone}
      />

      {/* [v7.5.60 E24/N-36] In-app notice dialog (replaces alert()) */}
      {noticeMsg && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs" onClick={() => setNoticeMsg(null)}>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-sm p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm text-slate-800 leading-relaxed">{noticeMsg}</p>
            <div className="flex justify-end">
              <button type="button" onClick={() => setNoticeMsg(null)} className="px-4 py-2.5 min-h-[44px] bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl cursor-pointer">
                {lang === 'my' ? 'နားလည်ပါပြီ' : 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* [v7.5.60 S-81] Guest "Add Shop" prompt — message + sign-in button. */}
      {showGuestPrompt && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs" onClick={() => setShowGuestPrompt(false)}>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-sm p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <span className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200 text-xl shrink-0">🔒</span>
              <p className="text-sm text-slate-800 leading-relaxed font-bold">
                {lang === 'my' ? 'အကောင့် ဝင်ပြီးမှ ဆိုင်ထည့်နိုင်ပါတယ်' : 'Sign in to add a shop'}
              </p>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              {lang === 'my'
                ? 'ဆိုင်အချက်အလက် ထည့်သွင်းရန် Google Account ဖြင့် အခမဲ့ Sign in ပြုလုပ်ပါ။'
                : 'Please sign in with Google for free to add a shop.'}
            </p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowGuestPrompt(false)} className="px-4 py-2.5 min-h-[44px] bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer">
                {lang === 'my' ? 'ပိတ်မည်' : 'Close'}
              </button>
              <button
                type="button"
                onClick={() => { setShowGuestPrompt(false); if (onOpenSignIn) onOpenSignIn(); }}
                className="px-4 py-2.5 min-h-[44px] bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                {lang === 'my' ? 'အကောင့် ဝင်မည်' : 'Sign In'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* [v7.5.60 E24/N-36] In-app confirm dialog (replaces window.confirm()) */}
      {confirmState && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-sm p-5 space-y-4">
            <p className="text-sm text-slate-800 leading-relaxed">{confirmState.message}</p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { confirmState.resolve(false); setConfirmState(null); }}
                className="px-4 py-2.5 min-h-[44px] bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                {lang === 'my' ? 'မလုပ်ပါ' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => { confirmState.resolve(true); setConfirmState(null); }}
                className="px-4 py-2.5 min-h-[44px] bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                {lang === 'my' ? 'ဖျက်မည်' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default ShopsView;
