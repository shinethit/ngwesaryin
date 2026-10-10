import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Search,
  Bookmark,
  BookmarkCheck,
  Clock,
  ArrowRight,
  ChevronRight,
  X,
  Share2,
  TrendingUp,
  PieChart,
  ShieldAlert,
  Coins,
  Scale,
  Zap,
  Crown,
  Award,
  Flame,
  Compass,
  Layers,
  Sparkles,
  Lightbulb,
  CheckCircle2,
  Calculator,
  RotateCcw
} from 'lucide-react';
import { ARTICLES, EDUCATION_CATEGORIES, Article } from '../data/educationData';

interface EducationViewProps {
  lang: 'my' | 'en';
}

export const EducationView: React.FC<EducationViewProps> = ({ lang }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeArticle, setActiveArticle] = useState<Article | null>(null);
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('fortune_education_bookmarks');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [fontSize, setFontSize] = useState<'normal' | 'large'>('normal');
  const [onlyBookmarks, setOnlyBookmarks] = useState<boolean>(false);

  // Widget state for 50/30/20 interactive calculator
  const [calcIncome, setCalcIncome] = useState<number>(500000);

  // Toggle bookmark
  const toggleBookmark = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setBookmarkedIds((prev) => {
      const updated = prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id];
      try {
        localStorage.setItem('fortune_education_bookmarks', JSON.stringify(updated));
      } catch (err) {
        console.error('Bookmark save error:', err);
      }
      return updated;
    });
  };

  // Filtered Articles
  const filteredArticles = useMemo(() => {
    return ARTICLES.filter((article) => {
      // Category filter
      if (selectedCategory !== 'all' && article.categoryId !== selectedCategory) {
        return false;
      }
      // Bookmark filter
      if (onlyBookmarks && !bookmarkedIds.includes(article.id)) {
        return false;
      }
      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const inTitle =
          article.titleMy.toLowerCase().includes(q) || article.titleEn.toLowerCase().includes(q);
        const inSub =
          article.subtitleMy.toLowerCase().includes(q) || article.subtitleEn.toLowerCase().includes(q);
        const inSummary =
          article.summaryMy.toLowerCase().includes(q) || article.summaryEn.toLowerCase().includes(q);
        const inContent = article.contentSectionsMy.some(
          (s) =>
            s.heading?.toLowerCase().includes(q) ||
            s.paragraphs.some((p) => p.toLowerCase().includes(q))
        );
        return inTitle || inSub || inSummary || inContent;
      }
      return true;
    });
  }, [selectedCategory, searchQuery, bookmarkedIds, onlyBookmarks]);

  // Icon mapping helper
  const renderIcon = (iconName: string, className = 'w-6 h-6') => {
    switch (iconName) {
      case 'PieChart':
        return <PieChart className={className} />;
      case 'ShieldAlert':
        return <ShieldAlert className={className} />;
      case 'Coins':
        return <Coins className={className} />;
      case 'TrendingUp':
        return <TrendingUp className={className} />;
      case 'Scale':
        return <Scale className={className} />;
      case 'Zap':
        return <Zap className={className} />;
      case 'Crown':
        return <Crown className={className} />;
      case 'Award':
        return <Award className={className} />;
      case 'Flame':
        return <Flame className={className} />;
      case 'Compass':
        return <Compass className={className} />;
      case 'Layers':
        return <Layers className={className} />;
      case 'Sparkles':
        return <Sparkles className={className} />;
      default:
        return <BookOpen className={className} />;
    }
  };

  // Current active index in filtered list for Next/Prev
  const activeIndex = useMemo(() => {
    if (!activeArticle) return -1;
    return filteredArticles.findIndex((a) => a.id === activeArticle.id);
  }, [activeArticle, filteredArticles]);

  const handleNextArticle = () => {
    if (activeIndex >= 0 && activeIndex < filteredArticles.length - 1) {
      setActiveArticle(filteredArticles[activeIndex + 1]);
    }
  };

  const handlePrevArticle = () => {
    if (activeIndex > 0) {
      setActiveArticle(filteredArticles[activeIndex - 1]);
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-indigo-700/50">
        <div className="absolute -right-8 -bottom-8 w-48 h-48 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5" />
            <span>
              {lang === 'my' ? 'ငွေကြေးနှင့် ဘဝတက်လမ်း ပညာပေးကဏ္ဍ' : 'Financial & Life Growth Education'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            {lang === 'my'
              ? 'ငွေကြေး၊ အကြွေးနှင့် ဘဝတက်လမ်း လမ်းညွှန်များ'
              : 'Financial Literacy, Debt Wisdom & Career Mastery'}
          </h1>
          <p className="text-sm sm:text-base text-slate-300 max-w-2xl leading-relaxed">
            {lang === 'my'
              ? '၅၀/၃၀/၂၀ စည်းမျဉ်း၊ Good Debt vs Bad Debt ခွဲခြားနည်း၊ ဘေဘီလုံမြို့၏ စည်းစိမ်ဥစ္စာ နိယာမများနှင့် Power 48 ဘဝတက်လမ်း လျှို့ဝှက်ချက်များကို လေ့လာပါ။'
              : 'Master the 50/30/20 budgeting framework, Good vs Bad Debt principles, Ancient Babylon financial cures, and 48 Laws of Power.'}
          </p>

          {/* Quick Stats Banner */}
          <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-medium text-slate-300">
            <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-xl backdrop-blur-sm">
              <BookOpen className="w-4 h-4 text-amber-400" />
              <span>
                {lang === 'my' ? `${ARTICLES.length} ခုမြောက် လမ်းညွှန်ဆောင်းပါးများ` : `${ARTICLES.length} Comprehensive Articles`}
              </span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-xl backdrop-blur-sm">
              <Crown className="w-4 h-4 text-yellow-400" />
              <span>{lang === 'my' ? 'ဘေဘီလုံ ၇ နည်းလမ်း' : 'Babylon 7 Cures'}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-xl backdrop-blur-sm">
              <Flame className="w-4 h-4 text-rose-400" />
              <span>{lang === 'my' ? 'Power 48 နိယာမများ' : '48 Laws of Power'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Controls: Search Bar & Bookmarks Toggle */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              lang === 'my'
                ? 'ခေါင်းစဉ်၊ အကြွေး၊ ဘေဘီလုံ သို့မဟုတ် Power 48 ရှာရန်...'
                : 'Search articles, debt, babylon, power 48...'
            }
            className="w-full pl-10 pr-10 py-2.5 bg-white rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-xs transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Bookmarks Filter Button */}
        <button
          onClick={() => setOnlyBookmarks(!onlyBookmarks)}
          className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl border text-sm font-bold transition-all ${
            onlyBookmarks
              ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          {onlyBookmarks ? (
            <BookmarkCheck className="w-4 h-4 text-white" />
          ) : (
            <Bookmark className="w-4 h-4 text-amber-500" />
          )}
          <span>
            {lang === 'my'
              ? `သိမ်းဆည်းထားသည်များ (${bookmarkedIds.length})`
              : `Saved Articles (${bookmarkedIds.length})`}
          </span>
        </button>
      </div>

      {/* Category Tabs Scrollbar */}
      <div className="flex flex-wrap items-center gap-2">
        {EDUCATION_CATEGORIES.map((cat) => {
          const isActive = selectedCategory === cat.id && !onlyBookmarks;
          return (
            <button
              key={cat.id}
              onClick={() => {
                setSelectedCategory(cat.id);
                setOnlyBookmarks(false);
              }}
              className={`whitespace-nowrap px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold transition-all shadow-2xs ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-indigo-200 shadow-md scale-[1.02]'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {lang === 'my' ? cat.titleMy : cat.titleEn}
            </button>
          );
        })}
      </div>

      {/* Articles Grid */}
      {filteredArticles.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-lg font-bold text-slate-800">
            {lang === 'my' ? 'ရှာဖွေမှု လမ်းညွှန် မတွေ့ရှိပါ' : 'No Articles Found'}
          </h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            {lang === 'my'
              ? 'အခြား စာလုံး သို့မဟုတ် ကဏ္ဍ ရွေးချယ်ပြီး ထပ်မံ ရှာဖွေကြည့်ပါ သို့မဟုတ် သိမ်းဆည်းထားသော အမှန်ခြစ်ကို ပိတ်ပါ။'
              : 'Try adjusting your search filter or clear bookmarked view.'}
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('all');
              setOnlyBookmarks(false);
            }}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-indigo-700 transition-all inline-flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{lang === 'my' ? 'မူလအတိုင်း ပြန်လည်ပြပါ' : 'Reset Filters'}</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredArticles.map((article) => {
            const isSaved = bookmarkedIds.includes(article.id);
            return (
              <div
                key={article.id}
                onClick={() => setActiveArticle(article)}
                className="group relative bg-white rounded-3xl border border-slate-200/90 shadow-xs hover:shadow-xl hover:border-indigo-300 transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden p-5"
              >
                {/* Top Badge & Bookmark Button */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${article.badgeColor}`}
                    >
                      {renderIcon(article.iconName, 'w-3.5 h-3.5')}
                      <span>{lang === 'my' ? article.categoryTitleMy : article.categoryTitleEn}</span>
                    </span>

                    <button
                      onClick={(e) => toggleBookmark(article.id, e)}
                      title={isSaved ? 'Unbookmark' : 'Bookmark'}
                      className={`p-2 rounded-full transition-all ${
                        isSaved
                          ? 'bg-amber-100 text-amber-600 hover:bg-amber-200'
                          : 'text-slate-400 hover:text-amber-500 hover:bg-slate-100'
                      }`}
                    >
                      {isSaved ? (
                        <BookmarkCheck className="w-4 h-4 fill-amber-500 text-amber-500" />
                      ) : (
                        <Bookmark className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  {/* Article Title */}
                  <h2 className="font-black text-slate-900 text-lg leading-snug group-hover:text-indigo-600 transition-colors line-clamp-2">
                    {lang === 'my' ? article.titleMy : article.titleEn}
                  </h2>

                  {/* Subtitle */}
                  <p className="text-xs font-medium text-slate-500 line-clamp-2">
                    {lang === 'my' ? article.subtitleMy : article.subtitleEn}
                  </p>

                  {/* Summary Box */}
                  <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-2xl border border-slate-100 line-clamp-3">
                    {lang === 'my' ? article.summaryMy : article.summaryEn}
                  </p>
                </div>

                {/* Bottom Footer Action */}
                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                    <Clock className="w-3.5 h-3.5 text-indigo-500" />
                    <span>{lang === 'my' ? `${article.readTimeMin} မိနစ် ဖတ်ရန်` : `${article.readTimeMin} min read`}</span>
                  </div>

                  <span className="inline-flex items-center gap-1 text-xs font-black text-indigo-600 group-hover:translate-x-1 transition-transform">
                    <span>{lang === 'my' ? 'ဖတ်ရှုမည်' : 'Read Article'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ARTICLE READER MODAL */}
      {activeArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-md overflow-y-auto animate-fade-in">
          <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
            {/* Modal Header Bar */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 sticky top-0 z-20 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${activeArticle.badgeColor}`}>
                  {lang === 'my' ? activeArticle.categoryTitleMy : activeArticle.categoryTitleEn}
                </span>
                <span className="text-xs text-slate-400 font-medium hidden sm:inline-flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-indigo-500" />
                  {lang === 'my' ? `${activeArticle.readTimeMin} မိနစ် ဖတ်ရန်` : `${activeArticle.readTimeMin} min read`}
                </span>
              </div>

              {/* Reader Controls */}
              <div className="flex items-center gap-2">
                {/* Font Size Toggle */}
                <button
                  onClick={() => setFontSize(fontSize === 'normal' ? 'large' : 'normal')}
                  title="Font Size Toggle"
                  className="px-2.5 py-1 text-xs font-bold bg-white rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700"
                >
                  {fontSize === 'normal' ? 'A+' : 'A-'}
                </button>

                {/* Bookmark Button */}
                <button
                  onClick={() => toggleBookmark(activeArticle.id)}
                  className={`p-2 rounded-xl border transition-all ${
                    bookmarkedIds.includes(activeArticle.id)
                      ? 'bg-amber-100 text-amber-600 border-amber-200'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {bookmarkedIds.includes(activeArticle.id) ? (
                    <BookmarkCheck className="w-4 h-4 fill-amber-500 text-amber-500" />
                  ) : (
                    <Bookmark className="w-4 h-4" />
                  )}
                </button>

                {/* Close Modal */}
                <button
                  onClick={() => setActiveArticle(null)}
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body Content (Scrollable) */}
            <div
              className={`p-6 sm:p-8 overflow-y-auto space-y-6 text-slate-800 ${
                fontSize === 'large' ? 'text-base leading-relaxed' : 'text-sm leading-relaxed'
              }`}
            >
              {/* Title & Subtitle */}
              <div className="space-y-2 border-b border-slate-100 pb-5">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
                  {lang === 'my' ? activeArticle.titleMy : activeArticle.titleEn}
                </h1>
                <p className="text-sm font-semibold text-indigo-600">
                  {lang === 'my' ? activeArticle.subtitleMy : activeArticle.subtitleEn}
                </p>
              </div>

              {/* Key Takeaways Highlight Box */}
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/90 rounded-2xl p-4 sm:p-5 space-y-2">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>{lang === 'my' ? 'အဓိက မှတ်သားဖွယ်ရာများ (Key Takeaways)' : 'Key Takeaways'}</span>
                </div>
                <ul className="space-y-1.5 text-xs sm:text-sm text-amber-950">
                  {(lang === 'my' ? activeArticle.keyTakeawaysMy : activeArticle.keyTakeawaysEn).map(
                    (takeaway, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <span>{takeaway}</span>
                      </li>
                    )
                  )}
                </ul>
              </div>

              {/* Interactive Widget: 50/30/20 Calculator Widget inside art_50_30_20_rule */}
              {activeArticle.id === 'art_50_30_20_rule' && (
                <div className="p-5 bg-gradient-to-br from-indigo-50 to-emerald-50 rounded-2xl border border-indigo-200 space-y-4">
                  <div className="flex items-center gap-2 text-indigo-900 font-bold text-sm">
                    <Calculator className="w-4 h-4 text-indigo-600" />
                    <span>
                      {lang === 'my' ? '🧮 ၅၀/၃၀/၂၀ တိုက်ရိုက် ခွဲဝေမှု တွက်ချက်စက်' : '50/30/20 Instant Budget Calculator'}
                    </span>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {lang === 'my' ? 'သင့် လစဉ် ဝင်ငွေ (ကျပ်):' : 'Enter Your Monthly Income (MMK):'}
                    </label>
                    <input
                      type="number"
                      step={10000}
                      value={calcIncome}
                      onChange={(e) => setCalcIncome(Number(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 font-bold text-indigo-900 focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-white p-3 rounded-xl border border-emerald-200 space-y-1">
                      <div className="font-bold text-emerald-700">၅၀% (Needs)</div>
                      <div className="text-slate-500">{lang === 'my' ? 'မဖြစ်မနေ လိုအပ်ချက်' : 'Essentials'}</div>
                      <div className="font-black text-emerald-900 text-sm">
                        {(calcIncome * 0.5).toLocaleString()} ကျပ်
                      </div>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-blue-200 space-y-1">
                      <div className="font-bold text-blue-700">၃၀% (Wants)</div>
                      <div className="text-slate-500">{lang === 'my' ? 'လိုချင်ချက်စရိတ်' : 'Lifestyle'}</div>
                      <div className="font-black text-blue-900 text-sm">
                        {(calcIncome * 0.3).toLocaleString()} ကျပ်
                      </div>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-purple-200 space-y-1">
                      <div className="font-bold text-purple-700">၂၀% (Savings)</div>
                      <div className="text-slate-500">{lang === 'my' ? 'မဖြစ်မနေ စုဆောင်း' : 'Savings'}</div>
                      <div className="font-black text-purple-900 text-sm">
                        {(calcIncome * 0.2).toLocaleString()} ကျပ်
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Main Content Sections */}
              <div className="space-y-6">
                {(lang === 'my' ? activeArticle.contentSectionsMy : activeArticle.contentSectionsEn).map(
                  (section, idx) => (
                    <div key={idx} className="space-y-3">
                      {section.heading && (
                        <h2 className="text-lg font-black text-slate-900 border-l-4 border-indigo-600 pl-3">
                          {section.heading}
                        </h2>
                      )}

                      {/* Paragraphs */}
                      {section.paragraphs.map((p, pIdx) => (
                        <p key={pIdx} className="text-slate-700 leading-relaxed">
                          {p}
                        </p>
                      ))}

                      {/* Bullets */}
                      {section.bullets && (
                        <ul className="pl-4 space-y-1.5 list-disc text-slate-700">
                          {section.bullets.map((b, bIdx) => (
                            <li key={bIdx}>{b}</li>
                          ))}
                        </ul>
                      )}

                      {/* Quote */}
                      {section.quote && (
                        <blockquote className="p-4 bg-slate-100 border-l-4 border-amber-500 rounded-r-xl italic text-slate-800 font-medium">
                          "{section.quote}"
                        </blockquote>
                      )}

                      {/* Callout */}
                      {section.callout && (
                        <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs sm:text-sm text-indigo-900 font-bold">
                          {section.callout}
                        </div>
                      )}
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Modal Footer (Prev / Next Article Navigation) */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-2">
              <button
                disabled={activeIndex <= 0}
                onClick={handlePrevArticle}
                className="px-4 py-2 bg-white rounded-xl border border-slate-200 text-xs font-bold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition-all inline-flex items-center gap-1"
              >
                <ChevronRight className="w-4 h-4 rotate-180" />
                <span>{lang === 'my' ? 'ရှေ့တစ်ပုဒ်' : 'Previous'}</span>
              </button>

              <div className="text-xs text-slate-400 font-medium">
                {activeIndex + 1} / {filteredArticles.length}
              </div>

              <button
                disabled={activeIndex < 0 || activeIndex >= filteredArticles.length - 1}
                onClick={handleNextArticle}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-indigo-700 transition-all inline-flex items-center gap-1 shadow-xs"
              >
                <span>{lang === 'my' ? 'နောက်တစ်ပုဒ်' : 'Next'}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
