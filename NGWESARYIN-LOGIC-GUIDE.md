# NgweSarYin — System Logic & Architecture Guide
**Version:** v7.5.24 (build 239)
**Purpose:** ဒီဖိုင်က App တစ်ခုလုံးရဲ့ အတွင်းပိုင်း Logic တွေ ဘယ်လို အလုပ်လုပ်နေလဲဆိုတာကို ရှင်းပြထားတာပါ။ ကုဒ်တွေ ပြင်တဲ့အခါ ဒီဖိုင်ကို အရင်ဖတ်ပါ။

---

## 1. Data Models (အခြေခံ အချက်အလက်များ)
App ရဲ့ အခြေခံ အချက်အလက်တွေကို `src/types.ts` မှာ သတ်မှတ်ထားပါတယ်။
* **Transaction:** ဝင်ငွေ/ထွက်ငွေ မှတ်တမ်း။ `isTransfer`, `transferPairId` သုံးပြီး ငွေလွှဲမှုကို ချိတ်ဆက်ထားတယ်။
* **Wallet:** ပိုက်ဆံအိတ်။ `includeInTotals` (စုစုပေါင်းထဲ ရောမရော), `currency` (ငွေကြေး), `exchangeRate` (ငွေလဲနှုန်း), `sharedWith` (မျှဝေသူများ) ပါတယ်။
* **Vehicle:** ယာဉ်။ `currentOdometer` (လက်ရှိ မိုင်တာ) က အရေးကြီးဆုံးပါ။
* **FuelLog:** ဆီဖိုးမှတ်တမ်း။ `transactionId` နဲ့ ချိတ်ဆက်ထားတယ်။
* **VehicleMaintenance:** ပြုပြင်မှု/အပိုပစ္စည်း မှတ်တမ်း။ `license_renewal` ဆိုတဲ့ အထူး Type ပါတယ်။

---

## 2. Authentication & Cloud Sync (ချိတ်ဆက်မှု အခြေခံ)
### 2.1 AuthContext (`src/context/AuthContext.tsx`)
* **User Profile:** Login ဝင်တာနဲ့ User ရဲ့ Plan (Free/Premium) နဲ့ Expiry Date ကို Firestore ကနေ ဆွဲယူတယ်။
* **Plan Check:** Premium သက်တမ်းကုန်ရင် `free` ပြောင်းတယ်။ (Auto-sync Plan က Boot တိုင်း Firestore နဲ့ LocalStorage ကို နှိုင်းယှဉ်တယ်)။
* **syncDataToCloud:** Local က Data တွေကို Cloud ပေါ် တင်တယ်။ Redundant write မဖြစ်အောင် Signature နဲ့ စစ်တယ်။
* **pullDataFromCloud:** Cloud ကနေ Data တွေ ဆွဲယူတယ်။ Shared Wallet တွေကိုပါ ပူးပေါင်းပေးတယ်။

### 2.2 Real-time Listeners (`src/hooks/useCloudListeners.ts`)
* Firestore က `onSnapshot` သုံးပြီး Collection ၁၀ ခုကို Real-time နားထောင်တယ်။
* `hasPendingWrites` စစ်ပြီး Cloud ရောက်ပြီးသား Data တွေကိုပဲ ယူတယ်။

### 2.3 Sync Queue (`src/lib/syncQueue.ts`)
* Network မကောင်းလို့ Write မဖြစ်ရင် ဒီထဲ ခေတ္တသိမ်းထားပြီး နောက်မှ ပြန်ပို့တယ်။

---

## 3. Wallet & Transaction Logic (ပိုက်ဆံနှင့် စာရင်း)
### 3.1 Balance Calculation (`src/utils/walletBalance.ts`)
* `syncWalletsWithTransactions`: ပိုက်ဆံအိတ်လက်ကျန်ကို Transaction တွေကနေ အလိုအလျောက် တွက်တယ်။
* `isWalletMatch`: ပိုက်ဆံအိတ် ID တူမတူ စစ်တယ် (နာမည်တူရင် မှားနိုင်လို့ ID နဲ့ပဲ စစ်တယ်)။

### 3.2 Transaction Handling (`src/hooks/useTransactionHandlers.ts`)
* စာရင်းထည့်တဲ့အခါ ငွေလွှဲ (Transfer) ဖြစ်နေရင် Transaction ၂ ခု (အထွက်+အဝင်) ကို အလိုအလျောက် တွဲဖန်တီးတယ်။
* Vehicle နဲ့ ချိတ်ထားရင် (Fuel/Maintenance) အဲဒီမှတ်တမ်းတွေကိုပါ တစ်ပြိုင်နက် သိမ်းတယ်။

### 3.3 Multi-Currency (`src/utils/currency.ts` & `src/lib/exchangeRates.ts`)
* ငွေကြေး ၁၁ မျိုး ရှိတယ်။
* open.er-api.com ကနေ ပေါက်ဈေး (Live Rate) ကို ဆွဲတယ်။ မရရင် Default Rate ကို သုံးတယ်။
* `includeInTotals` က false ဖြစ်နေတဲ့ Wallet တွေကို Dashboard စုစုပေါင်းကနေ ဖယ်ထားတယ်။

---

## 4. Vehicle Management Logic (ကားနှင့် ဆီ) ⚠️ အရေးကြီးဆုံး
**သတိထားရမယ့် အချက် -** Vehicle Logic တွေက နေရာ ၂ ခုမှာ ရှိတယ်။ ပြင်တိုင်း ၂ ခုလုံး ပြင်ရမယ်။
1. **Standalone:** `AddFuelModal.tsx` နဲ့ `AddMaintenanceModal.tsx` (Vehicles Tab ကနေ ဝင်တာ)
2. **Embedded:** `TransactionModal.tsx` ထဲက `entryModel === 'fuel'` (သို့) `'vehicle_service'` (Main Form ကနေ ဝင်တာ)

### 4.1 Auto-Calculate (ဆီပမာဏ)
* ဆီဖိုး Form တွေမှာ `Liters` ကို ကိုယ်တိုင်ရိုက်လို့မရဘူး (Read-only)။
* `Total Cost` နဲ့ `Price per Liter` ရိုက်ထည့်လိုက်တာနဲ့ `Liters = Total Cost / Price` နဲ့ အလိုအလျောက် တွက်တယ်။

### 4.2 Odometer Validation
* မိုင်တာအသစ်က လက်ရှိကားမိုင်တာထက် ကြီးရမယ်။
* အရင်တစ်ခါ ထည့်ခဲ့တဲ့ မိုင်တာနဲ့ တူလို့မရဘူး (Double Entry ကာကွယ်ဖို့)။
* မကိုက်ရင် Alert ပေါ်ပြီး Save မဖြစ်ဘူး။

### 4.3 Price Comparison (ဈေးနှိုင်းယှဉ်မှု)
* `lastFuelLogForComparison` / `lastMaintLogForComparison` က နောက်ဆုံးထည့်ခဲ့တဲ့ မှတ်တမ်းကို ရှာတယ်။
* **Smart Sorting:** ရက်စွဲတူရင် `createdAt` (အချိန်) နဲ့ စစ်တယ်။ ဆီဆိုင်နဲ့ ဆီအမျိုးအစား တူတာကို ဦးစားပေးရှာတယ်။
* ဈေးတက်ရင် အနီ၊ ဈေးကျရင် အစိမ်း ပြတယ်။

### 4.4 Lifespan & Alerts (`src/utils/vehicleAnalytics.ts`)
* **License Renewal:** ရက်စွဲပဲ သုံးတယ်။ ကုန်ဆုံးရက် ၉၀/၃၀/၁၄/၇/၃/၀ ရက် အလိုမှာ Alert ပေးတယ်။
* **အပိုပစ္စည်းများ:** Km နဲ့ Day နှစ်မျိုးလုံး သုံးတယ်။ ၅၀%၊ ၇၅% နဲ့ ၁၀၀ km ကျန်ရင် Alert ပေးတယ်။

---

## 5. Debt & Budget Logic (အကြွေးနှင့် ဘတ်ဂျက်)
### 5.1 Debt (`src/hooks/useDebtHandlers.ts`)
* အကြွေးဆပ်တာနဲ့ Transaction တစ်ခု အလိုအလျောက် ဖန်တီးတယ်။
* အကြွေးဖျက်ရင် Transaction ပါ ဖျက်တယ်။

### 5.2 Budget (`src/components/AnalyticsView.tsx`)
* `fixed` (ပုံသေကျပ်) သို့မဟုတ် `percentage` (ဝင်ငွေ၏ %) နဲ့ တွက်တယ်။
* ၈၀% ရောက်ရင် သတိပေး၊ ၁၀၀% ကျော်ရင် အနီပြတယ်။

---

## 6. Language (i18n) & Admin Logic
### 6.1 i18n (`src/utils/i18n.ts`)
* ဘာသာစကား ၄ မျိုး (my/en/zh/th)။
* Default က မြန်မာ။ ပြန်မရှိရင် English ကို ပြတယ်။
* `ngwe_lang_picker_seen` flag နဲ့ ပထမဆုံးအကြိမ် ရွေးခိုင်းတယ်။

### 6.2 Admin Panel (`src/components/AdminPanel.tsx`)
* Real-time Data ကို `collectionGroup` နဲ့ ဆွဲတယ်။
* User တွေရဲ့ Premium Expire ကို `getUserEffectivePlan` နဲ့ စစ်တယ်။ ကုန်ရင် Free ပြတယ်။

---

## 7. Critical Rules (မလုပ်ရမယ့်အရာများ)
* ❌ **JSON ကို Regex မသုံးရ** (JSON.parse ပဲ သုံးရမယ်)။
* ❌ **`endsWith()` နဲ့ Tail မရှာရ** (Regex သုံးရမယ်)။
* ❌ **Admin Internal ကိစ္စတွေမှာ Version မတင်ရ**။
* ❌ **UI ဖိုင်တွေကို String Replace နဲ့ မပြင်ရ** (အများဆုံး မှားတယ်။ ဖိုင်တစ်ခုလုံး Overwrite လုပ်တာ ပိုကောင်းတယ်)။
* ✅ **Vehicle Management ပြင်ရင် Standalone + Embedded (၂ ခုလုံး) ပြင်ရမယ်**။
* ✅ **အမြဲတမ်း FULL File ကို ဖတ်ပြီးမှ ပြင်ရမယ်**။