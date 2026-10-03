import React, { useState } from 'react';
import {
  Star,
  MessageSquareHeart,
  Sparkles,
  Send,
  X,
  Lightbulb,
  Bug,
  Smile,
  HelpCircle,
  CheckCircle2,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { FeedbackCategory, PlanType } from '../types';
import { useAuth } from '../context/AuthContext';
import { submitFeedback } from '../lib/feedbackService';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'my' | 'en';
  currentPlan: PlanType;
  onSuccess?: () => void;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
  lang,
  currentPlan,
  onSuccess,
}) => {
  const { user } = useAuth();
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [category, setCategory] = useState<FeedbackCategory>('app_review');
  const [userName, setUserName] = useState<string>(
    user?.displayName || user?.email?.split('@')[0] || ''
  );
  const [userEmail, setUserEmail] = useState<string>(user?.email || '');
  const [comment, setComment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const categoriesConfig: {
    id: FeedbackCategory;
    icon: React.ElementType;
    labelMy: string;
    labelEn: string;
    color: string;
  }[] = [
    {
      id: 'app_review',
      icon: Star,
      labelMy: '⭐ App သုံးသပ်ချက် (Review)',
      labelEn: 'App Review',
      color: 'bg-amber-500/10 text-amber-700 border-amber-200',
    },
    {
      id: 'feature_request',
      icon: Lightbulb,
      labelMy: '💡 Feature တောင်းဆိုရန်',
      labelEn: 'Feature Request',
      color: 'bg-indigo-500/10 text-indigo-700 border-indigo-200',
    },
    {
      id: 'bug_report',
      icon: Bug,
      labelMy: '🐛 အမှား တိုင်ကြားရန် (Bug)',
      labelEn: 'Bug Report',
      color: 'bg-rose-500/10 text-rose-700 border-rose-200',
    },
    {
      id: 'general',
      icon: Smile,
      labelMy: '💬 အထွေထွေ အကြံပြုချက်',
      labelEn: 'General Comment',
      color: 'bg-emerald-500/10 text-emerald-700 border-emerald-200',
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await submitFeedback({
        userId: user?.uid,
        userName: userName.trim() || 'Anonymous User',
        userEmail: userEmail.trim() || undefined,
        userPlan: currentPlan,
        rating,
        category,
        comment: comment.trim(),
      });

      // Confetti celebration
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {
        // Ignore confetti error
      }

      setIsSuccess(true);
      if (onSuccess) onSuccess();

      setTimeout(() => {
        setIsSuccess(false);
        setComment('');
        onClose();
      }, 1800);
    } catch (err) {
      console.error('Failed to submit feedback:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto relative">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/20 backdrop-blur-md rounded-2xl">
              <MessageSquareHeart className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg">
                {lang === 'my'
                  ? 'သုံးသပ်ချက်နှင့် အကြံပြုချက် ပေးပို့ရန်'
                  : 'Write Feedback & Review'}
              </h3>
              <p className="text-[11px] text-emerald-100 font-medium">
                {lang === 'my'
                  ? 'သင့် အကြံပြုချက်သည် Ngwe Manager ကို ပိုမိုကောင်းမွန်စေပါသည်'
                  : 'Your voice helps shape the future of Ngwe Manager'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center font-bold transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        {isSuccess ? (
          <div className="p-8 text-center space-y-4 animate-scaleUp">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
            </div>
            <h4 className="font-bold text-xl text-slate-900">
              {lang === 'my'
                ? 'ကျေးဇူးတင်ရှိပါသည်ခင်ဗျာ။'
                : 'Thank You for Your Feedback!'}
            </h4>
            <p className="text-sm text-slate-600 max-w-xs mx-auto">
              {lang === 'my'
                ? 'သင့် Review နှင့် အကြံပြုချက်ကို အောင်မြင်စွာ ပေးပို့လိုက်ပါပြီ။'
                : 'Your feedback has been received and added to community reviews.'}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 text-xs sm:text-sm">
            {/* Star Rating Picker */}
            <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3.5 text-center space-y-2">
              <label className="block text-xs font-bold text-amber-950">
                {lang === 'my'
                  ? 'Ngwe Manager ကို ဘယ်လောက် နှစ်သက်ပါသလဲ။'
                  : 'How would you rate Ngwe Manager?'}
              </label>
              <div className="flex items-center justify-center gap-1.5 py-1">
                {[1, 2, 3, 4, 5].map((star) => {
                  const isFilled = star <= (hoverRating || rating);
                  return (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(star)}
                      className="p-1 focus:outline-none transition-transform active:scale-125 cursor-pointer"
                      title={`${star} Stars`}
                    >
                      <Star
                        className={`w-8 h-8 sm:w-9 sm:h-9 transition-colors ${
                          isFilled
                            ? 'fill-amber-400 text-amber-500 drop-shadow-xs'
                            : 'fill-slate-100 text-slate-300'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
              <div className="text-[11px] font-bold text-amber-800">
                {rating === 5 && (lang === 'my' ? '🌟 အထူးကောင်းမွန်ပါသည် (Excellent!)' : '🌟 Excellent!')}
                {rating === 4 && (lang === 'my' ? '👍 အလွန်ကောင်းမွန်ပါသည် (Very Good)' : '👍 Very Good')}
                {rating === 3 && (lang === 'my' ? '😊 သင့်တော်ပါသည် (Good)' : '😊 Good')}
                {rating === 2 && (lang === 'my' ? '😐 ပိုကောင်းစေချင်ပါသည် (Needs Improvement)' : '😐 Needs Work')}
                {rating === 1 && (lang === 'my' ? '😞 အဆင်မပြေပါ (Poor)' : '😞 Poor')}
              </div>
            </div>

            {/* Category Chips Selector */}
            <div>
              <label className="block text-slate-700 font-bold mb-1.5">
                {lang === 'my' ? 'အမျိုးအစား ရွေးချယ်ပါ:' : 'Feedback Category:'}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {categoriesConfig.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={`p-2.5 rounded-xl font-bold border text-left flex items-center gap-2 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-slate-900 text-white border-slate-900 shadow-sm ring-2 ring-emerald-500'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-amber-300' : 'text-slate-500'}`} />
                      <span className="text-xs truncate">
                        {lang === 'my' ? cat.labelMy : cat.labelEn}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* User Info Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  {lang === 'my' ? 'အမည် / နာမည်ပြောင်:' : 'Your Name:'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={lang === 'my' ? 'ဥပမာ - ကိုမင်းသူ' : 'Your name'}
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  {lang === 'my' ? 'အီးမေးလ် (ရွေးချယ်ရန်):' : 'Email (Optional):'}
                </label>
                <input
                  type="email"
                  placeholder="email@example.com"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Comment Textarea */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-slate-700 font-bold">
                  {lang === 'my'
                    ? 'အကြောင်းအရာ သို့မဟုတ် အကြံပြုချက် ရေးသားပါ:'
                    : 'Your Comments / Suggestions:'}
                </label>
                <span className="text-[10px] text-slate-400 font-mono">
                  {comment.length}/2000
                </span>
              </div>
              <textarea
                required
                rows={4}
                maxLength={2000}
                placeholder={
                  lang === 'my'
                    ? 'Ngwe Manager နှင့် ပတ်သက်၍ နှစ်သက်သော အချက်များ ၊ ထပ်မံလိုချင်သော စွမ်းဆောင်ရည်သစ်များ သို့မဟုတ် ပြင်ဆင်စေချင်သော အချက်များကို လွတ်လပ်စွာ ရေးသားနိုင်ပါသည်...'
                    : 'Share what you love about Ngwe Manager, request features, or report issues...'
                }
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs sm:text-sm"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-medium cursor-pointer"
              >
                {lang === 'my' ? 'မလုပ်တော့ပါ' : 'Cancel'}
              </button>

              <button
                type="submit"
                disabled={!comment.trim() || isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold shadow-md hover:shadow-lg disabled:opacity-50 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
              >
                {isSubmitting ? (
                  <span>{lang === 'my' ? 'ပေးပို့နေသည်...' : 'Sending...'}</span>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>{lang === 'my' ? 'ပေးပို့မည်' : 'Submit Feedback'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
