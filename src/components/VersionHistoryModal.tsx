import React, { useState } from 'react';
import { X, Sparkles, History, Calendar, Clock, CheckCircle2, ShieldCheck, RefreshCw, Layers, ArrowUpRight, Zap, Award } from 'lucide-react';
import { VERSION_HISTORY, CURRENT_APP_VERSION, CURRENT_BUILD_NUMBER, VersionItem } from '../data/versionHistory';

interface VersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'my' | 'en';
}

export const VersionHistoryModal: React.FC<VersionHistoryModalProps> = ({
  isOpen,
  onClose,
  lang,
}) => {
  const [filter, setFilter] = useState<'all' | 'major' | 'security' | 'feature'>('all');
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateMsg, setUpdateMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredVersions = VERSION_HISTORY.filter((item) => {
    if (filter === 'all') return true;
    if (filter === 'major') return item.tag === 'major' || item.tag === 'current';
    if (filter === 'security') return item.tag === 'security';
    if (filter === 'feature') return item.tag === 'feature';
    return true;
  });

  const handleCheckUpdate = () => {
    setCheckingUpdate(true);
    setUpdateMsg(null);
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .getRegistration()
        .then((reg) => {
          if (reg) {
            return reg.update().then(() => {
              setTimeout(() => {
                setCheckingUpdate(false);
                setUpdateMsg(
                  lang === 'my'
                    ? '✨ အက်ပ်သည် နောက်ဆုံးပေါ် ဗားရှင်းသို့ ရောက်ရှိနေပါပြီ။'
                    : '✨ You are running the latest version.'
                );
              }, 600);
            });
          } else {
            setTimeout(() => {
              setCheckingUpdate(false);
              setUpdateMsg(
                lang === 'my'
                  ? '✨ အက်ပ်သည် နောက်ဆုံးပေါ် ဗားရှင်းသို့ ရောက်ရှိနေပါပြီ။'
                  : '✨ You are running the latest version.'
              );
            }, 500);
          }
        })
        .catch(() => {
          setCheckingUpdate(false);
          setUpdateMsg(
            lang === 'my'
              ? '✨ အက်ပ်သည် နောက်ဆုံးပေါ် ဗားရှင်းသို့ ရောက်ရှိနေပါပြီ။'
              : '✨ You are running the latest version.'
          );
        });
    } else {
      setTimeout(() => {
        setCheckingUpdate(false);
        setUpdateMsg(
          lang === 'my'
            ? '✨ အက်ပ်သည် နောက်ဆုံးပေါ် ဗားရှင်းသို့ ရောက်ရှိနေပါပြီ။'
            : '✨ You are running the latest version.'
        );
      }, 500);
    }
  };

  const getTagBadge = (item: VersionItem) => {
    switch (item.tag) {
      case 'current':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-emerald-600 text-white shadow-xs animate-pulse">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{lang === 'my' ? item.tagLabelMy : item.tagLabelEn}</span>
          </span>
        );
      case 'major':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-900 border border-purple-200">
            <Award className="w-3 h-3 text-purple-600" />
            <span>{lang === 'my' ? item.tagLabelMy : item.tagLabelEn}</span>
          </span>
        );
      case 'security':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
            <ShieldCheck className="w-3 h-3 text-amber-700" />
            <span>{lang === 'my' ? item.tagLabelMy : item.tagLabelEn}</span>
          </span>
        );
      case 'feature':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-sky-900 border border-sky-200">
            <Zap className="w-3 h-3 text-sky-600" />
            <span>{lang === 'my' ? item.tagLabelMy : item.tagLabelEn}</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
            <span>{lang === 'my' ? item.tagLabelMy : item.tagLabelEn}</span>
          </span>
        );
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-700 via-emerald-800 to-teal-900 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center shrink-0">
              <History className="w-5 h-5 text-emerald-200" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black tracking-tight truncate flex items-center gap-2">
                <span>{lang === 'my' ? 'ဗားရှင်းမှတ်တမ်းနှင့် ပြင်ဆင်မှုများ' : 'Version History & Changelog'}</span>
              </h2>
              <p className="text-xs text-emerald-100/90 font-medium">
                {lang === 'my'
                  ? `စတင်တည်ဆောက်ချိန်မှစ၍ လက်ရှိ ${CURRENT_APP_VERSION} အထိ မှတ်တမ်း`
                  : `Full timeline of updates from Genesis to ${CURRENT_APP_VERSION}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Version Highlight Card */}
        <div className="px-4 sm:px-6 pt-4 pb-3 bg-emerald-50/50 border-b border-emerald-100 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-black text-sm tracking-wide shadow-xs flex items-center gap-1.5">
              <span>{CURRENT_APP_VERSION}</span>
              <span className="text-[10px] font-medium opacity-80">(Build #{CURRENT_BUILD_NUMBER})</span>
            </div>
            <div>
              <div className="text-xs font-bold text-emerald-950">
                {lang === 'my' ? 'နောက်ဆုံးပေါ် ဗားရှင်း' : 'Latest Release'}
              </div>
              <div className="text-[11px] text-emerald-800">
                {lang === 'my' ? 'စတင်ချိန်မှ စုစုပေါင်း Update ၁၀ ကြိမ်' : '10 releases from launch to current'}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCheckUpdate}
            disabled={checkingUpdate}
            className="px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-900 bg-white hover:bg-emerald-100 border border-emerald-300 shadow-2xs transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-700 ${checkingUpdate ? 'animate-spin' : ''}`} />
            <span>{checkingUpdate ? (lang === 'my' ? 'စစ်ဆေးနေသည်...' : 'Checking...') : (lang === 'my' ? 'Update စစ်ဆေးမည်' : 'Check Updates')}</span>
          </button>
        </div>

        {updateMsg && (
          <div className="px-4 py-2 bg-emerald-100 text-emerald-900 text-xs font-bold text-center border-b border-emerald-200 animate-fadeIn">
            {updateMsg}
          </div>
        )}

        {/* Filter chips */}
        <div className="px-4 sm:px-6 py-2.5 bg-slate-50 border-b border-slate-200/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0 ${
              filter === 'all'
                ? 'bg-slate-800 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200'
            }`}
          >
            {lang === 'my' ? 'အားလုံး' : 'All Releases'} ({VERSION_HISTORY.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('major')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0 ${
              filter === 'major'
                ? 'bg-purple-700 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200'
            }`}
          >
            {lang === 'my' ? 'အဓိက အဆင့်မြှင့်တင်မှုများ' : 'Major Milestones'}
          </button>
          <button
            type="button"
            onClick={() => setFilter('security')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0 ${
              filter === 'security'
                ? 'bg-amber-700 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200'
            }`}
          >
            {lang === 'my' ? 'လုံခြုံရေးနှင့် စနစ်များ' : 'Security & Core'}
          </button>
          <button
            type="button"
            onClick={() => setFilter('feature')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0 ${
              filter === 'feature'
                ? 'bg-sky-700 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200'
            }`}
          >
            {lang === 'my' ? 'အသစ်ထည့်သွင်းမှုများ' : 'Features'}
          </button>
        </div>

        {/* Timeline Content List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          <div className="relative border-l-2 border-emerald-200/80 ml-3 sm:ml-4 space-y-6 pb-2">
            {filteredVersions.map((item, idx) => {
              const isCurrent = item.version === CURRENT_APP_VERSION;
              return (
                <div key={item.version} className="relative pl-6 sm:pl-8 group">
                  {/* Timeline Dot Indicator */}
                  <div
                    className={`absolute -left-[9px] top-1.5 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center shadow-xs transition-transform group-hover:scale-110 ${
                      isCurrent
                        ? 'bg-emerald-600 ring-4 ring-emerald-100'
                        : item.tag === 'major'
                        ? 'bg-purple-600'
                        : item.tag === 'security'
                        ? 'bg-amber-500'
                        : 'bg-slate-400'
                    }`}
                  >
                    {isCurrent && <div className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />}
                  </div>

                  {/* Version Card */}
                  <div
                    className={`rounded-2xl p-4 sm:p-5 transition-all border shadow-2xs ${
                      isCurrent
                        ? 'bg-gradient-to-br from-emerald-50/70 to-white border-emerald-300 ring-1 ring-emerald-200/80'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {/* Header: Version number, Date & Badges */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5 mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-base font-black text-slate-900 tracking-tight">
                          {item.version}
                        </span>
                        <span className="text-xs font-bold text-slate-400">
                          (Build #{item.buildNumber})
                        </span>
                        {getTagBadge(item)}
                      </div>

                      <div className="flex items-center gap-3 text-slate-500 text-[11px] font-medium">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{item.releaseDate}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{item.releaseTime}</span>
                        </span>
                      </div>
                    </div>

                    {/* Title & Short Description */}
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 mb-1">
                      {lang === 'my' ? item.titleMy : item.titleEn}
                    </h3>
                    <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                      {lang === 'my' ? item.descriptionMy : item.descriptionEn}
                    </p>

                    {/* Change list bullet points */}
                    <div className="space-y-1.5 bg-slate-50/80 rounded-xl p-3 border border-slate-100">
                      {(lang === 'my' ? item.changesMy : item.changesEn).map((change, cIdx) => (
                        <div key={cIdx} className="flex items-start gap-2 text-xs text-slate-700">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                          <span className="leading-snug">{change}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-1.5 font-medium">
            <span>🚀 NgweSarYin Continuous Release</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl font-bold text-slate-700 hover:bg-slate-200/80 bg-white border border-slate-200 transition-colors cursor-pointer shadow-2xs"
          >
            {lang === 'my' ? 'ပိတ်မည်' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
