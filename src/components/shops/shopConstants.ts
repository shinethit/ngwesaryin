export interface RegionTownship {
  id: string;
  nameMy: string;
  nameEn: string;
}

export interface RegionData {
  id: string;
  nameMy: string;
  nameEn: string;
  townships: RegionTownship[];
}

export interface PresetTag {
  value: string;
  labelMy: string;
  labelEn: string;
  iconName: 'all' | 'grocery' | 'pharmacy' | 'restaurant' | 'workshop' | 'wholesale' | 'other';
  color: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
}

export const PRESET_TAGS: PresetTag[] = [
  { 
    value: 'all', 
    labelMy: 'အားလုံး', 
    labelEn: 'All Types', 
    iconName: 'all',
    color: 'emerald',
    bgColor: 'bg-slate-100',
    textColor: 'text-slate-800',
    borderColor: 'border-slate-200'
  },
  { 
    value: 'grocery', 
    labelMy: 'ကုန်စုံဆိုင် / Store', 
    labelEn: 'Grocery / Store', 
    iconName: 'grocery',
    color: 'amber',
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-800',
    borderColor: 'border-amber-200/80'
  },
  { 
    value: 'pharmacy', 
    labelMy: 'ဆေးဆိုင်', 
    labelEn: 'Pharmacy', 
    iconName: 'pharmacy',
    color: 'emerald',
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-800',
    borderColor: 'border-emerald-200/80'
  },
  { 
    value: 'restaurant', 
    labelMy: 'စားသောက်ဆိုင် / Cafe', 
    labelEn: 'Restaurant / Cafe', 
    iconName: 'restaurant',
    color: 'orange',
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-800',
    borderColor: 'border-orange-200/80'
  },
  { 
    value: 'workshop', 
    labelMy: 'ဝပ်ရှော့ / ပြင်ဆင်ရေး', 
    labelEn: 'Workshop / Repairs', 
    iconName: 'workshop',
    color: 'sky',
    bgColor: 'bg-sky-50',
    textColor: 'text-sky-800',
    borderColor: 'border-sky-200/80'
  },
  { 
    value: 'wholesale', 
    labelMy: 'လက်ကားဆိုင် / ဖြန့်ချိရေး', 
    labelEn: 'Wholesale / Distribution', 
    iconName: 'wholesale',
    color: 'indigo',
    bgColor: 'bg-indigo-50',
    textColor: 'text-indigo-800',
    borderColor: 'border-indigo-200/80'
  },
  { 
    value: 'other', 
    labelMy: 'အခြားဆိုင်များ', 
    labelEn: 'Other Stores', 
    iconName: 'other',
    color: 'purple',
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-800',
    borderColor: 'border-purple-200/80'
  },
];

export const MYANMAR_REGIONS: RegionData[] = [
  {
    id: 'yangon',
    nameMy: 'ရန်ကုန်တိုင်းဒေသကြီး',
    nameEn: 'Yangon Region',
    townships: [
      { id: 'latha', nameMy: 'လသာ', nameEn: 'Latha' },
      { id: 'lanmadaw', nameMy: 'လမ်းမတော်', nameEn: 'Lanmadaw' },
      { id: 'pabedan', nameMy: 'ပန်းဘဲတန်း', nameEn: 'Pabedan' },
      { id: 'kyauktada', nameMy: 'ကျောက်တံတား', nameEn: 'Kyauktada' },
      { id: 'kamayut', nameMy: 'ကမာရွတ်', nameEn: 'Kamayut' },
      { id: 'bahan', nameMy: 'ဗဟန်း', nameEn: 'Bahan' },
      { id: 'sanchaung', nameMy: 'စမ်းချောင်း', nameEn: 'Sanchaung' },
      { id: 'hlaing', nameMy: 'လှိုင်', nameEn: 'Hlaing' },
      { id: 'mayangone', nameMy: 'မရမ်းကုန်း', nameEn: 'Mayangone' },
      { id: 'yankin', nameMy: 'ရန်ကင်း', nameEn: 'Yankin' },
      { id: 'insein', nameMy: 'အင်းစိန်', nameEn: 'Insein' },
      { id: 'north_okalapa', nameMy: 'မြောက်ဥက္ကလာပ', nameEn: 'North Okkalapa' },
      { id: 'south_okalapa', nameMy: 'တောင်ဥက္ကလာပ', nameEn: 'South Okkalapa' },
      { id: 'thingangyun', nameMy: 'သင်္ဃန်းကျွန်း', nameEn: 'Thingangyun' },
      { id: 'thaketa', nameMy: 'သာကေတ', nameEn: 'Thaketa' },
      { id: 'dawbon', nameMy: 'ဒေါပုံ', nameEn: 'Dawbon' },
      { id: 'tamwe', nameMy: 'တာမွေ', nameEn: 'Tamwe' },
      { id: 'mingalartaungnyunt', nameMy: 'မင်္ဂလာတောင်ညွန့်', nameEn: 'Mingalar Taung Nyunt' },
      { id: 'mingaladon', nameMy: 'မင်္ဂလာဒုံ', nameEn: 'Mingaladon' },
      { id: 'shwepyitha', nameMy: 'ရွှေပြည်သာ', nameEn: 'Shwepyitha' },
      { id: 'hlaingtharya', nameMy: 'လှိုင်သာယာ', nameEn: 'Hlaingtharya' },
      { id: 'dagon_north', nameMy: 'ဒဂုံမြို့သစ်မြောက်ပိုင်း', nameEn: 'North Dagon' },
      { id: 'dagon_south', nameMy: 'ဒဂုံမြို့သစ်တောင်ပိုင်း', nameEn: 'South Dagon' },
      { id: 'dagon_east', nameMy: 'ဒဂုံမြို့သစ်အရှေ့ပိုင်း', nameEn: 'East Dagon' },
      { id: 'dagon_seikkan', nameMy: 'ဒဂုံမြို့သစ်ဆိပ်ကမ်း', nameEn: 'Dagon Seikkan' },
    ]
  },
  {
    id: 'mandalay',
    nameMy: 'မန္တလေးတိုင်းဒေသကြီး',
    nameEn: 'Mandalay Region',
    townships: [
      { id: 'chanayethazan', nameMy: 'ချမ်းအေးသာစံ', nameEn: 'Chanayethazan' },
      { id: 'mahaoatmyay', nameMy: 'မဟာအောင်မြေ', nameEn: 'Maha Aung Mye' },
      { id: 'pyigyidagun', nameMy: 'ပြည်ကြီးတံခွန်', nameEn: 'Pyigyidagun' },
      { id: 'chanmyathazi', nameMy: 'ချမ်းမြသာစည်', nameEn: 'Chanmyathazi' },
      { id: 'aungmyethazan', nameMy: 'အောင်မြေသာစံ', nameEn: 'Aungmyethazan' },
      { id: 'patheingyi', nameMy: 'ပုသိမ်ကြီး', nameEn: 'Patheingyi' },
      { id: 'pyinoolwin', nameMy: 'ပြင်ဦးလွင်', nameEn: 'Pyin Oo Lwin' },
      { id: 'nyaungu', nameMy: 'ညောင်ဦး', nameEn: 'Nyaung-U' },
      { id: 'myingyan', nameMy: 'မြင်းခြံ', nameEn: 'Myingyan' },
    ]
  },
  {
    id: 'naypyitaw',
    nameMy: 'နေပြည်တော် ပြည်ထောင်စုနယ်မြေ',
    nameEn: 'Naypyitaw Union Territory',
    townships: [
      { id: 'zayarthiri', nameMy: 'ဇေယျာသီရိ', nameEn: 'Zayarthiri' },
      { id: 'zabuthiri', nameMy: 'ဇမ္ဗူသီရိ', nameEn: 'Zabuthiri' },
      { id: 'dekkhinathiri', nameMy: 'ဒက္ခိဏသီရိ', nameEn: 'Dekkhinathiri' },
      { id: 'pyinmana', nameMy: 'ပျဉ်းမနား', nameEn: 'Pyinmana' },
      { id: 'leweway', nameMy: 'လယ်ဝေး', nameEn: 'Lewe' },
      { id: 'tatkon', nameMy: 'တပ်ကုန်း', nameEn: 'Tatkon' },
    ]
  },
  {
    id: 'shan',
    nameMy: 'ရှမ်းပြည်နယ်',
    nameEn: 'Shan State',
    townships: [
      { id: 'taunggyi', nameMy: 'တောင်ကြီး', nameEn: 'Taunggyi' },
      { id: 'lashio', nameMy: 'လားရှိုး', nameEn: 'Lashio' },
      { id: 'kengtung', nameMy: 'ကျိုင်းတုံ', nameEn: 'Kengtung' },
      { id: 'kalaw', nameMy: 'ကလော', nameEn: 'Kalaw' },
      { id: 'nyaundshwe', nameMy: 'ညောင်ရွှေ', nameEn: 'Nyaungshwe' },
      { id: 'muse', nameMy: 'မူဆယ်', nameEn: 'Muse' },
      { id: 'tachileik', nameMy: 'တာချီလိတ်', nameEn: 'Tachileik' },
    ]
  },
  {
    id: 'mon',
    nameMy: 'မွန်ပြည်နယ်',
    nameEn: 'Mon State',
    townships: [
      { id: 'mawlamyine', nameMy: 'မော်လမြိုင်', nameEn: 'Mawlamyine' },
      { id: 'thaton', nameMy: 'သထုံ', nameEn: 'Thaton' },
      { id: 'mudon', nameMy: 'မုဒုံ', nameEn: 'Mudon' },
      { id: 'ye', nameMy: 'ရေး', nameEn: 'Ye' },
    ]
  },
  {
    id: 'kayin',
    nameMy: 'ကရင်ပြည်နယ်',
    nameEn: 'Kayin State',
    townships: [
      { id: 'hpaan', nameMy: 'ဘားအံ', nameEn: 'Hpa-An' },
      { id: 'myawaddy', nameMy: 'မြဝတီ', nameEn: 'Myawaddy' },
      { id: 'kawkareik', nameMy: 'ကော့ကရိတ်', nameEn: 'Kawkareik' },
    ]
  },
  {
    id: 'bago',
    nameMy: 'ပဲခူးတိုင်းဒေသကြီး',
    nameEn: 'Bago Region',
    townships: [
      { id: 'bago_ts', nameMy: 'ပဲခူး', nameEn: 'Bago' },
      { id: 'taungoo', nameMy: 'တောင်ငူ', nameEn: 'Taungoo' },
      { id: 'pyay_ts', nameMy: 'ပြည်', nameEn: 'Pyay' },
    ]
  },
  {
    id: 'sagaing',
    nameMy: 'စစ်ကိုင်းတိုင်းဒေသကြီး',
    nameEn: 'Sagaing Region',
    townships: [
      { id: 'monywa_ts', nameMy: 'မုံရွာ', nameEn: 'Monywa' },
      { id: 'sagaing_ts', nameMy: 'စစ်ကိုင်း', nameEn: 'Sagaing' },
      { id: 'shwebo', nameMy: 'ရွှေဘို', nameEn: 'Shwebo' },
    ]
  },
  {
    id: 'ayeyarwady',
    nameMy: 'ဧရာဝတီတိုင်းဒေသကြီး',
    nameEn: 'Ayeyarwady Region',
    townships: [
      { id: 'pathein_ts', nameMy: 'ပုသိမ်', nameEn: 'Pathein' },
      { id: 'hinthada', nameMy: 'ဟင်္သာတ', nameEn: 'Hinthada' },
      { id: 'myaungmya', nameMy: 'မြောင်းမြ', nameEn: 'Myaungmya' },
    ]
  },
  {
    id: 'magway',
    nameMy: 'မကွေးတိုင်းဒေသကြီး',
    nameEn: 'Magway Region',
    townships: [
      { id: 'magway_ts', nameMy: 'မကွေး', nameEn: 'Magway' },
      { id: 'pakokku', nameMy: 'ပခုက္ကူ', nameEn: 'Pakokku' },
    ]
  },
  {
    id: 'rakhine',
    nameMy: 'ရခိုင်ပြည်နယ်',
    nameEn: 'Rakhine State',
    townships: [
      { id: 'sittwe', nameMy: 'စစ်တွေ', nameEn: 'Sittwe' },
      { id: 'thandwe', nameMy: 'သံတွဲ', nameEn: 'Thandwe' },
    ]
  },
  {
    id: 'kachin',
    nameMy: 'ကချင်ပြည်နယ်',
    nameEn: 'Kachin State',
    townships: [
      { id: 'myitkyina', nameMy: 'မြစ်ကြီးနား', nameEn: 'Myitkyina' },
      { id: 'bhamo', nameMy: 'ဗန်းမော်', nameEn: 'Bhamo' },
    ]
  },
  {
    id: 'chin',
    nameMy: 'ချင်းပြည်နယ်',
    nameEn: 'Chin State',
    townships: [
      { id: 'hakha', nameMy: 'ဟားခါး', nameEn: 'Hakha' },
    ]
  },
  {
    id: 'kayah',
    nameMy: 'ကယားပြည်နယ်',
    nameEn: 'Kayah State',
    townships: [
      { id: 'loikaw', nameMy: 'လွိုင်ကော်', nameEn: 'Loikaw' },
    ]
  },
  {
    id: 'tanintharyi',
    nameMy: 'တနင်္သာရီတိုင်းဒေသကြီး',
    nameEn: 'Tanintharyi Region',
    townships: [
      { id: 'dawei', nameMy: 'ထားဝယ်', nameEn: 'Dawei' },
      { id: 'myeik', nameMy: 'မြိတ်', nameEn: 'Myeik' },
    ]
  }
];
