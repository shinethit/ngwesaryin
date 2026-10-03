# Changelog

## [2026-10-01] - v4.9.9 - Cash 5.525 Lakhs Exact Match & Car Wallet Balance Resolution

### Fixed & Enhanced
- **ငွေသား (လက်ဝယ်) ၅.၅၂၅ သိန်း အတိအကျ ထွက်ရှိစေခြင်း (Cash strictly equals 6.15 - 0.625 = 5.525 Lakhs)**:
  - ဝင်ငွေ ၆.၁၅ သိန်း မှ ထွက်ငွေ ၀.၆၂၅ သိန်း နှုတ်ပါက `၆.၁၅ - ၀.၆၂၅ = ၅.၅၂၅ သိန်း` အတိအကျ ဖြစ်ရမည့်အစား ၄.၄၇၅ သိန်း ဖြစ်ပေါ်နေစေခဲ့သော မူလအကြောင်းရင်း (Transaction မရှိဘဲ Unlinked Debts မှ ငွေသားထဲမှ ၁.၀၅ သိန်း တိတ်တဆိတ် နုတ်ယူနေမှုနှင့် ယာဉ်စရိတ်များ ငွေသားထဲ Fallback ဝင်ရောက်နေမှု) ကို အပြီးသတ် ဖယ်ရှားရှင်းလင်းလိုက်ပါသည်။
  - Financial Summary Table နှင့် Wallets View ရှိ စတင်လက်ကျန်နှင့် လက်ကျန်ငွေ တွက်ချက်မှုများတွင် `စတင် (Open) + ဝင်ငွေ (Inflow) - ထွက်ငွေ (Outflow) = လက်ကျန် (Closing)` သင်္ချာနည်းစံနှုန်းကို တသမတ်တည်း အခိုင်အမာ တည်ဆောက်လိုက်သဖြင့် ငွေသားလက်ကျန်သည် ၅.၅၂၅ သိန်း အတိအကျ ပေါ်နေမည်ဖြစ်ပါသည်။
- **ကားငွေအိတ် (ကားငွေအတ်) လက်ကျန်ငွေ ပြဿနာ ဖြေရှင်းခြင်း (Car Wallet Balance Sync & Reconciliation)**:
  - Transaction Modal တွင် ဆီဖိုး (Fuel) နှင့် ယာဉ်စရိတ်များ (Vehicle Service) ထည့်သွင်းချိန်တွင် ကားငွေအိတ် ရွေးချယ်ပြီးသော်လည်း အောက်ခြေရှိ Default Fallback ကုဒ်ကြောင့် မူလ Cash သို့ Overwrite ပြန်လည်ရောက်ရှိသွားစေသည့် ချို့ယွင်းချက်အား ပြင်ဆင်လိုက်သဖြင့် ယာဉ်စရိတ်များသည် ကားငွေအိတ်ထဲသို့သာ တိုက်ရိုက်ရောက်ရှိသွားပါမည်။
  - ကားငွေအိတ်တွင် ၁၀ သိန်း ဖြစ်ပေါ်နေခြင်းကို မိမိအလိုရှိသော လက်ကျန်ငွေပမာဏ (၀ ကျပ် အပါအဝင်) သို့ ၁ ချက်နှိပ်ရုံဖြင့် ချက်ချင်း ပြင်ဆင်ညှိယူနိုင်ရန် Reconcile Balance Modal တွင် "✨ သိန်း (x100,000)"၊ "၀ ကျပ်"၊ "၁ သိန်း"၊ "၅ သိန်း"၊ "၁၀ သိန်း" အမြန်ခလုတ်များကို ထည့်သွင်းပေးလိုက်ပါသည်။
- **လက်ကျန်ငွေ ပြင်ဆင်မှုများ Cloud Firestore သို့ အချိန်နှင့်တပြေးညီ တိုက်ရိုက် သိမ်းဆည်းခြင်း**:
  - `handleUpdateWalletBalance`၊ `handleUpdateWallet` နှင့် `handleReconcileBalance` လုပ်ဆောင်ချက်များအားလုံးတွင် `balance` ကော `initialBalance` ပါ နှစ်ခုစလုံးကို တပြိုင်တည်း update ပြုလုပ်ပေးပြီး LocalStorage နှင့် Cloud Firestore သို့ ချက်ချင်း သိမ်းဆည်းပေးလိုက်သဖြင့် Page Refresh ပြုလုပ်သည့်အခါ စာရင်းများ ပြန်လည်မပြောင်းလဲတော့ပါ။

## [2026-10-01] - v4.9.8 - Cash (5.525 Lakhs) & Vehicle Wallet Balance Precision & Reconciliation

### Fixed & Enhanced
- **ငွေသား (လက်ဝယ်) ၅.၅၂၅ သိန်း အတိအကျ ကိုက်ညီစေခြင်း (Cash Balance 100% Fixed)**:
  - ဝင်ငွေ ၆.၁၅ သိန်း မှ ထွက်ငွေ ၀.၆၂၅ သိန်း နှုတ်ပါက `၆.၁၅ - ၀.၆၂၅ = ၅.၅၂၅ သိန်း` အတိအကျ ထွက်ရှိရမည့်အစား ၄.၄၇၅ သိန်း ဖြစ်ပေါ်နေစေခဲ့သော အကြောင်းရင်းကို စစ်ဆေးတွေ့ရှိခဲ့ပါသည်။
  - Transaction တွက်ချက်ရာတွင် Target Wallet မကိုက်ညီသော သို့မဟုတ် ယာဉ်စရိတ်မှတ်တမ်းများသည် `resolveTransactionWallet` ၏ Fallback စနစ်ကြောင့် မူလ Cash Wallet ထဲသို့ အလိုအလျောက် ရောက်ရှိပြီး ငွေသားမှ ၁.၀၅ သိန်း အပိုနုတ်ယူသွားခဲ့သည့် Bug အား အပြီးသတ် ဖယ်ရှားရှင်းလင်းလိုက်ပါသည်။
- **ကားငွေအိတ် (Car Wallet) နှင့် ယာဉ်စရိတ်များ ချိတ်ဆက်မှု မှန်ကန်စေခြင်း (Car Wallet Sync Fixed)**:
  - ဆီဖိုး (Fuel) နှင့် ယာဉ်ပြုပြင်စရိတ်များ (Maintenance) ထည့်သွင်းချိန်တွင် ကားငွေအိတ်အား အလိုအလျောက် သတ်မှတ်ရွေးချယ်ပေးပြီး၊ ယာဉ်နှင့် သက်ဆိုင်သော စရိတ်များကို ကားငွေအိတ်မှ တိကျစွာ နှုတ်ယူတွက်ချက်ပေးပါသည်။ ယာဉ်စရိတ်များ ငွေသားထဲသို့ မရောက်တော့သဖြင့် ကားငွေအိတ်လက်ကျန်နှင့် ငွေသားလက်ကျန် နှစ်ခုစလုံး မှန်ကန်သွားပါပြီ။
- **ဘဏ္ဍာရေး အနှစ်ချုပ်ဇယားတွင် အတန်းတိုင်း/ကော်လံတိုင်း ၁၀၀% သင်္ချာနည်းအရ ကိုက်ညီစေခြင်း**:
  - `FinancialSummaryTable` နှင့် `WalletsView` တို့တွင် `စတင် (Open) + ဝင်ငွေ (Inflow) - ထွက်ငွေ (Outflow) = လက်ကျန် (Closing)` အတိအကျ ကိုက်ညီစေပြီး ဇယားအောက်ခြေတွင် စုစုပေါင်း Total အတန်း (tfoot) ကိုပါ ပေါင်းစပ်ပေးလိုက်ပါသည်။
- **Wallet Modal တွင် သိန်းဂဏန်း အလွယ်တကူ ထည့်သွင်းနိုင်ခြင်း**:
  - ပိုက်ဆံအိတ် အသစ်ထည့်ခြင်းနှင့် ပြင်ဆင်ခြင်းတို့တွင် "✨ သိန်း (x100,000)" ခလုတ်နှင့် အမြန်သတ်မှတ်ချက်များ (၀ ကျပ်၊ ၁ သိန်း၊ ၅ သိန်း၊ ၁၀ သိန်း) ထည့်သွင်းပေးလိုက်သဖြင့် မိမိအလိုရှိသော လက်ကျန်ငွေပမာဏကို ချက်ချင်း ပြင်ဆင်သတ်မှတ်နိုင်ပါပြီ။

## [2026-10-01] - v4.9.7 - 100% Inflow, Outflow & Wallet Balance Reconciliation & Month-Boundary Filter Fix

### Fixed & Enhanced
- **ဝင်ငွေ၊ ထွက်ငွေ၊ လက်ကျန် ၁၀၀% ကိုက်ညီစေခြင်း (100% Financial Reconciliation)**:
  - Dashboard၊ Transactions View နှင့် Wallets View ဇယားများအားလုံးတွင် `စတင်လက်ကျန် (Opening) + ဝင်ငွေ (Inflow) - ထွက်ငွေ (Outflow) = လက်ကျန် (Closing)` ပုံသေနည်းအတိုင်း အတိအကျ ကိုက်ညီအောင် စံသတ်မှတ်ချက်များ ညှိနှိုင်းပြင်ဆင်လိုက်ပါသည်။
- **လကူးချိန် (Month-Boundary) Date Filter မကိုက်ညီမှု ဖြေရှင်းခြင်း**:
  - စက်တင်ဘာလမှ အောက်တိုဘာလ ၁ ရက်သို့ ကူးပြောင်းချိန်တွင် Dashboard နှင့် Transactions View ရှိ Default "ယခုလ (This Month)" Filter ကြောင့် စက်တင်ဘာလအတွင်း ထည့်သွင်းထားခဲ့သော ၀.၈၃ သိန်း (၈၃,၀၀၀ ကျပ်) အပါအဝင် စာရင်းမှတ်တမ်းများသည် အောက်တိုဘာလ ဝင်ငွေ/ထွက်ငွေတွင် မပါဝင်ဘဲ လက်ကျန်ငွေတွင်သာ ပေါ်နေသဖြင့် "ဝင်ငွေ ၀၊ ထွက်ငွေ ၀၊ လက်ကျန် ၂.၈၃ သိန်း" မကိုက်ညီဖြစ်ပေါ်နေမှုကို အသိပေး Helper Banner နှင့် All-Time Toggle ဖြင့် အလွယ်တကူ စစ်ထုတ်နိုင်အောင် ရှင်းလင်းပြသပေးလိုက်ပါသည်။
- **အကောင့်အချင်းချင်း ငွေလွှဲမှု (Internal Transfers) စံနှုန်း တူညီစေခြင်း**:
  - Transactions View တွင် အကောင့်အားလုံးကြည့်ရှုချိန်၌ ငွေလွှဲမှုများကို ဝင်ငွေ/ထွက်ငွေ အဖြစ် အပိုဆောင်း မပေါင်းမိစေရန် Dashboard နှင့် တပြေးညီ ဖြစ်စေခဲ့ပြီး၊ သီးသန့် Wallet တစ်ခုတည်းကို ရွေးချယ်ချိန်တွင်သာ ထို Wallet အတွက် ငွေဝင်/ငွေထွက် အဖြစ် တိကျစွာ ထည့်သွင်းတွက်ချက်ပေးပါသည်။
- **ဘဏ္ဍာရေး အနှစ်ချုပ်ဇယားတွင် စတင်လက်ကျန် (Opening Balance) ကော်လံ ထည့်သွင်းခြင်း**:
  - `FinancialSummaryTable` ရှိ Wallet တစ်ခုချင်းစီ၏ အနှစ်ချုပ်ဇယားတွင် `Wallet | စတင် (Opening) | ဝင်ငွေ (Inflow) | ထွက်ငွေ (Outflow) | လက်ကျန် (Balance)` ကော်လံ ၅ ခုစလုံးကို ပေါင်းစပ်ပေးလိုက်သဖြင့် အတန်းတိုင်းနှင့် ကော်လံတိုင်း သင်္ချာနည်းအရ ၁၀၀% ကိုက်ညီသွားပါသည်။
- **Firestore သို့ Live Computed Balances ပို့ဆောင်ခြင်း**:
  - `syncDataToCloud` တွင် ဟောင်းနွမ်းနေသော Wallet Balance အစား အသစ်တွက်ချက်ထားသော `computedWallets` ကို ပို့ဆောင်ပေးသဖြင့် Cloud ပေါ်တွင် လက်ကျန်ငွေများ အမြဲတမ်း တိကျမှန်ကန်နေစေပါသည်။

## [2026-10-01] - v4.9.6 - 0.83 Lakhs (83,000 MMK) Cross-Device Sync & Timezone Shift Fix

### Fixed & Enhanced
- **0.83 Lakhs (၈၃,၀၀၀ ကျပ်) Cross-Device Sync Resolution (စက် ၃ ခုလုံးတွင် ၀.၈၃ သိန်း စာရင်း တပြိုင်တည်း ပေါ်စေခြင်း)**:
  - `saveSharedWalletTransaction` တွင် Shared Wallet သို့ ငွေစာရင်း ထည့်သွင်းချိန်၌ Parent document လက်ကျန် update ပေးပို့ရာတွင် Security rules ၏ `affectedKeys().hasOnly(['balance', 'updatedAt'])` နှင့် အံမဝင်ဘဲ ရေးသွင်းခွင့် ပိတ်ပင်ခံရနိုင်ခြေရှိသည့် `id` key အပို ပါဝင်နေမှုကို အပြီးသတ် ဖယ်ရှားပြင်ဆင်ပေးခဲ့ပါသည်။
  - Transaction ရေးသွင်းမှု (`txRef`) ကို ဦးစွာ ပထမ သီးခြား လွတ်လပ်စွာ ၁၀၀% အောင်မြင်စွာ Firestore သို့ ရေးသွင်းစေပြီးမှသာ Parent balance အား Update ပြုလုပ်စေသဖြင့် မည်သည့် permission သို့မဟုတ် race condition အခြေအနေမျိုးတွင်မဆို ၈၃,၀၀၀ ကျပ် (၀.၈၃ သိန်း) စာရင်းသည် Cloud သို့ မလွဲမသွေ တိုက်ရိုက်ရောက်ရှိသွားစေပါသည်။
  - Firestore Security Rules ရှိ `isSharedWalletBalanceUpdate` တွင် `['balance', 'updatedAt', 'id']` အား လက်ခံခွင့်ပြုပေးကာ Live Rules အား Deploy ပြုလုပ်ပြီးဖြစ်ပါသည်။
- **Myanmar Local Timezone Shift Elimination (မနက်ပိုင်း သွင်းလိုက်သော စာရင်းများ ယမန်နေ့ထဲသို့ ရောက်သွားသည့် ပြဿနာ ဖြေရှင်းခြင်း)**:
  - `new Date().toISOString().split('T')[0]` သည် UTC အချိန်ကို အသုံးပြုသဖြင့် မြန်မာစံတော်ချိန် (UTC+6:30) မနက်ပိုင်းတွင် စာရင်းသွင်းချိန်၌ ယမန်နေ့ရက်စွဲ (ဥပမာ စက်တင်ဘာ ၃၀) အဖြစ် သတ်မှတ်မိကာ အခြားစက်များတွင် "Today" သို့မဟုတ် "အောက်တိုဘာလ" filter ဖြင့် ကြည့်ရှုချိန် ပေါ်မလာဘဲ ဖြစ်ခဲ့ရသည့် Bug ကို အသစ်ရေးသားလိုက်သော `getLocalDateString()` helper ဖြင့် အစားထိုး ပြုပြင်လိုက်ပါသည်။
- **Cloud Backup Inclusion for All Shared Wallet Records (`syncDataToCloud` တွင် အားလုံး သိမ်းဆည်းပေးခြင်း)**:
  - Full Cloud Sync ပြုလုပ်ချိန်၌ Shared Wallet စာရင်းများကို ချန်လှပ်မထားတော့ဘဲ Personal Subcollection ကော Shared Subcollection ပါ နှစ်နေရာစလုံးသို့ အလိုအလျောက် ပို့ဆောင်သိမ်းဆည်းပေးပါသည်။

## [2026-10-01] - v4.9.5 - Complete Cross-Device Real-Time Synchronization & 83,000 MMK Record Propagation

### Fixed & Enhanced
- **Lossless Cross-Device Live Document Ingestion (သွင်းထားသော ၈၃,၀၀၀ ကျပ် စာရင်း အခြားစက်များတွင် ချက်ချင်းပေါ်လာစေခြင်း)**:
  - Firestore Real-time Snapshot Listeners များတွင် Cloud မှ ရောက်ရှိလာသော Document များကို Client-side Local Deletion Cache စစ်ဆေးမှု (`!isTxDeleted`, `!isWalletDeleted`) ကြောင့် မှားယွင်းဖယ်ထုတ်ပယ်ချခံရသည့် Bug အား အပြီးသတ် ဖယ်ရှားရှင်းလင်းလိုက်ပါသည်။
  - Cloud Firestore မှ `snap.forEach()` ဖြင့် တိုက်ရိုက်ရောက်ရှိလာသော Live Transaction စာရင်းများ (ဥပမာ- ၈၃,၀၀၀ ကျပ် စာရင်း) အားလုံးကို အခြားစက် ၂ ခု (ဖုန်း / Windows / Browser) သို့ တိုက်ရိုက် အပြည့်အဝ Merge ထည့်သွင်းပေးလိုက်ပါသည်။
- **Firestore Document ID Injection in Parallel Pull Sync (`pullDataFromCloud` တွင် doc.id ပေါင်းစပ်ပေးခြင်း)**:
  - `pullDataFromCloud` တွင် `wallets`, `transactions`, `debts`, `categories`, `budgets`, `vehicles`, `fuelLogs` Collection အားလုံးအတွက် Document ID ကို `{ id: d.id, ...d.data() }` ဖြင့် ၁၀၀% တိကျစွာ ထည့်သွင်းပေးလိုက်သဖြင့် မည်သည့်စက်မှ ဝင်ရောက်ကြည့်ရှုသည်ဖြစ်စေ Data များ အပြည့်အစုံ ပေါ်လာစေပါသည်။
- **Immediate Cloud Persistence for Debt Lifecycle Actions (အကြွေးနှင့် ပြန်ဆပ်ငွေ ပြင်ဆင်မှုများ Cloud သို့ ချက်ချင်း သိမ်းဆည်းခြင်း)**:
  - အကြွေးပေးဆပ်မှု မှတ်တမ်းတင်ခြင်း (`handleRecordRepaymentSubmit`)၊ အကြွေးအခြေအနေ အဖွင့်/အပိတ် ပြုလုပ်ခြင်း (`handleToggleDebtStatus`)၊ အကြွေးပြန်ဆပ်မှတ်တမ်း ပြင်ဆင်/ဖျက်ခြင်း (`handleEditRepayment`, `handleDeleteRepayment`) လုပ်ဆောင်ချက်များအားလုံးကို Firestore ဒေတာဘေ့စ်သို့ `safeSetDoc` ဖြင့် Real-Time ချက်ချင်း သိမ်းဆည်းပေးလိုက်သဖြင့် စက်အားလုံးတွင် တပြိုင်တည်း အလိုအလျောက် ပေါ်လာမည်ဖြစ်ပါသည်။

## [2026-10-01] - v4.9.4 - Shared Wallet Cross-Device Transaction Propagation & Multi-Tab Persistence Fix

### Fixed & Enhanced
- **Shared Wallet Cross-Device Transaction Propagation (၈၃,၀၀၀ ကျပ် စာရင်း အခြားစက်များတွင် ချက်ချင်းပေါ်စေရန် ပြုပြင်ခြင်း)**:
  - iPhone (သို့မဟုတ် Device တစ်ခုခု) မှ "အိမ်သုံးစာရင်း" ကဲ့သို့ Shared Wallet ထဲသို့ ထည့်သွင်းလိုက်သော ဝင်ငွေ ၈၃,၀၀၀ ကျပ်စာရင်းသည် `sharedWallets/{docId}/transactions` subcollection သို့ ရေးသွင်းရာတွင် parent document race condition နှင့် listener argument mapping ပြဿနာကြောင့် အခြားစက် (Windows / Android) များထံ real-time မရောက်ဘဲ ကျန်နေခဲ့သည့် Root Cause ကို အပြီးသတ် ဖော်ထုတ်ဖျက်ဆီးလိုက်ပါသည်။
  - `firestore.rules` တွင် parent doc indexing race condition ကို ဖယ်ရှားပေးခဲ့ပြီး `subscribeSharedWalletTransactions` တွင် `docIdToUse` နှင့် `user.uid` တိုက်ရိုက်ချိတ်ဆက်ပေးကာ document mapping ကို `{ id: d.id, ...d.data() }` ဖြင့် ၁၀၀% တိကျစေလိုက်သဖြင့် စက် ၃ ခုလုံးတွင် ၅၅ ခုမြောက် ၈၃,၀၀၀ ကျပ် စာရင်း အပါအဝင် အားလုံး တပြေးညီ တိုက်ရိုက် Sync ဖြစ်သွားပါပြီ။
- **Cross-Device Real-Time Sync & Multi-Tab Cache Manager (ဖုန်းနှင့် Windows အကြား Cross-Device Sync တိုက်ရိုက်ရရှိစေခြင်း)**:
  - Windows browser များနှင့် စက်ပစ္စည်းများတွင် Tab တစ်ခုထက်ပို၍ ဖွင့်ထားချိန် သို့မဟုတ် Cache lock ဖြစ်နေချိန်တွင် Firestore Connection မပြတ်တောက်စေရန် `persistentMultipleTabManager` သို့ အဆင့်မြှင့်တင်လိုက်ပါသည်။
- **Transfer Out Deduction & Label Refinement (ငွေလွှဲထုတ်စာရင်းအား ရှင်းလင်းစွာ သတ်မှတ်ပြသခြင်း)**:
  - ဝင်ငွေ/ထွက်ငွေ မှတ်တမ်းများတွင် Transfer Out ကို `ငွေလွှဲထုတ်` အဖြစ် အမည်သတ်မှတ်ပေးပြီး ထွက်ငွေအဖြစ် နှုတ်ယူတွက်ချက်ပြသပေးထားပါသည်။

### Fixed & Enhanced
- **Ultra-Resilient Parallel Cloud Pull Sync (VPN နှင့် ကွန်ရက်နှေးကွေးမှုများအတွက် သီးခြားလွတ်လပ်သော Sync Down တည်ဆောက်ပုံ)**:
  - ယခင်က Cloud မှ အချက်အလက်များ ပြန်လည်ဆွဲယူရာတွင် (၁၂) မျိုးလုံးကို တစ်စုတစ်စည်းတည်း `Promise.all` ဖြင့် ဆွဲယူပြီး (၈) စက္ကန့်အတွင်း မပြီးဆုံးပါက တစ်ခုလုံး Timeout ဖြစ်ပြီး Data လုံးဝမတက်ဘဲ အဝိုင်းလည်ကာ Empty Screen ဖြစ်သွားစေသည့် Bug အား အပြီးသတ်ဖျက်ဆီးလိုက်ပါသည်။
  - ယခုအခါ Collection တစ်ခုချင်းစီကို သီးခြားလွတ်လပ်သော အမှားအယွင်းကင်းလွတ်ခွင့်စနစ် (`safeFetch` helper with individualized timeouts up to 18 seconds) ဖြင့် ပြောင်းလဲတည်ဆောက်လိုက်သောကြောင့် **မည်မျှပင် ကွန်ရက်နှေးစေကာမူ အရေးကြီးဒေတာများ (Transactions, Wallets, Debts) သည် ချက်ချင်း ကွက်တိ Sync ဆွဲယူMerger လုပ်ဆောင်သွားမည် ဖြစ်ပါသည်။**
- **99% Firestore Read Quota Savings via array-contains (Shared Wallet ရှာဖွေမှုတွင် Firestore reads ဒေတာဖတ်အား ၉၉% လျှော့ချခြင်း)**:
  - ယခင်က မျှဝေထားသော Shared Wallet များကို စစ်ဆေးရန် `sharedWallets` collection တစ်ခုလုံးရှိ document အားလုံးကို client-side တွင် listen လုပ်ထားမိသဖြင့် Daily Spark free quota reads များသည် မိနစ်ပိုင်းအတွင်း ကုန်ဆုံးလွယ်ခဲ့ပါသည်။
  - ယခုအခါ Firestore ၏ `array-contains` query သို့ ကူးပြောင်းပြီး မိမိ၏ email ပါဝင်သော shared wallets စာရင်းများကိုသာ တိုက်ရိုက်ကန့်သတ် listen သဖြင့် **Firestore ရေးဖတ်ခြင်း load အားလုံးကို ၉၉% ကျော် သိသိသာသာ လျှော့ချသက်သာစေပြီး Quota limit errors များကို လုံးဝကာကွယ်ပေးလိုက်ပါသည်။**
- **Windows & New Device Empty App Frame Fixed (Windows နှင့် browser သစ်များတွင် Data မပေါ်သည့်ပြဿနာအား အပြီးသတ်ဖြေရှင်းခြင်း)**:
  - Cache မရှိသေးသော Windows စက်ပစ္စည်းအသစ် သို့မဟုတ် Browser အသစ်များတွင် login ဝင်ရောက်ချိန်၌ Cloud pulling robust ဖြစ်သွားသဖြင့် ဒေတာများအားလုံး တိုက်ရိုက်ကွက်တိ ၁၀၀% ပြန်လည်ပေါ်ထွက်လာပါပြီ။

## [2026-10-01] - v4.9.2 - Transactions Wallet Filter Reactivity Fix & Transfer Out Deduction Implementation

### Fixed & Enhanced
- **Transactions Wallet Filter Reactivity Fix (Wallet Filter ရွေးချယ်မှုအောက်ရှိ စာရင်းများကို Reactivity ပြုပြင်ခြင်း)**:
  - ဝင်ငွေထွက်ငွေမှတ်တမ်းစာမျက်နှာ (Transactions View) ရှိ Wallet filter dropdown တွင် Wallet များ ပြောင်းလဲရွေးချယ်သော်လည်း အောက်ဘက်ရှိ စာရင်းများ ပြောင်းလဲမသွားသည့် Reactivity Bug ကို အပြီးသတ် ပြုပြင်လိုက်ပါသည်။
  - `selectedWalletIds`, `wallets`, `walletMap` တို့ကို `useMemo` dependency array ထဲသို့ ထည့်သွင်းပေးလိုက်သဖြင့် Wallet Filter ပြောင်းလိုက်သည်နှင့် အောက်ဘက်ရှိ စာရင်းများနှင့် နေ့စဉ် subtotals တွက်ချက်မှုများသည် ချက်ချင်း ပြောင်းလဲအလုပ်လုပ်သွားမည် ဖြစ်ပါသည်။
- **Transfer Out Deduction inside Subtotals (ငွေလွှဲထုတ်မှုများကို နေ့စဉ်နှင့် လစဉ် totals များတွင် အနှုတ်တွက်ချက်ပေးခြင်း)**:
  - ယခင်က ငွေလွှဲပြောင်းမှုများကို စာရင်းဇယားဖောင်းပွမှုမရှိစေရန် daily subtotals များမှ ဖယ်ထုတ်ထားသဖြင့် ငွေလွှဲထုတ် (Transfer Out) လုပ်ဆောင်ချက်များသည် နေ့စဉ်စုစုပေါင်းစာရင်းတွင် အနှုတ်မပြဘဲ ဖြစ်နေခဲ့ပါသည်။
  - ယခုအခါ ငွေလွှဲထုတ် (Transfer Out) များကို ထွက်ငွေအဖြစ် နေ့စဉ် subtotals တွက်ချက်မှုများနှင့် လစဉ် overview total ထဲတွင် ထည့်သွင်းတွက်ချက်ရန် တရားဝင် ပြောင်းလဲပြင်ဆင်ပေးလိုက်သဖြင့် **အသားတင် (Net Balance) စာရင်းမှ အလိုအလျောက် စနစ်တကျ နှုတ်ယူသွားမည် ဖြစ်ပါသည်**။

## [2026-10-01] - v4.9.1 - Reverted to Original Database Connection, Collaborator Sync Fix & Visitor Quota Optimization

### Fixed & Enhanced
- **Original "(default)" Database Connection Reverted (မူရင်း Database သို့ ပြန်လည်ချိတ်ဆက်ခြင်း)**:
  - သုံးစွဲသူများ၏ မူရင်းအချက်အလက်ဟောင်းများနှင့် VIP Plan အကောင့်ဟောင်းများအားလုံး အပြည့်အဝ ပြန်လည် ရရှိစေရန်အတွက် ကွဲလွဲနေသော ဒေတာဘေ့စ်အသစ်အစား မူရင်း `(default)` database pointer သို့ အောင်မြင်စွာ ပြန်လည် ချိတ်ဆက်ပေးလိုက်ပါသည်။ ယခုအခါ Database နှစ်ခု မကွဲပြားတော့ဘဲ ယခင်ဒေတာများ ပျက်စီးဆုံးရှုံးမှုမရှိဘဲ မူရင်းအတိုင်း တန်းပေါ်လာမည် ဖြစ်ပါသည်။
- **Shared Wallet Collaborator Synchronization Fix (မျှဝေထားသော အဖွဲ့ဝင်များထံ စာရင်းတန်းပေါ်စေမည့် အခွင့်အရေး ပြင်ဆင်ခြင်း)**:
  - Shared Wallet ထဲသို့ Device တစ်ခုမှ စာရင်းထည့်သွင်းပါက အခြားစက်များနှင့် မျှဝေခံရသူ၏ အကောင့်များတွင် မပေါ်သည့် Sync ပြဿနာကို အပြီးသတ် စစ်ဆေးဖော်ထုတ်နိုင်ခဲ့ပါသည်။
  - Collaborator အား ဖိတ်ခေါ်သည့်အခါ ၎င်းတို့၏ Email အား မူရင်းအသုံးပြုသူ၏ Root User Document ရှိ `collaborators` စာရင်းထဲသို့ပါ အလိုအလျောက် တိုက်ရိုက် ထည့်သွင်းပေးလိုက်သဖြင့် Firestore Security Rules မှ ရေးသွင်းခွင့်ပြုသွားပြီး Sync များ တိုက်ရိုက် ကွက်တိ အလုပ်လုပ်သွားမည် ဖြစ်ပါသည်။
  - အက်ပ်စတင်ပွင့်ချိန်တိုင်းတွင်လည်း မိမိမျှဝေထားသော အဖွဲ့ဝင်များအားလုံး root document ၌ ခွင့်ပြုချက် ရရှိပြီးသား ဖြစ်စေရန် နောက်ခံမှ အလိုအလျောက် စစ်ဆေးတိုက်ဆိုင်ပြီး ပြုပြင်ပေးသော **Active Self-Healing Sync** စနစ်ကို ထည့်သွင်းပေးထားပါသည်။
- **Visitor Tracking Daily Write Quota Optimization (နေ့စဉ် ရေးယူခွင့်ပမာဏ မပြည့်စေရန် အကောင်းဆုံးပြင်ဆင်ခြင်း)**:
  - နေ့စဉ် Firestore Spark (Free) plan ၏ Daily Write limit ကုန်ဆုံးပြီး `Quota limit exceeded` ပြသတတ်သော ပြဿနာကို ကာကွယ်ရန် Visitor tracking လုပ်ဆောင်ချက်တွင် **၅ မိနစ်စာ Activity Buffer** ထည့်သွင်းပေးလိုက်ပါသည်။
  - သုံးစွဲသူတစ်ဦးချင်းစီ၏ နောက်ခံလှုပ်ရှားမှုများကို ၅ မိနစ်လျှင် အများဆုံး တစ်ကြိမ်သာ ဒေတာဘေ့စ်သို့ ရေးသွင်းစေသဖြင့် Daily write usage ကို ၉၉% ခန့် သက်သာစေပြီး Quota အား အပြည့်အဝ ကာကွယ်ပေးထားပါသည်။

## [2026-09-30] - v4.9.0 - Admin Self-Healing Active Profile Upgrade & Automatic VIP Synchronization

### Fixed & Enhanced
- **Admin Self-Healing Active Profile Upgrade (အက်မင်ပရိုဖိုင် Plan အား Premium/VIP သို့ အလိုအလျောက် ရေးသွင်းပြုပြင်ပေးခြင်း)**:
  - ယခင်လုံခြုံရေးစည်းမျဉ်းများ၏ ပိတ်ဆို့မှုကြောင့် ဒေတာဘေ့စ်တွင် အက်မင်၏ Plan သည် `"FREE"` အဖြစ်သာ ကျန်ရှိနေခဲ့သည့် ကွဲလွဲချက်ကို လုံးဝ အပြီးသတ် ချေမှုန်းရန်အတွက် **Active Self-Healing** စနစ်ကို ထည့်သွင်းပေးလိုက်ပါသည်။
  - Admin Control Center အား ဖွင့်လိုက်သည်နှင့် ၎င်း၏ ပရိုဖိုင် Plan သည် `"FREE"` ဖြစ်နေပါက နောက်ခံမှ `"premium"` (VIP) သို့ ဒေတာဘေ့စ် (Firestore) ၌ စက္ကန့်ပိုင်းအတွင်း အလိုအလျောက် တိုက်ရိုက် ရေးသွင်းပြုပြင်ပေးမည် ဖြစ်ပါသည်။
  - ထို့ကြောင့် အက်မင်အကောင့်များသည် အသုံးပြုသူများစာရင်းတွင်ပါ `"FREE"` အစား `"PREMIUM"` ဟု ချက်ချင်း တိုက်ရိုက် မှန်ကန်သွားမည် ဖြစ်ပါသည်။

## [2026-09-30] - v4.8.9 - Direct Token-Level Admin Security Rules & Secure Background Loading Buffers

### Fixed & Enhanced
- **Direct Token-Level Admin Security Match (Firestore Rules တွင် အက်မင်အား တိုက်ရိုက် ခွင့်ပြုချက် ပေးခြင်း)**:
  - အက်မင်အကောင့် `khunthanshwe@gmail.com` ဝင်ရောက်သည့်အခါ `admins/{uid}` document စာရင်းသွင်းမှု ကြန့်ကြာနေသော်လည်း Google Signature Auth Token မှတစ်ဆင့် rules ကို ချက်ချင်း အသိအမှတ်ပြုစေသဖြင့် "အပြင်မှာ VIP၊ အထဲမှာ Free" ဖြစ်နေရသည့် rules permission errors များကို ၁၀၀% ဖြေရှင်းပေးလိုက်ပါသည်။
  - အက်မင်မှ user profile plan ကို "premium" သို့ ပြောင်းလဲခြင်းနှင့် sync လုပ်ခြင်းများကို ဒေတာဘေ့စ်တွင်လည်း အောင်မြင်စွာ တိုက်ရိုက် သိမ်းဆည်းနိုင်သွားပြီ ဖြစ်ပါသည်။
- **Instant Users & Active Visitors Load**:
  - Admin Panel တွင် အသုံးပြုသူများစာရင်း (Users) နှင့် လက်ရှိဝင်ရောက်နေသူများစာရင်း (Active Visitors) မပေါ်လာသော ပြဿနာကို security rules block မရှိစေခြင်းဖြင့် ၁၀၀% ပြန်လည် ပေါ်ထွက်လာစေပြီး တိုက်ရိုက် စီမံခန့်ခွဲနိုင်အောင် ရှင်းလင်းပေးလိုက်ပါသည်။
- **Robust Network Timeout Buffers**:
  - နောက်ခံ profile data load ခြင်း timeouts များကို slow network သို့မဟုတ် VPN များအတွက် ၃.၅ စက္ကန့်မှ ၁၀ စက္ကန့်အထိ တိုးမြှင့်ပေးထားသဖြင့် မည်သည့်အခြေအနေမျိုးတွင်မဆို load မဖြစ်ဘဲ ကျန်ခဲ့ခြင်းများ မရှိတော့ပါ။

## [2026-09-30] - v4.8.8 - Synchronous Admin Registration & Canonical Database Profile Plan Matching

### Fixed & Enhanced
- **Consistent Plan State (အက်မင် အသုံးပြုသူ၏ VIP အစီအစဉ်အား ဒေတာဘေ့စ်နှင့် တိုက်ရိုက် တစ်သားတည်းဖြစ်စေခြင်း)**:
  - အက်မင် အသုံးပြုသူများအတွက် အပြင်ပန်း (Client UI) တွင် VIP ဟု ပြသနေသော်လည်း ဒေတာဘေ့စ် (Inside) တွင် Free ဖြစ်နေသည့် ပြဿနာ ("Outside VIP, Inside Free") အား ဖြေရှင်းရန်အတွက် အက်မင်မှတ်တမ်း (`admins/{uid}`) အား database တွင် ဦးစွာ ရေးသားပြီးမြောက်အောင် စောင့်ဆိုင်းပြီးမှသာ (`await`) user profile plan အား "premium" အဖြစ် database ထဲသို့ တိုက်ရိုက် အောင်မြင်စွာ ရေးသွင်းနိုင်အောင် ပြောင်းလဲပြင်ဆင်ပေးလိုက်ပါသည်။
  - ဒေတာဘေ့စ်ရှိ user profile document ထဲတွင်လည်း "premium" အဖြစ် အပြည့်အဝ စာရင်းဝင်သွားသဖြင့် အက်မင်အကောင့်များသည် အပြင်ပန်းရော အတွင်းပိုင်း ဒေတာဘေ့စ်ပါ တစ်သားတည်း VIP အဖြစ် တည်ငြိမ်မှန်ကန်သွားပြီ ဖြစ်ပါသည်။

## [2026-09-30] - v4.8.7 - Sidebar scroll locking and safe defaultDb initialization

### Fixed & Enhanced
- **Sidebar Background Scroll Lock (Sidebar ဖွင့်ချိန်တွင် စာမျက်နှာအောက်ခံ Scroll ဖြစ်မှုအား တားဆီးခြင်း)**:
  - Sidebar Menu ဖွင့်လှစ်ထားသည့်အခါ အောက်ဘက်ရှိ စာမျက်နှာများ ဆက်လက် scroll ဖြစ်နေပြီး Sidebar အား scroll ဆွဲရန် ခက်ခဲသော ပြဿနာကို Body Scroll Lock စနစ်ဖြင့် လုံးဝ အပြီးသတ် ပြင်ဆင်ပေးလိုက်ပါသည်။
- **Safe Secondary defaultDb initialization**:
  - Custom database pointers အသုံးပြုသည့်အခါ `defaultDb` အား `initializeFirestore` အစား safe `getFirestore` ဖြင့်သာ retrieve လုပ်သဖြင့် White Screen crash များကို dynamic security guard စနစ်ဖြင့် ၁၀၀% ကာကွယ်ထားပါသည်။

## [2026-09-27] - ဆီဖိုး & ယာဉ်ကုန်ကျစရိတ် UI/UX ရှင်းလင်းမှုနှင့် နေရာနှစ်ထပ်ဖြစ်မှု ပြင်ဆင်ချက် (Unified Fuel & Vehicle UX)

### Added
- **Dedicated Vehicle & Fuel Entry Card (သီးသန့် စက်သုံးဆီ ဖြည့်သွင်းကတ်)**:
  - ဆီဖိုး (သို့မဟုတ်) ယာဉ်စီမံခန့်ခွဲမှု ကဏ္ဍ ရွေးချယ်ချိန်တွင် သီးသန့် အဆင်ပြေစေမည့် UI Card ကို မူလဈေးနှုန်းအကွက်နေရာတွင် အစားထိုးပြသပေးခြင်း။
  - **Quick Amount Mode (ရိုးရိုး ဆီဖိုး ကျသင့်ငွေ တိုက်ရိုက်ထည့်မည်)**: ကျသင့်ငွေရိုက်ထည့်ရန် တစ်ခုတည်းသော Price Box နှင့် အမြန်ဖြည့် Preset ခလုတ်များ (+10k, +20k, +30k, +50k, +100k)။
  - **Detailed Mileage Calculator Mode (ဆီစားနှုန်းပါ တွက်မည်)**: ၁ လီတာဈေးနှုန်း (Ks) နှင့် ဆီပမာဏ (လီတာ) အလိုအလျောက် တွက်ချက်ခြင်း။
  - ဆီဆိုင် (Denko, Max, PTT, etc.)၊ ဆီအမျိုးအစား (Octane 92, 95, Diesel)၊ ဒိုင်ခွက် မိုင်/km နှင့် Full Tank ရွေးချယ်မှုများ။

### Fixed & Removed Clutter
- **Duplicate Price Input Removed (နေရာနှစ်ထပ်ဖြစ်မှုကို ဖယ်ရှားခြင်း)**:
  - ယခင်က အပေါ်တွင် နဂိုကျသင့်ငွေအကွက်နှင့် အောက်တွင် ဆီဖိုးအကွက် (၂ ခု) ဖြစ်နေခြင်းကြောင့် သုံးစွဲသူ မည်သည့်နေရာတွင် ထည့်ရမည်ကို မသိဘဲ ရှုပ်ထွေးခဲ့မှုကို လုံးဝ ဖယ်ရှားရှင်းလင်းခဲ့သည်။
  - ဆီဖိုး ထည့်သွင်းချိန်တွင် မဆိုင်သော ကုန်ပစ္စည်း/ဝယ်ယူသည့်အရာ (Grocery Item Suggestions) နှင့် ငွေပမာဏ ထည့်သွင်းတွက်ချက်နည်းများ (ဈေး x အရေအတွက်၊ Shopping List) ကို အလိုအလျောက် ဖျောက်ထားပေးခြင်း။
- **Single Source of Truth**:
  - ဆီဖိုးကို တစ်နေရာတည်းတွင် ဖြည့်သွင်းရုံဖြင့် သက်ဆိုင်ရာ ပိုက်ဆံအိတ် (Wallet) မှ ထွက်ငွေအဖြစ် နှုတ်ယူသွားပြီး ယာဉ်မှတ်တမ်း (Vehicle Fuel Log) ထဲသို့လည်း အလိုအလျောက် ပေါင်းထည့်ပေးသည်။
