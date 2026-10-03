import React, { useState, useEffect, useMemo } from 'react';
import {
  Star,
  MessageSquareHeart,
  Plus,
  Filter,
  Lightbulb,
  Bug,
  Smile,
  Crown,
  UserCheck,
  Trash2,
  Reply,
  CheckCircle2,
  Clock,
  Sparkles,
  Search,
  ThumbsUp,
} from 'lucide-react';
import { Feedback, FeedbackCategory, PlanType } from '../types';
import { useAuth } from '../context/AuthContext';
import { subscribeFeedbacks, replyToFeedback, deleteFeedback } from '../lib/feedbackService';
import { FeedbackModal } from './FeedbackModal';

interface FeedbackViewProps {
  lang: 'my' | 'en';
  currentPlan: PlanType;
  onOpenUpgradeModal: () => void;
}

export const FeedbackView: React.FC<FeedbackViewProps> = ({
  lang,
  currentPlan,
  onOpenUpgradeModal,
}) => {
  const { user, isAdmin } = useAuth();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<FeedbackCategory | 'all'>('all');
  const [selectedScope, setSelectedScope] = useState<'all' | 'mine'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Admin Reply State
  const [replyingFeedbackId, setReplyingFeedbackId] = useState<string | null>(null);
  const [adminReplyText, setAdminReplyText] = useState('');
  const [adminReplyStatus, setAdminReplyStatus] = useState<'reviewed' | 'resolved'>('reviewed');

  useEffect(() => {
    const unsubscribe = subscribeFeedbacks((list) => {
      setFeedbacks(list);
    });
    return () => unsubscribe();
  }, []);

  // Compute stats
  const stats = useMemo(() => {
    if (feedbacks.length === 0) {
      return { avg: 5.0, count: 0, starsCount: [0, 0, 0, 0, 0] };
    }
    const total = feedbacks.reduce((acc, f) => acc + (f.rating || 5), 0);
    const avg = Math.round((total / feedbacks.length) * 10) / 10;

    const starsCount = [0, 0, 0, 0, 0];
    feedbacks.forEach((f) => {
      const r = Math.min(Math.max(Math.round(f.rating || 5), 1), 5);
      starsCount[r - 1] += 1;
    });

    return { avg, count: feedbacks.length, starsCount };
  }, [feedbacks]);

  // Filtered list
  const filteredFeedbacks = useMemo(() => {
    return feedbacks.filter((f) => {
      // Scope filter
      if (selectedScope === 'mine' && user?.uid && f.userId !== user.uid) {
        return false;
      }
      // Category filter
      if (selectedCategory !== 'all' && f.category !== selectedCategory) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesComment = f.comment.toLowerCase().includes(q);
        const matchesName = f.userName.toLowerCase().includes(q);
        const matchesReply = f.adminReply?.toLowerCase().includes(q);
        if (!matchesComment && !matchesName && !matchesReply) return false;
      }
      return true;
    });
  }, [feedbacks, selectedCategory, selectedScope, searchQuery, user]);

  const handleAdminReplySubmit = async (feedbackId: string) => {
    if (!adminReplyText.trim()) return;
    try {
      await replyToFeedback(feedbackId, adminReplyText, adminReplyStatus);
      setReplyingFeedbackId(null);
      setAdminReplyText('');
    } catch (e) {
      console.error('Error submitting admin reply:', e);
    }
  };

  const handleDelete = async (feedbackId: string) => {
    if (confirm(lang === 'my' ? 'ဤ Feedback ကို ဖျက်ရန် သေချာပါသလား။' : 'Delete this feedback?')) {
      await deleteFeedback(feedbackId);
    }
  };

  const getCategoryBadge = (cat: FeedbackCategory) => {
    switch (cat) {
      case 'app_review':
        return {
          icon: Star,
          label: lang === 'my' ? '⭐ App Review' : 'App Review',
          className: 'bg-amber-100 text-amber-800 border-amber-300',
        };
      case 'feature_request':
        return {
          icon: Lightbulb,
          label: lang === 'my' ? '💡 Feature Request' : 'Feature Request',
          className: 'bg-indigo-100 text-indigo-800 border-indigo-300',
        };
      case 'bug_report':
        return {
          icon: Bug,
          label: lang === 'my' ? '🐛 Bug Report' : 'Bug Report',
          className: 'bg-rose-100 text-rose-800 border-rose-300',
        };
      default:
        return {
          icon: Smile,
          label: lang === 'my' ? '💬 General' : 'General',
          className: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        };
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-indigo-800 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold text-amber-200 border border-white/20">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{lang === 'my' ? 'ပြည်သူ့ အသံနှင့် သုံးသပ်ချက်များ' : 'User Reviews & Feedback'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {lang === 'my'
                ? 'သုံးသပ်ချက်နှင့် အကြံပြုချက် ကဏ္ဍ'
                : 'Reviews, Feedback & Comments'}
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100 leading-relaxed">
              {lang === 'my'
                ? 'Ngwe Manager ကို အသုံးပြုသူများ၏ အကြံပြုချက်များ ၊ စွမ်းဆောင်ရည်သစ် တောင်းဆိုချက်များနှင့် သုံးသပ်ချက်များကို လွတ်လပ်စွာ ဖတ်ရှု ရေးသားနိုင်ပါသည်။'
                : 'Share your feedback, request new features, report issues, and read community reviews.'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="w-full md:w-auto px-6 py-3 bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
            <span>{lang === 'my' ? '✍️ Review / အကြံပြုချက် ပေးပို့မည်' : 'Write Review / Feedback'}</span>
          </button>
        </div>
      </div>

      {/* Ratings Breakdown Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Rating Score Card */}
        <div className="md:col-span-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-2xs flex flex-col items-center justify-center text-center space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {lang === 'my' ? 'ပျမ်းမျှ အမှတ်ပေး အဆင့်' : 'Average User Rating'}
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl sm:text-5xl font-extrabold font-mono text-slate-900">
              {stats.avg}
            </span>
            <span className="text-sm font-bold text-slate-400 font-mono">/ 5.0</span>
          </div>

          <div className="flex items-center gap-1 my-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className={`w-5 h-5 ${
                  s <= Math.round(stats.avg)
                    ? 'fill-amber-400 text-amber-500'
                    : 'fill-slate-100 text-slate-300'
                }`}
              />
            ))}
          </div>

          <span className="text-xs font-semibold text-slate-500">
            {lang === 'my'
              ? `စုစုပေါင်း သုံးသပ်ချက် (${stats.count}) ခု`
              : `Based on ${stats.count} user reviews`}
          </span>
        </div>

        {/* Rating Distribution Progress Bars */}
        <div className="md:col-span-8 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-2xs flex flex-col justify-center space-y-2">
          <span className="text-xs font-bold text-slate-700 mb-1">
            {lang === 'my' ? 'ကြယ်ပွင့် ခွဲဝေမှု (Star Distribution):' : 'Rating Breakdown:'}
          </span>
          {[5, 4, 3, 2, 1].map((starIndex) => {
            const countForStar = stats.starsCount[starIndex - 1] || 0;
            const pct = stats.count > 0 ? Math.round((countForStar / stats.count) * 100) : 0;
            return (
              <div key={starIndex} className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1 w-12 font-bold font-mono text-slate-700">
                  <span>{starIndex}</span>
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                </div>
                <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
                  <div
                    className="h-full bg-amber-400 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="w-16 text-right font-mono text-slate-500 text-[11px]">
                  {countForStar} ({pct}%)
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Scope Tabs: All vs Mine */}
          <div className="flex items-center p-1 bg-slate-100 rounded-2xl shrink-0">
            <button
              type="button"
              onClick={() => setSelectedScope('all')}
              className={`flex-1 sm:flex-none px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedScope === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {lang === 'my' ? '🌐 ပြည်သူ့ အကြံပြုချက်များ' : 'All Reviews'}
            </button>
            <button
              type="button"
              onClick={() => setSelectedScope('mine')}
              className={`flex-1 sm:flex-none px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedScope === 'mine'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {lang === 'my' ? '👤 ကျွန်ုပ် ပေးပို့ထားသည်များ' : 'My Feedbacks'}
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={
                lang === 'my'
                  ? 'အကြောင်းအရာ သို့မဟုတ် နာမည်ဖြင့် ရှာဖွေရန်...'
                  : 'Search reviews or comments...'
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Category Filter Chips - Responsive Wrap */}
        <div className="flex flex-wrap items-center gap-1.5 pb-1 pt-1 text-xs">
          <span className="text-slate-400 font-bold shrink-0 mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            <span>{lang === 'my' ? 'စစ်ထုတ်ရန်:' : 'Filter:'}</span>
          </span>

          {[
            { id: 'all', labelMy: 'အားလုံး', labelEn: 'All' },
            { id: 'app_review', labelMy: '⭐ Review', labelEn: 'App Reviews' },
            { id: 'feature_request', labelMy: '💡 Feature Request', labelEn: 'Features' },
            { id: 'bug_report', labelMy: '🐛 Bug Report', labelEn: 'Bugs' },
            { id: 'general', labelMy: '💬 General', labelEn: 'General' },
          ].map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id as any)}
                className={`px-2.5 sm:px-3 py-1.5 rounded-xl font-bold border transition-all cursor-pointer active:scale-95 ${
                  isSelected
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {lang === 'my' ? cat.labelMy : cat.labelEn}
              </button>
            );
          })}
        </div>
      </div>

      {/* Feedbacks Cards Feed */}
      <div className="space-y-4">
        {filteredFeedbacks.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center space-y-3">
            <MessageSquareHeart className="w-12 h-12 text-slate-300 mx-auto" />
            <h4 className="font-bold text-slate-800 text-base">
              {lang === 'my' ? 'မည်သည့် သုံးသပ်ချက်မှ မရှိသေးပါ' : 'No Feedback Found'}
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {lang === 'my'
                ? 'ပထမဆုံး သုံးသပ်ချက် နှင့် အကြံပြုချက် ပေးပို့သူ ဖြစ်လာပါ!'
                : 'Be the first to share your thoughts and review Ngwe Manager!'}
            </p>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-xs transition-all cursor-pointer inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>{lang === 'my' ? 'အကြံပြုချက် ပေးပို့မည်' : 'Write Review'}</span>
            </button>
          </div>
        ) : (
          filteredFeedbacks.map((item) => {
            const badge = getCategoryBadge(item.category);
            const BadgeIcon = badge.icon;
            const isOwner = user?.uid && item.userId === user.uid;

            return (
              <div
                key={item.id}
                className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-2xs space-y-3 hover:border-slate-300 transition-all"
              >
                {/* Card Top Header: User Name, Plan Badge, Stars, Category Badge */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-bold flex items-center justify-center text-sm shadow-xs uppercase">
                      {item.userName.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900 text-sm">
                          {item.userName}
                        </span>
                        {item.userPlan === 'premium' && (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-900 text-[10px] font-extrabold rounded-full flex items-center gap-1 border border-amber-300">
                            <Crown className="w-3 h-3 text-amber-600" />
                            <span>VIP Premium</span>
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {new Date(item.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Stars */}
                    <div className="flex items-center gap-0.5 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-3.5 h-3.5 ${
                            s <= item.rating
                              ? 'fill-amber-400 text-amber-500'
                              : 'fill-slate-100 text-slate-300'
                          }`}
                        />
                      ))}
                    </div>

                    {/* Category Badge */}
                    <div
                      className={`px-2.5 py-1 rounded-xl border text-[11px] font-bold flex items-center gap-1 ${badge.className}`}
                    >
                      <BadgeIcon className="w-3.5 h-3.5" />
                      <span>{badge.label}</span>
                    </div>
                  </div>
                </div>

                {/* Comment Body */}
                <p className="text-slate-800 text-xs sm:text-sm leading-relaxed whitespace-pre-line font-medium">
                  {item.comment}
                </p>

                {/* Admin Reply Section (if exists) */}
                {item.adminReply && (
                  <div className="p-3.5 bg-indigo-50/80 border border-indigo-200 rounded-2xl space-y-1.5 animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                        <Crown className="w-4 h-4 text-amber-500 fill-amber-400" />
                        <span>{lang === 'my' ? '👑 Admin တုံ့ပြန်ချက် (Admin Reply):' : '👑 Admin Reply:'}</span>
                      </span>
                      {item.adminRepliedAt && (
                        <span className="text-[10px] text-indigo-400 font-mono">
                          {new Date(item.adminRepliedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-indigo-900 font-semibold leading-relaxed">
                      {item.adminReply}
                    </p>
                  </div>
                )}

                {/* Footer Controls (Admin or Owner) */}
                {(isAdmin || isOwner) && (
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 text-xs">
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          setReplyingFeedbackId(item.id);
                          setAdminReplyText(item.adminReply || '');
                        }}
                        className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Reply className="w-3.5 h-3.5" />
                        <span>{lang === 'my' ? 'Admin ပြန်ကြားမည်' : 'Admin Reply'}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                      title="Delete feedback"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Admin Reply Inline Form */}
                {replyingFeedbackId === item.id && (
                  <div className="p-3 bg-slate-900 text-white rounded-2xl space-y-2 animate-fadeIn mt-2">
                    <div className="flex items-center justify-between text-xs font-bold text-amber-300">
                      <span>{lang === 'my' ? '👑 Admin တုံ့ပြန်ချက် ရေးသားရန်:' : '👑 Write Admin Reply:'}</span>
                      <button
                        type="button"
                        onClick={() => setReplyingFeedbackId(null)}
                        className="text-slate-400 hover:text-white"
                      >
                        ✕
                      </button>
                    </div>

                    <textarea
                      rows={2}
                      value={adminReplyText}
                      onChange={(e) => setAdminReplyText(e.target.value)}
                      placeholder="Type admin response..."
                      className="w-full p-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-amber-400"
                    />

                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleAdminReplySubmit(item.id)}
                        className="px-4 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold rounded-xl text-xs cursor-pointer"
                      >
                        {lang === 'my' ? 'ပြန်ကြားချက် သိမ်းဆည်းမည်' : 'Save Reply'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modal for creating feedback */}
      <FeedbackModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        lang={lang}
        currentPlan={currentPlan}
      />
    </div>
  );
};
