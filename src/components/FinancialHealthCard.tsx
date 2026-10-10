import React from 'react';
import { Activity } from 'lucide-react';
import { FinancialHealthResult } from '../utils/financialHealth';

interface FinancialHealthCardProps {
  health: FinancialHealthResult;
  lang: 'my' | 'en';
  onClick: () => void;
}

export const FinancialHealthCard: React.FC<FinancialHealthCardProps> = ({
  health,
  lang,
  onClick,
}) => {
  const { theme, emoji, tier } = health;

  return (
    <div
      onClick={onClick}
      className={`group cursor-pointer p-4 sm:p-4.5 rounded-2xl transition-all duration-200 relative overflow-hidden select-none border active:scale-98 ${theme.cardBg} ${theme.cardBorder} ${theme.glowEffect}`}
      title={lang === 'my' ? 'ငွေကြေးကျန်းမာမှု အသေးစိတ်ကြည့်ရန် နှိပ်ပါ' : 'Click to view Financial Health breakdown'}
    >
      {/* Top row: Icon + Badge */}
      <div className="flex items-center justify-between mb-2.5">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 shadow-2xs ${theme.iconBg}`}
        >
          <span className="text-lg select-none">{emoji}</span>
        </div>

        <span
          className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full whitespace-nowrap tracking-wide border ${theme.badgeBg} ${theme.badgeText}`}
        >
          {lang === 'my' ? health.badgeText.my : health.badgeText.en}
        </span>
      </div>

      {/* Title and Status */}
      <div className="space-y-1">
        <div className="flex items-center gap-1.5">
          <Activity
            className={`w-3.5 h-3.5 shrink-0 ${
              theme.isDarkTheme ? 'text-rose-400' : 'text-slate-500'
            }`}
          />
          <h4 className={`font-bold text-xs sm:text-sm tracking-tight ${theme.titleColor}`}>
            {lang === 'my' ? 'ငွေကြေး ကျန်းမာမှု' : 'Financial Health'}
          </h4>
        </div>

        <div
          className={`text-xs font-black truncate ${
            theme.isDarkTheme ? 'text-rose-300' : theme.subtitleColor
          }`}
        >
          {lang === 'my' ? health.statusText.my : health.statusText.en}
        </div>

        {/* Mini progress / health bar */}
        <div className="w-full bg-black/10 dark:bg-white/15 h-1.5 rounded-full overflow-hidden mt-2">
          <div
            className={`h-full rounded-full transition-all duration-500 ${theme.progressFill}`}
            style={{
              width:
                tier === 'negative'
                  ? '100%'
                  : tier === 'super_surplus'
                  ? '100%'
                  : `${Math.max(10, Math.min(100, health.score))}%`,
            }}
          />
        </div>

        <div className="flex items-center justify-between text-[10px] font-bold pt-1 opacity-80">
          <span className={theme.isDarkTheme ? 'text-slate-300' : 'text-slate-500'}>
            {lang === 'my' ? health.colorName.my : health.colorName.en}
          </span>
          <span className={theme.isDarkTheme ? 'text-rose-300 underline' : 'text-indigo-600 underline'}>
            {lang === 'my' ? 'အသေးစိတ် ❯' : 'Details ❯'}
          </span>
        </div>
      </div>
    </div>
  );
};
