import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { AdminSystemMessage, AdminMessageType } from '../types';
import { Megaphone, AlertTriangle, FileText, X, ChevronRight, Info, Clock, Sparkles } from 'lucide-react';

interface AdminBroadcastBannerProps {
  lang: 'my' | 'en';
}

export const AdminBroadcastBanner: React.FC<AdminBroadcastBannerProps> = ({ lang }) => {
  const [activeMessages, setActiveMessages] = useState<AdminSystemMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<AdminSystemMessage | null>(null);
  const [dismissedIds, setDismissedIds] = useState<string[]>(() => {
    try {
      const stored = sessionStorage.getItem('ngwe_dismissed_broadcasts');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      const q = query(
        collection(db, 'systemMessages'),
        where('isActive', '==', true)
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const msgs: AdminSystemMessage[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            msgs.push({
              id: docSnap.id,
              title: data.title || '',
              content: data.content || '',
              type: (data.type || 'announcement') as AdminMessageType,
              isMarquee: !!data.isMarquee,
              isActive: !!data.isActive,
              createdAt: data.createdAt || new Date().toISOString(),
              updatedAt: data.updatedAt,
              authorEmail: data.authorEmail,
            });
          });
          // Sort newest first
          msgs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setActiveMessages(msgs);
        },
        (err) => {
          handleFirestoreError(err, OperationType.LIST, 'systemMessages');
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.error('System messages listener init error:', err);
    }
  }, []);

  const handleDismiss = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = [...dismissedIds, id];
    setDismissedIds(updated);
    try {
      sessionStorage.setItem('ngwe_dismissed_broadcasts', JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  // Filter messages that haven't been dismissed in this session
  const visibleMessages = activeMessages.filter((m) => !dismissedIds.includes(m.id));

  if (visibleMessages.length === 0) {
    return null;
  }

  // Priority: first visible marquee message or first visible banner message
  const marqueeMessage = visibleMessages.find((m) => m.isMarquee);
  const currentMsg = marqueeMessage || visibleMessages[0];

  const getTypeTheme = (type: AdminMessageType) => {
    switch (type) {
      case 'notice':
        return {
          bg: 'bg-gradient-to-r from-amber-600 via-amber-700 to-orange-700 text-amber-50',
          badgeBg: 'bg-amber-900/60 text-amber-200 border-amber-500/40',
          border: 'border-amber-500/40',
          labelMy: 'သတိပေးချက်',
          labelEn: 'Notice',
          icon: <AlertTriangle className="w-4 h-4 text-amber-200 shrink-0" />,
        };
      case 'note':
        return {
          bg: 'bg-gradient-to-r from-purple-800 via-indigo-900 to-slate-900 text-purple-50',
          badgeBg: 'bg-purple-950/60 text-purple-200 border-purple-400/40',
          border: 'border-purple-500/40',
          labelMy: 'အထူးမှတ်ချက်',
          labelEn: 'Admin Note',
          icon: <FileText className="w-4 h-4 text-purple-200 shrink-0" />,
        };
      case 'announcement':
      default:
        return {
          bg: 'bg-gradient-to-r from-emerald-700 via-teal-800 to-cyan-900 text-emerald-50',
          badgeBg: 'bg-emerald-950/60 text-emerald-200 border-emerald-400/40',
          border: 'border-emerald-500/40',
          labelMy: 'အထူးကြေညာချက်',
          labelEn: 'Announcement',
          icon: <Megaphone className="w-4 h-4 text-emerald-200 shrink-0" />,
        };
    }
  };

  const theme = getTypeTheme(currentMsg.type);

  return (
    <>
      {/* Broadcast Bar */}
      <div
        id="admin-broadcast-banner"
        className={`w-full relative z-40 border-b shadow-md transition-all ${theme.bg} ${theme.border}`}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 flex items-center justify-between gap-3 overflow-hidden">
          {/* Static Type Badge and Icon */}
          <div className="flex items-center gap-2 shrink-0 z-10">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border backdrop-blur-xs ${theme.badgeBg}`}
            >
              {theme.icon}
              <span>{lang === 'my' ? theme.labelMy : theme.labelEn}</span>
            </span>
          </div>

          {/* Marquee or Static Content */}
          <div
            onClick={() => setSelectedMessage(currentMsg)}
            className="flex-1 overflow-hidden cursor-pointer group flex items-center"
            title={lang === 'my' ? 'အသေးစိတ် ဖတ်ရန် နှိပ်ပါ' : 'Click to view full message'}
          >
            {currentMsg.isMarquee ? (
              <div className="w-full overflow-hidden flex items-center">
                <div className="animate-marquee-scroll flex items-center gap-8 py-0.5 text-xs sm:text-sm font-medium hover:underline">
                  <span className="font-bold">{currentMsg.title} :</span>
                  <span>{currentMsg.content}</span>
                  <span className="text-[11px] opacity-75 inline-flex items-center gap-1 ml-4 text-amber-200">
                    <Sparkles className="w-3 h-3" />
                    {lang === 'my' ? '(အသေးစိတ် ဖတ်ရန် နှိပ်ပါ)' : '(Click to read more)'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs sm:text-sm truncate">
                <span className="font-bold truncate">{currentMsg.title}:</span>
                <span className="opacity-90 truncate">{currentMsg.content}</span>
                <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-bold text-amber-200 shrink-0 ml-1">
                  {lang === 'my' ? 'အသေးစိတ်' : 'Details'}
                  <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            )}
          </div>

          {/* Right Controls: Read details & Dismiss */}
          <div className="flex items-center gap-1.5 shrink-0 z-10">
            <button
              type="button"
              onClick={() => setSelectedMessage(currentMsg)}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/15 hover:bg-white/25 border border-white/20 transition-all cursor-pointer hidden sm:inline-flex items-center gap-1"
            >
              <Info className="w-3.5 h-3.5" />
              <span>{lang === 'my' ? 'ဖတ်မည်' : 'View'}</span>
            </button>

            <button
              type="button"
              onClick={(e) => handleDismiss(currentMsg.id, e)}
              className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/20 transition-colors cursor-pointer"
              title={lang === 'my' ? 'ပိတ်မည်' : 'Dismiss'}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Message Details Modal */}
      {selectedMessage && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden text-slate-800 flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div
              className={`p-5 sm:p-6 text-white flex items-start justify-between gap-4 ${
                getTypeTheme(selectedMessage.type).bg
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                      getTypeTheme(selectedMessage.type).badgeBg
                    }`}
                  >
                    {getTypeTheme(selectedMessage.type).icon}
                    {lang === 'my'
                      ? getTypeTheme(selectedMessage.type).labelMy
                      : getTypeTheme(selectedMessage.type).labelEn}
                  </span>
                  {selectedMessage.isMarquee && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white/20 text-white">
                      Marquee (စာတန်းပြေး)
                    </span>
                  )}
                </div>
                <h3 className="text-lg sm:text-xl font-black text-white pt-1 tracking-tight">
                  {selectedMessage.title}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setSelectedMessage(null)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
              <div className="text-sm leading-relaxed text-slate-700 whitespace-pre-line bg-slate-50 p-4 rounded-xl border border-slate-200/80 font-normal">
                {selectedMessage.content}
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-100">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  {new Date(selectedMessage.createdAt).toLocaleString(
                    lang === 'my' ? 'my-MM' : 'en-US',
                    { dateStyle: 'medium', timeStyle: 'short' }
                  )}
                </span>
                {selectedMessage.authorEmail && (
                  <span className="text-[11px] text-slate-500 font-medium">
                    By Admin: {selectedMessage.authorEmail}
                  </span>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  handleDismiss(selectedMessage.id);
                  setSelectedMessage(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                {lang === 'my' ? 'သတိပေးချက် ဖျောက်ထားမည်' : 'Dismiss Banner'}
              </button>
              <button
                type="button"
                onClick={() => setSelectedMessage(null)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-xs cursor-pointer"
              >
                {lang === 'my' ? 'နားလည်ပါပြီ' : 'Got it'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
