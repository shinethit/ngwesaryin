import React from 'react';

export type LogoStyle = 'money_bag' | 'gold_ingot' | 'pixiu';

interface FortuneLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  style?: LogoStyle;
  animate?: boolean;
}

/**
 * Auspicious Wealth & Prosperity Logo Component (လာဘ်ရွှင်စေသော ရွှေငွေထုပ် / တရုတ်ရွှေတုံး / ဖီချူး Logo)
 */
export const FortuneLogo: React.FC<FortuneLogoProps> = ({
  className = '',
  size = 'md',
  style = 'pixiu',
  animate = false,
}) => {
  const sizeMap = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  const currentSizeClass = sizeMap[size] || sizeMap.md;

  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 p-0.5 shadow-sm shadow-amber-500/20 select-none ${currentSizeClass} ${className} ${
        animate ? 'hover:scale-105 transition-transform duration-300' : ''
      }`}
      title="ငွေစာရင်း - လာဘ်ရွှင်ငွေဝင်"
    >
      <div className="w-full h-full rounded-[14px] bg-gradient-to-b from-amber-500 to-amber-700 flex items-center justify-center p-1.5 overflow-hidden relative shadow-inner">
        {/* Subtle radial glow inside */}
        <div className="absolute inset-0 bg-radial from-amber-200/40 via-transparent to-black/20 pointer-events-none" />

        {style === 'money_bag' && (
          // Auspicious Golden Money Bag (ရွှေငွေထုပ်) with lucky ribbon & coins
          <svg
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full drop-shadow-sm"
          >
            {/* Bag Body */}
            <path
              d="M12 24C12 18 17 18 20 18H28C31 18 36 18 36 24C36 34 33 42 24 42C15 42 12 34 12 24Z"
              fill="url(#goldGradient)"
              stroke="#FDE047"
              strokeWidth="1.5"
            />
            {/* Bag Top Ruffles / Pleats */}
            <path
              d="M19 18C17 14 16 11 18 9C20 7 22 9 24 10C26 9 28 7 30 9C32 11 31 14 29 18"
              fill="url(#goldLightGradient)"
              stroke="#FDE047"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            {/* Red Lucky Ribbon & Knot */}
            <rect x="18" y="17" width="12" height="3" rx="1.5" fill="#DC2626" stroke="#991B1B" strokeWidth="0.5" />
            <circle cx="24" cy="18.5" r="2.5" fill="#EF4444" stroke="#FDE047" strokeWidth="0.8" />
            <path d="M22 20L20 25" stroke="#DC2626" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M26 20L28 25" stroke="#DC2626" strokeWidth="1.5" strokeLinecap="round" />

            {/* Auspicious Fortune Coin Emblem in Center of Bag */}
            <circle cx="24" cy="29" r="6" fill="#FEF08A" stroke="#CA8A04" strokeWidth="1" />
            <rect x="22" y="27" width="4" height="4" rx="0.5" fill="#EAB308" stroke="#A16207" strokeWidth="0.8" />

            {/* Sparkle glint on top left */}
            <path
              d="M17 22L18.5 25L20 22L18.5 19Z"
              fill="#FFFFFF"
              opacity="0.9"
            />

            {/* Gradients */}
            <defs>
              <linearGradient id="goldGradient" x1="24" y1="18" x2="24" y2="42" gradientUnits="userSpaceOnUse">
                <stop stopColor="#FACC15" />
                <stop offset="0.5" stopColor="#EAB308" />
                <stop offset="1" stopColor="#CA8A04" />
              </linearGradient>
              <linearGradient id="goldLightGradient" x1="24" y1="7" x2="24" y2="18" gradientUnits="userSpaceOnUse">
                <stop stopColor="#FEF08A" />
                <stop offset="1" stopColor="#EAB308" />
              </linearGradient>
            </defs>
          </svg>
        )}

        {style === 'gold_ingot' && (
          // Traditional Chinese Gold Ingot / Yuanbao (တရုတ်ရွှေတုံး / ငွေတုံး)
          <svg
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full drop-shadow-sm"
          >
            {/* Ingot Base & Wings */}
            <path
              d="M7 21C6 27 10 38 24 38C38 38 42 27 41 21C39 24 33 28 24 28C15 28 9 24 7 21Z"
              fill="url(#ingotBaseGrad)"
              stroke="#FDE047"
              strokeWidth="1.5"
            />
            {/* Ingot Top Dome */}
            <ellipse
              cx="24"
              cy="21"
              rx="17"
              ry="7"
              fill="url(#ingotTopGrad)"
              stroke="#FDE047"
              strokeWidth="1.5"
            />
            {/* Ingot Center Crown / Wealth Hill */}
            <ellipse
              cx="24"
              cy="18"
              rx="9"
              ry="4.5"
              fill="url(#ingotCrownGrad)"
              stroke="#FEF08A"
              strokeWidth="1"
            />
            {/* Center Lucky Square / Prosperity mark */}
            <rect x="22.5" y="16.5" width="3" height="3" rx="0.5" fill="#CA8A04" />

            {/* Sparkles */}
            <path d="M12 16L13 18L14 16L13 14Z" fill="#FFF" opacity="0.9" />
            <path d="M35 15L36 17L37 15L36 13Z" fill="#FFF" opacity="0.9" />

            <defs>
              <linearGradient id="ingotBaseGrad" x1="24" y1="21" x2="24" y2="38" gradientUnits="userSpaceOnUse">
                <stop stopColor="#FACC15" />
                <stop offset="0.6" stopColor="#CA8A04" />
                <stop offset="1" stopColor="#854D0E" />
              </linearGradient>
              <linearGradient id="ingotTopGrad" x1="24" y1="14" x2="24" y2="28" gradientUnits="userSpaceOnUse">
                <stop stopColor="#FEF08A" />
                <stop offset="0.5" stopColor="#EAB308" />
                <stop offset="1" stopColor="#CA8A04" />
              </linearGradient>
              <linearGradient id="ingotCrownGrad" x1="24" y1="13" x2="24" y2="22" gradientUnits="userSpaceOnUse">
                <stop stopColor="#FFFFFF" />
                <stop offset="0.4" stopColor="#FEF08A" />
                <stop offset="1" stopColor="#EAB308" />
              </linearGradient>
            </defs>
          </svg>
        )}

        {style === 'pixiu' && (
          // Auspicious Winged Pixiu on Gold Coin Medallion (လာဘ်စုပ် ဖီချူး ရွှေဒင်္ဂါး ရွှေတံဆိပ်)
          <svg
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full drop-shadow-md"
          >
            {/* Outer Circular Dark Textured Medallion Canvas */}
            <circle cx="50" cy="50" r="48" fill="url(#pixiuBgGrad)" stroke="#CA8A04" strokeWidth="1.5" />
            <circle cx="50" cy="50" r="46.5" stroke="#FDE047" strokeWidth="0.5" strokeDasharray="1 1.5" opacity="0.6" />

            {/* Winged Pixiu Creature Atop Coin */}
            {/* Left Wing */}
            <path
              d="M38 28C32 24 26 21 28 15C32 17 38 22 41 28Z"
              fill="url(#pixiuGoldGrad2)"
              stroke="#FDE047"
              strokeWidth="0.8"
            />
            <path
              d="M35 24C30 20 25 17 27 12C31 15 36 20 38 25Z"
              fill="url(#pixiuGoldGrad1)"
              stroke="#FEF08A"
              strokeWidth="0.5"
            />

            {/* Right Wing */}
            <path
              d="M62 28C68 24 74 21 72 15C68 17 62 22 59 28Z"
              fill="url(#pixiuGoldGrad2)"
              stroke="#FDE047"
              strokeWidth="0.8"
            />
            <path
              d="M65 24C70 20 75 17 73 12C69 15 64 20 62 25Z"
              fill="url(#pixiuGoldGrad1)"
              stroke="#FEF08A"
              strokeWidth="0.5"
            />

            {/* Pixiu Head & Snout */}
            {/* Horns & Ears */}
            <path d="M46 14C44 9 46 7 48 8C49 10 48 12 47 14Z" fill="#FEF08A" stroke="#CA8A04" strokeWidth="0.6" />
            <path d="M54 14C56 9 54 7 52 8C51 10 52 12 53 14Z" fill="#FEF08A" stroke="#CA8A04" strokeWidth="0.6" />
            {/* Head Body */}
            <path
              d="M42 18C42 13 46 11 50 11C54 11 58 13 58 18C58 23 55 26 50 26C45 26 42 23 42 18Z"
              fill="url(#pixiuGoldGrad1)"
              stroke="#FDE047"
              strokeWidth="1"
            />
            {/* Open Mouth & Fangs */}
            <path d="M44 20C47 22 53 22 56 20C55 24 45 24 44 20Z" fill="#7F1D1D" stroke="#D97706" strokeWidth="0.6" />
            <path d="M45 20L46 22M55 20L54 22" stroke="#FFF" strokeWidth="0.8" strokeLinecap="round" />
            {/* Eyes */}
            <circle cx="46" cy="16" r="1.8" fill="#451A03" stroke="#FDE047" strokeWidth="0.5" />
            <circle cx="46.3" cy="15.7" r="0.6" fill="#FFF" />
            <circle cx="54" cy="16" r="1.8" fill="#451A03" stroke="#FDE047" strokeWidth="0.5" />
            <circle cx="53.7" cy="15.7" r="0.6" fill="#FFF" />
            {/* Mane & Whiskers */}
            <path d="M40 19C37 21 35 20 36 18" stroke="#FEF08A" strokeWidth="0.8" strokeLinecap="round" />
            <path d="M60 19C63 21 65 20 64 18" stroke="#FEF08A" strokeWidth="0.8" strokeLinecap="round" />

            {/* Paws Resting on Coin */}
            <ellipse cx="43" cy="29" rx="3.5" ry="2" fill="#EAB308" stroke="#78350F" strokeWidth="0.6" />
            <ellipse cx="57" cy="29" rx="3.5" ry="2" fill="#EAB308" stroke="#78350F" strokeWidth="0.6" />

            {/* Large Ornate Gold Coin */}
            <circle cx="50" cy="52" r="23" fill="url(#coinGoldGrad)" stroke="#FDE047" strokeWidth="1.5" />
            <circle cx="50" cy="52" r="20" stroke="#B45309" strokeWidth="0.8" />
            <circle cx="50" cy="52" r="18.5" stroke="#FEF08A" strokeWidth="0.5" strokeDasharray="1.5 1.5" />

            {/* Square Cutout in Center */}
            <rect x="43" y="45" width="14" height="14" fill="#0F172A" stroke="#FDE047" strokeWidth="1.2" rx="1" />
            <rect x="44.5" y="46.5" width="11" height="11" fill="#1E293B" stroke="#B45309" strokeWidth="0.6" rx="0.5" />

            {/* Red Diamonds on Left and Right of Coin Center */}
            <polygon points="31,52 35,48 39,52 35,56" fill="#DC2626" stroke="#FEF08A" strokeWidth="0.6" />
            <polygon points="61,52 65,48 69,52 65,56" fill="#DC2626" stroke="#FEF08A" strokeWidth="0.6" />

            {/* Coin Filigree Swirls */}
            <path d="M41 38C45 36 55 36 59 38" stroke="#CA8A04" strokeWidth="0.8" strokeLinecap="round" />
            <path d="M41 66C45 68 55 68 59 66" stroke="#CA8A04" strokeWidth="0.8" strokeLinecap="round" />

            {/* Bottom Pedestal & Scrollwork Flourishes */}
            <path
              d="M20 71C30 63 38 78 50 78C62 78 70 63 80 71C72 84 62 88 50 88C38 88 28 84 20 71Z"
              fill="url(#pedestalGrad)"
              stroke="#FDE047"
              strokeWidth="1.2"
            />

            {/* Crimson Accent Sections inside Scrollwork */}
            <path d="M28 73C32 68 36 74 40 76C35 78 30 78 28 73Z" fill="#991B1B" stroke="#FDE047" strokeWidth="0.5" />
            <path d="M72 73C68 68 64 74 60 76C65 78 70 78 72 73Z" fill="#991B1B" stroke="#FDE047" strokeWidth="0.5" />
            <path d="M42 82C46 80 54 80 58 82C54 85 46 85 42 82Z" fill="#991B1B" stroke="#FEF08A" strokeWidth="0.5" />

            {/* Center Flower Bloom Medallion at Bottom Pedestal */}
            <circle cx="50" cy="78" r="4" fill="#FEF08A" stroke="#B45309" strokeWidth="0.8" />
            <circle cx="50" cy="78" r="1.8" fill="#DC2626" />
            {/* Flower Petal Accents */}
            <circle cx="50" cy="73" r="1.2" fill="#FACC15" />
            <circle cx="50" cy="83" r="1.2" fill="#FACC15" />
            <circle cx="45" cy="78" r="1.2" fill="#FACC15" />
            <circle cx="55" cy="78" r="1.2" fill="#FACC15" />

            {/* Gradients */}
            <defs>
              <radialGradient id="pixiuBgGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#1E293B" />
                <stop offset="70%" stopColor="#0F172A" />
                <stop offset="100%" stopColor="#020617" />
              </radialGradient>
              <linearGradient id="pixiuGoldGrad1" x1="50" y1="10" x2="50" y2="30" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#FEF08A" />
                <stop offset="50%" stopColor="#FACC15" />
                <stop offset="100%" stopColor="#CA8A04" />
              </linearGradient>
              <linearGradient id="pixiuGoldGrad2" x1="50" y1="10" x2="50" y2="30" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#EAB308" />
                <stop offset="100%" stopColor="#854D0E" />
              </linearGradient>
              <linearGradient id="coinGoldGrad" x1="50" y1="29" x2="50" y2="75" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#FEF08A" />
                <stop offset="35%" stopColor="#EAB308" />
                <stop offset="70%" stopColor="#CA8A04" />
                <stop offset="100%" stopColor="#78350F" />
              </linearGradient>
              <linearGradient id="pedestalGrad" x1="50" y1="65" x2="50" y2="90" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#FACC15" />
                <stop offset="60%" stopColor="#CA8A04" />
                <stop offset="100%" stopColor="#78350F" />
              </linearGradient>
            </defs>
          </svg>
        )}
      </div>
    </div>
  );
};
